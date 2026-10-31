-- =============================================================================
-- Estado del sistema: "Consultas lentas" mide sólo las consultas de la app (roles anon, authenticated, authenticator y
-- service_role). Antes contaba también las del panel de Supabase (por ejemplo, la lista de zonas horarias del editor
-- SQL), que tardan segundos y dejaban el semáforo en rojo sin que Mycen tuviera un problema. Idempotente.
-- =============================================================================

begin;

create or replace function public.admin_system_status()
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_settings jsonb;
  v_probe    text;
  v_storage  jsonb;
  v_cron     jsonb;
  v_net      jsonb;
  v_slow     jsonb;
  v_stmts    text;
begin
  perform mycen_assert_admin();

  v_settings := coalesce((select jsonb_object_agg(key, value) from mycen_admin_settings), '{}'::jsonb);

  -- Perfil de prueba: el elegido en los ajustes o, si no, el primero publicado y público
  v_probe := v_settings->>'probe_username';
  if v_probe is null then
    select p.username into v_probe from profiles p
    where p.status = 'published' and p.visibility = 'public' and p.is_primary and p.username is not null
      and p.suspended_at is null
    order by p.published_at nulls last, p.created_at
    limit 1;
  end if;

  -- Almacenamiento por bucket (Supabase guarda el tamaño en metadata->>'size')
  if exists (select 1 from information_schema.columns
             where table_schema = 'storage' and table_name = 'objects' and column_name = 'metadata') then
    begin
      execute $q$
        select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket_id, 'files', files, 'bytes', bytes) order by bytes desc), '[]'::jsonb)
        from (select bucket_id, count(*) as files, coalesce(sum((metadata->>'size')::bigint), 0) as bytes
              from storage.objects group by bucket_id) s
      $q$ into v_storage;
    exception when others then
      v_storage := null;
    end;
  end if;

  -- Tareas programadas (pg_cron): estado de la última corrida de cada una, sin el comando
  if to_regclass('cron.job') is not null and to_regclass('cron.job_run_details') is not null then
    begin
      execute $q$
        select coalesce(jsonb_agg(jsonb_build_object(
          'name', j.jobname, 'schedule', j.schedule, 'active', j.active,
          'last_start', r.start_time, 'last_status', r.status,
          'failed_24h', (select count(*) from cron.job_run_details f
                         where f.jobid = j.jobid and f.status = 'failed' and f.start_time > now() - interval '24 hours')
        ) order by j.jobname), '[]'::jsonb)
        from cron.job j
        left join lateral (select start_time, status from cron.job_run_details d
                           where d.jobid = j.jobid order by start_time desc limit 1) r on true
      $q$ into v_cron;
    exception when others then
      v_cron := null;
    end;
  end if;

  -- Llamadas salientes de la base (pg_net) en la última hora, por resultado
  if to_regclass('net._http_response') is not null then
    begin
      execute $q$
        select jsonb_build_object(
          'ok',     count(*) filter (where status_code between 200 and 299),
          'client', count(*) filter (where status_code between 400 and 499),
          'server', count(*) filter (where status_code >= 500),
          'failed', count(*) filter (where status_code is null or timed_out))
        from net._http_response where created > now() - interval '1 hour'
      $q$ into v_net;
    exception when others then
      v_net := null;
    end;
  end if;

  -- Consultas lentas: sólo el texto normalizado (pg_stat_statements no guarda los valores)
  v_stmts := coalesce(to_regclass('extensions.pg_stat_statements')::text, to_regclass('public.pg_stat_statements')::text);
  if v_stmts is not null then
    begin
      execute format($q$
        select coalesce(jsonb_agg(row_to_json(s)::jsonb), '[]'::jsonb) from (
          select left(regexp_replace(query, '\s+', ' ', 'g'), 240) as query, calls,
                 round(mean_exec_time::numeric, 1) as mean_ms, round(total_exec_time::numeric) as total_ms
          from %s
          where calls >= 5 and query !~* '^\s*(begin|commit|rollback|set |show |deallocate|discard)'
            -- Sólo lo que pide la app (visitantes, cuentas y funciones del servidor): las consultas del panel de
            -- Supabase, backups o migraciones corren como postgres/supabase_admin y no son de Mycen
            and userid in (select oid from pg_roles where rolname in ('anon', 'authenticated', 'authenticator', 'service_role'))
          order by mean_exec_time desc limit 10) s
      $q$, v_stmts) into v_slow;
    exception when others then
      v_slow := null;
    end;
  end if;

  return jsonb_build_object(
    'checked_at', now(),
    'settings', v_settings,
    'probe_username', v_probe,
    'db', jsonb_build_object(
      'bytes', pg_database_size(current_database()),
      'connections', (select count(*) from pg_stat_activity),
      'max_connections', current_setting('max_connections')::integer
    ),
    'tables', (
      select coalesce(jsonb_agg(jsonb_build_object('name', relname, 'bytes', bytes, 'rows', rows) order by bytes desc), '[]'::jsonb)
      from (select c.relname, pg_total_relation_size(c.oid) as bytes, greatest(c.reltuples, 0)::bigint as rows
            from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'p')
            order by pg_total_relation_size(c.oid) desc limit 10) t
    ),
    'storage', v_storage,
    'cron', v_cron,
    'net', v_net,
    'slow_queries', v_slow,
    -- Personas distintas con algún error, por día (14 días; app_error_hits guarda el día, no la hora)
    'errors_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'people', coalesce(h.people, 0)) order by d), '[]'::jsonb)
      from generate_series(current_date - 13, current_date, interval '1 day') d
      left join (select day, count(distinct hash) as people from app_error_hits
                 where day >= current_date - 13 group by day) h on h.day = d::date
    ),
    -- Errores que aparecieron por primera vez en las últimas 24 h, con cuántas personas les pasó
    'new_errors', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'message', left(e.message, 160), 'area', e.area,
               'release', e.release, 'first_seen', e.first_seen,
               'people', (select count(distinct hash) from app_error_hits h where h.error_id = e.id)) order by e.first_seen desc), '[]'::jsonb)
      from (select * from app_errors where first_seen > now() - interval '24 hours' and status <> 'ignored'
            order by first_seen desc limit 20) e
    ),
    'signups', jsonb_build_object(
      'started_1h',    (select count(*) from product_events where event = 'signup_started'   and created_at > now() - interval '1 hour'),
      'completed_1h',  (select count(*) from product_events where event = 'signup_completed' and created_at > now() - interval '1 hour'),
      'started_24h',   (select count(*) from product_events where event = 'signup_started'   and created_at > now() - interval '24 hours'),
      'completed_24h', (select count(*) from product_events where event = 'signup_completed' and created_at > now() - interval '24 hours')
    ),
    'push_shown_1h', (select count(*) from product_events
                      where event = 'reminder_shown' and props->>'channel' = 'push' and created_at > now() - interval '1 hour'),
    'sitemap_paths', (select count(*) from public_sitemap())
  );
end $$;

revoke all on function public.admin_system_status() from public, anon;
grant execute on function public.admin_system_status() to authenticated;

commit;

notify pgrst, 'reload schema';
