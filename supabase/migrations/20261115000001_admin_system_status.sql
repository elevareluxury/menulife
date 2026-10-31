-- =============================================================================
-- Panel del equipo — "Estado del sistema" y autochequeo de seguridad (auditoría del panel, PR 1):
--
--   · admin_system_status(): lo que se mide desde la base para la pantalla /super-admin/estado — tamaño y
--     conexiones, tablas más grandes, almacenamiento por bucket, tareas programadas (pg_cron) y llamadas salientes
--     (pg_net) si están instaladas, consultas lentas (pg_stat_statements, sólo el texto normalizado), errores de la
--     app por día y los nuevos, registros empezados y terminados, avisos push entregados y cuántas direcciones
--     tendría el sitemap. Nunca devuelve el comando de una tarea programada (puede llevar claves).
--   · admin_security_selfcheck(): las reglas de 20261114000001_advisor_hardening.sql, pero vivas: cada vez que se
--     abre la pantalla revisa el catálogo y devuelve lo que no las cumple (tabla sin RLS, función sin search_path,
--     función del panel o de triggers que se puede llamar sin sesión, vista sin security_invoker, bucket público que
--     se puede listar, auth.uid() sin select, extensiones en public y tablas que cualquiera lee enteras).
--   · mycen_admin_settings + admin_set_status_setting(): ajustes del chequeo (perfil de prueba, último backup
--     revisado, límites del plan). Nadie lee la tabla directo; cada cambio queda en admin_audit_log.
--   · admin_overview(): la serie por día se calcula en una pasada (antes, dos subconsultas por día) y se suman
--     índices por fecha para que el resumen no recorra tablas enteras.
--
-- Todo exige super-admin (mycen_assert_admin). Idempotente.
-- Vuelta atrás: drop function public.admin_system_status(); drop function public.admin_security_selfcheck();
--   drop function public.admin_set_status_setting(text, text); drop table public.mycen_admin_settings;
--   (admin_overview vuelve con 20261105000001_admin_console.sql; los índices se pueden dejar)
-- =============================================================================

begin;

-- ─── Ajustes del chequeo ─────────────────────────────────────────────────────
create table if not exists public.mycen_admin_settings (
  key        text        primary key check (key in ('probe_username', 'backup_checked_at', 'db_limit_mb', 'storage_limit_mb')),
  value      text        not null check (char_length(value) between 1 and 64),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.mycen_admin_settings enable row level security;
revoke all on public.mycen_admin_settings from anon, authenticated;

create or replace function public.admin_set_status_setting(p_key text, p_value text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v text := nullif(btrim(coalesce(p_value, '')), '');
begin
  perform mycen_assert_admin();
  if p_key = 'probe_username' then
    v := lower(v);
    if v is not null and v !~ '^[a-z0-9][a-z0-9_.-]{1,29}(/[a-z0-9][a-z0-9-]{0,39})?$' then
      raise exception 'INVALID_VALUE' using errcode = '22023';
    end if;
  elsif p_key = 'backup_checked_at' then
    -- Sólo "lo revisé ahora": la fecha la pone la base
    v := case when v is null then null else to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end;
  elsif p_key in ('db_limit_mb', 'storage_limit_mb') then
    if v is not null and (v !~ '^[0-9]{1,8}$' or v::bigint < 1) then
      raise exception 'INVALID_VALUE' using errcode = '22023';
    end if;
  else
    raise exception 'INVALID_KEY' using errcode = '22023';
  end if;

  if v is null then
    delete from mycen_admin_settings where key = p_key;
  else
    insert into mycen_admin_settings (key, value, updated_at, updated_by) values (p_key, v, now(), (select auth.uid()))
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
  end if;

  insert into admin_audit_log (admin_id, action, target_type, target_id, details)
  values ((select auth.uid()), 'status_setting', 'mycen_admin_settings', p_key, jsonb_build_object('value', v));

  return coalesce((select jsonb_object_agg(key, value) from mycen_admin_settings), '{}'::jsonb);
end $$;

revoke all on function public.admin_set_status_setting(text, text) from public, anon;
grant execute on function public.admin_set_status_setting(text, text) to authenticated;

-- ─── Estado del sistema ──────────────────────────────────────────────────────
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

-- ─── Autochequeo de seguridad ────────────────────────────────────────────────
-- Cada hallazgo: rule (a…j), level (red | yellow | info) y object (qué lo rompe). La pantalla explica cada regla.
create or replace function public.admin_security_selfcheck()
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v jsonb;
  pattern constant text := '(?<!SELECT )auth\.(uid|jwt|role)\(\)';
begin
  perform mycen_assert_admin();

  with own_rel as (
    select c.oid, c.relname, c.relkind, c.relrowsecurity, c.reloptions
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
  ),
  own_fn as (
    select p.oid, p.proname, p.oid::regprocedure::text as sig, p.prosecdef, p.prorettype, p.proconfig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
  ),
  findings as (
    -- (a) Tabla sin RLS: con los permisos por defecto de Supabase, cualquiera la lee y la escribe por la API
    select 'a' as rule, 'red' as level, relname::text as object from own_rel
    where relkind in ('r', 'p') and not relrowsecurity
    union all
    -- (b) RLS sin políticas pero con permisos para la API: no se puede leer (bien), pero conviene sacar el permiso
    select 'b', 'info', r.relname::text from own_rel r
    where r.relkind in ('r', 'p') and r.relrowsecurity
      and not exists (select 1 from pg_policy pol where pol.polrelid = r.oid)
      and (has_table_privilege('anon', r.oid, 'select') or has_table_privilege('authenticated', r.oid, 'select'))
    union all
    -- (c) Función sin search_path fijo
    select 'c', 'red', sig from own_fn
    where not exists (select 1 from unnest(coalesce(proconfig, '{}')) c where c like 'search_path=%')
    union all
    -- (d) Función del panel (admin_*) o ayudante con permisos de dueño (mycen_* security definer) que se llama sin sesión
    select 'd', 'red', sig from own_fn
    where (proname like 'admin\_%' or (proname like 'mycen\_%' and prosecdef))
      and has_function_privilege('anon', oid, 'execute')
    union all
    -- (e) Función de trigger que se puede llamar por la API
    select 'e', 'red', sig from own_fn
    where prorettype = 'trigger'::regtype
      and (has_function_privilege('anon', oid, 'execute') or has_function_privilege('authenticated', oid, 'execute'))
    union all
    -- (f) Vista que lee con los permisos de quien la creó (se saltea la RLS)
    select 'f', 'red', relname::text from own_rel
    where relkind = 'v'
      and not coalesce(reloptions && array['security_invoker=true', 'security_invoker=on', 'security_invoker=1'], false)
      and (has_table_privilege('anon', oid, 'select') or has_table_privilege('authenticated', oid, 'select'))
    union all
    -- (g) Bucket público con una política de lectura que deja listar todos sus archivos
    select 'g', 'yellow', b.id || ' · ' || pol.policyname
    from storage.buckets b
    join pg_policies pol on pol.schemaname = 'storage' and pol.tablename = 'objects'
      and pol.cmd in ('SELECT', 'ALL') and (pol.roles && array['anon', 'public']::name[])
      and pol.qual like '%''' || b.id || '''%' and pol.qual !~* '(auth\.uid|owner|foldername)'
    where b.public
    union all
    -- (h) auth.uid() que se recalcula por cada fila
    select 'h', 'yellow', tablename || ' · ' || policyname from pg_policies
    where schemaname = 'public' and (qual ~ pattern or with_check ~ pattern)
    union all
    -- (i) Extensión instalada en public (va en extensions)
    select 'i', 'yellow', e.extname::text from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where n.nspname = 'public'
    union all
    -- (j) Tabla que cualquiera lee entera (política de lectura "true" para el visitante): revisar que sea a propósito
    select 'j', 'info', tablename || ' · ' || policyname from pg_policies
    where schemaname = 'public' and cmd in ('SELECT', 'ALL') and (roles && array['anon', 'public']::name[])
      and btrim(qual) in ('true', '(true)')
  )
  select coalesce(jsonb_agg(jsonb_build_object('rule', rule, 'level', level, 'object', object) order by rule, object), '[]'::jsonb)
  into v from findings;

  return jsonb_build_object('checked_at', now(), 'findings', v);
end $$;

revoke all on function public.admin_security_selfcheck() from public, anon;
grant execute on function public.admin_security_selfcheck() to authenticated;

-- ─── Resumen: la serie por día en una pasada ─────────────────────────────────
create or replace function public.admin_overview(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_days  integer := least(greatest(coalesce(p_days, 30), 7), 180);
  v_since timestamptz;
  v_life  bigint := 0;
begin
  perform mycen_assert_admin();
  v_since := date_trunc('day', now()) - make_interval(days => v_days - 1);

  -- Personas que usaron Life OS en los últimos 7 días (algo creado o tildado), sin mirar contenido
  select count(distinct x.user_id) into v_life from (
    select user_id from life_brain_items where created_at > now() - interval '7 days'
    union select user_id from life_transactions where created_at > now() - interval '7 days'
    union select user_id from life_habit_logs where created_at > now() - interval '7 days'
  ) x;

  return jsonb_build_object(
    'days', v_days,
    'accounts',          (select count(*) from auth.users),
    'accounts_7d',       (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'accounts_30d',      (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'published',         (select count(*) from profiles where status = 'published' and suspended_at is null),
    'published_7d',      (select count(*) from profiles where status = 'published' and published_at > now() - interval '7 days'),
    'suspended',         (select count(*) from profiles where suspended_at is not null),
    'verified',          (select count(*) from identities where verified_at is not null),
    'life_active_7d',    v_life,
    'pending_reports',   (select count(*) from profile_reports where status = 'open'),
    'pending_verifications', (select count(*) from verification_requests where status = 'pending'),
    'open_errors',       (select count(*) from app_errors where status = 'open'),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day::date, 'signups', coalesce(s.n, 0), 'published', coalesce(p.n, 0)) order by d.day), '[]'::jsonb)
      from generate_series(v_since, date_trunc('day', now()), interval '1 day') d(day)
      left join (select date_trunc('day', created_at) as day, count(*) as n from auth.users
                 where created_at >= v_since group by 1) s on s.day = d.day
      left join (select date_trunc('day', published_at) as day, count(*) as n from profiles
                 where published_at >= v_since group by 1) p on p.day = d.day
    )
  );
end $$;

revoke all on function public.admin_overview(integer) from public, anon;
grant execute on function public.admin_overview(integer) to authenticated;

-- Índices por fecha para el resumen (si la tabla existe)
do $$
declare i record;
begin
  for i in
    select * from (values
      ('profiles', 'published_at'), ('life_brain_items', 'created_at'), ('life_transactions', 'created_at'),
      ('life_habit_logs', 'created_at')
    ) as t(tbl, col)
  loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = i.tbl and column_name = i.col) then
      execute format('create index if not exists %I on public.%I (%I)', i.tbl || '_' || i.col || '_idx', i.tbl, i.col);
    end if;
  end loop;
end $$;

commit;

notify pgrst, 'reload schema';
