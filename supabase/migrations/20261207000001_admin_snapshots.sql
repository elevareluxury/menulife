-- =============================================================================
-- Panel del equipo con millones de cuentas (docs/lanzamiento/panel-escala.md, PR 1): "fotos" calculadas cada hora.
--
--   · Resumen, Crecimiento, Producto y la parte pesada de Estado se calculan en segundo plano con pg_cron (minuto 7 de
--     cada hora, sin el límite de 8 s de una sesión) y se guardan en mycen_admin_snapshots. Las admin_* de siempre
--     devuelven la foto con la misma forma: la pantalla responde en milisegundos con 1.000 o con millones de cuentas.
--   · El cálculo no cambia: las funciones de antes pasan a llamarse mycen_compute_* (mismo SQL). Crecimiento además
--     cuenta los activos de 7 y 30 días en una sola pasada (antes, una cuenta por cada día del período): mismos números.
--   · Sin foto (base nueva o pg_cron apagado) o con una de más de 2 horas, la admin_* calcula en vivo y la guarda; si
--     ese cálculo no llega a tiempo y hay una foto anterior, devuelve la anterior. Nunca un número inventado.
--   · admin_snapshot_info(): de cuándo es cada foto, cuánto tardó y el último error. admin_refresh_snapshot(): recalcular
--     una ya (en vivo, con el tope de la sesión).
--   · El trabajo de fondo no tiene sesión: mycen_assert_admin() lo deja pasar sólo con la marca mycen.snapshot_job (la
--     pone únicamente mycen_refresh_admin_snapshots, que nadie de la app puede ejecutar) y en una conexión que no es de
--     la API (session_user distinto de authenticator, anon, authenticated y service_role).
-- Idempotente. Se aplica en Supabase → SQL Editor. Tests: tests/db/admin_snapshots.test.sql.
-- =============================================================================

-- ─── Permiso: el trabajo de fondo, nunca la API ──────────────────────────────
create or replace function public.mycen_assert_admin()
returns void language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
begin
  if current_setting('mycen.snapshot_job', true) = 'on'
     and session_user not in ('authenticator', 'anon', 'authenticated', 'service_role') then
    return;
  end if;
  if not mycen_is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;
end $$;
revoke all on function public.mycen_assert_admin() from public, anon, authenticated;

-- ─── Fotos ───────────────────────────────────────────────────────────────────
create table if not exists public.mycen_admin_snapshots (
  name        text        not null,
  days        integer     not null default 0,   -- 0 = sin período
  payload     jsonb,
  computed_at timestamptz,
  duration_ms integer,
  error       text,                             -- el último error (sin datos de nadie: sólo el mensaje de la base)
  error_at    timestamptz,
  primary key (name, days)
);
alter table public.mycen_admin_snapshots enable row level security;
revoke all on public.mycen_admin_snapshots from public, anon, authenticated;

-- Lo que se precalcula: cada función con los períodos que pide el panel
create or replace function public.mycen_admin_snapshot_plan()
returns table (name text, days integer) language sql immutable set search_path = public, extensions, pg_temp as $$
  values ('overview', 30),
         ('growth_overview', 365), ('growth_overview', 90), ('growth_overview', 30),
         ('growth_retention', 0),
         ('growth_funnel', 30), ('growth_funnel', 90),
         ('growth_adoption', 30), ('growth_adoption', 90),
         ('product_metrics', 30), ('product_metrics', 90), ('product_metrics', 365),
         ('signup_sources', 30), ('signup_sources', 90), ('signup_sources', 365),
         ('status_heavy', 0);
$$;
revoke all on function public.mycen_admin_snapshot_plan() from public, anon, authenticated;

-- ─── Cálculos (las funciones de antes, con otro nombre) ──────────────────────
do $$
declare r record;
begin
  for r in select * from (values
      ('admin_overview(integer)', 'mycen_compute_overview'),
      ('admin_growth_retention()', 'mycen_compute_growth_retention'),
      ('admin_growth_funnel(integer)', 'mycen_compute_growth_funnel'),
      ('admin_growth_adoption(integer)', 'mycen_compute_growth_adoption'),
      ('admin_product_metrics(integer)', 'mycen_compute_product_metrics'),
      ('admin_signup_sources(integer)', 'mycen_compute_signup_sources')
    ) as t(fn, target)
  loop
    -- Sólo la primera vez: después la admin_* ya es la que lee la foto
    if to_regprocedure('public.' || r.target || substr(r.fn, strpos(r.fn, '('))) is null
       and to_regprocedure('public.' || r.fn) is not null then
      execute format('alter function public.%s rename to %I', r.fn, r.target);
    end if;
    execute format('revoke all on function public.%I%s from public, anon, authenticated', r.target, substr(r.fn, strpos(r.fn, '(')));
  end loop;
end $$;

-- Crecimiento: mismo cálculo, con los activos de 7 y 30 días en una sola pasada
create or replace function public.mycen_compute_growth_overview(p_days integer default 90)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_days  integer := least(greatest(coalesce(p_days, 90), 14), 365);
  v_today date := (now() at time zone 'utc')::date;
  v_from  date;
  v_dau   bigint; v_wau bigint; v_mau bigint; v_avg_dau numeric;
begin
  v_from := v_today - (v_days - 1);

  select count(*) into v_dau from user_activity_days where day = v_today;
  select count(distinct user_id) into v_wau from user_activity_days where day > v_today - 7;
  select count(distinct user_id) into v_mau from user_activity_days where day > v_today - 30;
  select coalesce(sum(n), 0)::numeric / 30 into v_avg_dau from (
    select count(*) as n from user_activity_days where day > v_today - 30 and day <= v_today group by day) x;

  -- Cada persona de los últimos 30 días, una sola vez: lo último que se vio (plataforma, idioma, zona) y qué usó
  return (with u30 as materialized (
    select user_id,
           (array_agg(platform order by day desc) filter (where platform is not null))[1] as platform,
           (array_agg(lang order by day desc) filter (where lang is not null))[1] as lang,
           (array_agg(tz order by day desc) filter (where tz is not null))[1] as tz,
           bool_or(life) as life, bool_or(studio) as studio
    from user_activity_days where day > v_today - 30 group by user_id
  ) select jsonb_build_object(
    'today', v_today,
    'days', v_days,
    'accounts', (select count(*) from auth.users),
    'dau', v_dau, 'wau', v_wau, 'mau', v_mau,
    'stickiness', mycen_pct(v_avg_dau, v_mau),
    -- Este período contra el anterior (7 y 30 días)
    'growth', jsonb_build_object(
      'signups_7d',       (select count(*) from auth.users where created_at >= now() - interval '7 days'),
      'signups_prev_7d',  (select count(*) from auth.users where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days'),
      'signups_30d',      (select count(*) from auth.users where created_at >= now() - interval '30 days'),
      'signups_prev_30d', (select count(*) from auth.users where created_at >= now() - interval '60 days' and created_at < now() - interval '30 days'),
      'wau_prev',         (select count(distinct user_id) from user_activity_days where day > v_today - 14 and day <= v_today - 7),
      'mau_prev',         (select count(distinct user_id) from user_activity_days where day > v_today - 60 and day <= v_today - 30),
      'published_7d',     (select count(*) from product_events where event = 'profile_published' and created_at >= now() - interval '7 days'),
      'published_prev_7d',(select count(*) from product_events where event = 'profile_published'
                             and created_at >= now() - interval '14 days' and created_at < now() - interval '7 days'),
      'published_total',  (select count(*) from profiles where status = 'published' and suspended_at is null)
    ),
    -- Serie diaria: activos del día, activos en 7 y 30 días (ventana móvil), registros y perfiles publicados
    'daily', (
      -- En una sola pasada (antes, una cuenta de 7 y otra de 30 días por cada día del período): cada día de actividad
      -- cubre los 7 (o 30) días siguientes; se juntan los tramos de cada persona que se tocan o se pisan y se cuentan
      -- con altas y bajas acumuladas. Da lo mismo que contar personas distintas en la ventana de cada día.
      with acts as materialized (
        select user_id, day,
               sum(case when gap is null or gap > 7 then 1 else 0 end) over w as g7,
               sum(case when gap is null or gap > 30 then 1 else 0 end) over w as g30
        from (select user_id, day, day - lag(day) over (partition by user_id order by day) as gap
              from user_activity_days where day > v_from - 30 and day <= v_today) x
        window w as (partition by user_id order by day)
      ), w7 as (
        select min(day) as s, max(day) + 6 as e from acts group by user_id, g7
      ), w30 as (
        select min(day) as s, max(day) + 29 as e from acts group by user_id, g30
      ), cal as (
        select g::date as day from generate_series(v_from - 30, v_today, interval '1 day') g
      ), delta as (
        select day, sum(d7) as d7, sum(d30) as d30 from (
          select s as day, 1 as d7, 0 as d30 from w7 union all select e + 1, -1, 0 from w7
          union all select s, 0, 1 from w30 union all select e + 1, 0, -1 from w30) z group by day
      ), roll as (
        select cal.day, sum(coalesce(delta.d7, 0)) over (order by cal.day) as wau,
               sum(coalesce(delta.d30, 0)) over (order by cal.day) as mau
        from cal left join delta on delta.day = cal.day
      ), dau as (
        select day, count(*) as n from user_activity_days where day >= v_from and day <= v_today group by day
      )
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'dau', coalesce(dau.n, 0),
        'wau', coalesce(r.wau, 0),
        'mau', coalesce(r.mau, 0),
        'signups', coalesce(s.n, 0),
        'published', coalesce(p.n, 0)
      ) order by d.day), '[]'::jsonb)
      from (select g::date as day from generate_series(v_from, v_today, interval '1 day') g) d
      left join dau on dau.day = d.day
      left join roll r on r.day = d.day
      left join (select (created_at at time zone 'utc')::date as day, count(*) as n from auth.users
                 where created_at >= v_from group by 1) s on s.day = d.day
      left join (select (created_at at time zone 'utc')::date as day, count(*) as n from product_events
                 where event = 'profile_published' and created_at >= v_from group by 1) p on p.day = d.day
    ),
    -- Serie mensual (12 meses): registros, activos del mes, publicados y cuentas totales al cierre
    'monthly', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'month', to_char(m, 'YYYY-MM'),
        'signups', (select count(*) from auth.users where created_at >= m and created_at < m + interval '1 month'),
        'active', (select count(distinct user_id) from user_activity_days where day >= m::date and day < (m + interval '1 month')::date),
        'published', (select count(*) from product_events where event = 'profile_published' and created_at >= m and created_at < m + interval '1 month'),
        'accounts', (select count(*) from auth.users where created_at < m + interval '1 month')
      ) order by m), '[]'::jsonb)
      from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
    ),
    -- Ciclo de vida de la semana: nuevas (se registraron y usaron), siguen, vuelven (estaban antes y no la semana
    -- pasada) y se fueron (usaron la semana pasada y ésta no)
    'lifecycle', (
      with cur as (select distinct user_id from user_activity_days where day > v_today - 7),
           prev as (select distinct user_id from user_activity_days where day > v_today - 14 and day <= v_today - 7),
           older as (select distinct user_id from user_activity_days where day <= v_today - 14)
      select jsonb_build_object(
        'new',         (select count(*) from cur join auth.users u on u.id = cur.user_id where u.created_at >= now() - interval '7 days'),
        'retained',    (select count(*) from cur where user_id in (select user_id from prev)),
        'resurrected', (select count(*) from cur join auth.users u on u.id = cur.user_id
                        where u.created_at < now() - interval '7 days' and cur.user_id not in (select user_id from prev)
                          and cur.user_id in (select user_id from older)),
        'churned',     (select count(*) from prev where user_id not in (select user_id from cur))
      )
    ),
    -- Mundo y dispositivos (activos de los últimos 30 días; lo último que se vio de cada persona)
    'platforms', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'users', n) order by n desc), '[]'::jsonb)
      from (select coalesce(platform, 'unknown') as k, count(*) as n from u30 where platform is not null group by 1) y
    ),
    'languages', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'users', n) order by n desc), '[]'::jsonb)
      from (select lang as k, count(*) as n from u30 where lang is not null group by 1) y
    ),
    'regions', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'users', n) order by n desc), '[]'::jsonb)
      from (select split_part(tz, '/', 1) as k, count(*) as n from u30 where tz is not null group by 1) y
    ),
    'timezones', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'users', n) order by n desc), '[]'::jsonb)
      from (select tz as k, count(*) as n from u30 where tz is not null group by 1 order by 2 desc limit 15) y
    ),
    'areas', jsonb_build_object(
      'life',   (select count(*) from u30 where life),
      'studio', (select count(*) from u30 where studio)
    ),
    -- Visitas a perfiles en todo Mycen (personas distintas por día, con el hash diario anónimo)
    'visits', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'views', coalesce(v.views, 0), 'visitors', coalesce(v.visitors, 0)) order by d.day), '[]'::jsonb)
      from (select g::date as day from generate_series(v_from, v_today, interval '1 day') g) d
      left join (select (created_at at time zone 'utc')::date as day, count(*) as views, count(distinct visitor_hash) as visitors
                 from profile_events where event_type = 'view' and created_at >= v_from group by 1) v on v.day = d.day
    )
  ));
end $$;
revoke all on function public.mycen_compute_growth_overview(integer) from public, anon, authenticated;

-- Estado: lo que recorre todo (cada archivo y cada dirección del sitemap)
create or replace function public.mycen_compute_status_heavy()
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare v_storage jsonb;
begin
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

  return jsonb_build_object('storage', v_storage, 'sitemap_paths', (select count(*) from public_sitemap()));
end $$;
revoke all on function public.mycen_compute_status_heavy() from public, anon, authenticated;

create or replace function public.mycen_admin_compute(p_name text, p_days integer)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
begin
  return case p_name
    when 'overview'         then mycen_compute_overview(p_days)
    when 'growth_overview'  then mycen_compute_growth_overview(p_days)
    when 'growth_retention' then mycen_compute_growth_retention()
    when 'growth_funnel'    then mycen_compute_growth_funnel(p_days)
    when 'growth_adoption'  then mycen_compute_growth_adoption(p_days)
    when 'product_metrics'  then mycen_compute_product_metrics(p_days)
    when 'signup_sources'   then mycen_compute_signup_sources(p_days)
    when 'status_heavy'     then mycen_compute_status_heavy()
  end;
end $$;
revoke all on function public.mycen_admin_compute(text, integer) from public, anon, authenticated;

-- Crecimiento de 30 o 90 días = el de 365 recortado: lo único que depende del período son las series por día ("daily" y
-- "visits", cuyos valores de cada día no cambian con el período) y "days". Un test lo compara con el cálculo directo.
create or replace function public.mycen_admin_slice_growth(p jsonb, p_days integer)
returns jsonb language sql immutable set search_path = public, extensions, pg_temp as $$
  select p || jsonb_build_object(
    'days', p_days,
    'daily', coalesce((select jsonb_agg(e order by e ->> 'day') from jsonb_array_elements(p -> 'daily') e
                       where (e ->> 'day')::date > (p ->> 'today')::date - p_days), '[]'::jsonb),
    'visits', coalesce((select jsonb_agg(e order by e ->> 'day') from jsonb_array_elements(p -> 'visits') e
                        where (e ->> 'day')::date > (p ->> 'today')::date - p_days), '[]'::jsonb));
$$;
revoke all on function public.mycen_admin_slice_growth(jsonb, integer) from public, anon, authenticated;

-- Calcula y guarda una foto. Si falla, anota el error y deja la foto anterior.
create or replace function public.mycen_admin_snapshot_store(p_name text, p_days integer)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare v jsonb; t timestamptz := clock_timestamp(); base mycen_admin_snapshots%rowtype;
begin
  -- Crecimiento de 30/90 días: si hay uno de 365 de hace menos de 10 minutos y del mismo día, se recorta (ahorra el cálculo)
  if p_name = 'growth_overview' and p_days between 14 and 364 then
    select * into base from mycen_admin_snapshots where name = 'growth_overview' and days = 365;
    if base.payload is not null and base.computed_at > now() - interval '10 minutes'
       and (base.payload ->> 'today')::date = (now() at time zone 'utc')::date then
      v := mycen_admin_slice_growth(base.payload, p_days);
    end if;
  end if;
  if v is null then v := mycen_admin_compute(p_name, p_days); end if;
  insert into mycen_admin_snapshots (name, days, payload, computed_at, duration_ms, error, error_at)
  values (p_name, p_days, v, now(), (extract(epoch from clock_timestamp() - t) * 1000)::integer, null, null)
  on conflict (name, days) do update set payload = excluded.payload, computed_at = excluded.computed_at,
    duration_ms = excluded.duration_ms, error = null, error_at = null;
  return v;
end $$;
revoke all on function public.mycen_admin_snapshot_store(text, integer) from public, anon, authenticated;

-- La foto (o, si no hay o tiene más de 2 horas, el cálculo en vivo). Un período fuera del plan se calcula sin guardar.
create or replace function public.mycen_admin_snapshot(p_name text, p_days integer)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare s mycen_admin_snapshots%rowtype;
begin
  if not exists (select 1 from mycen_admin_snapshot_plan() pl where pl.name = p_name and pl.days = p_days) then
    return mycen_admin_compute(p_name, p_days);
  end if;
  select * into s from mycen_admin_snapshots where name = p_name and days = p_days;
  if s.payload is not null and s.computed_at > now() - interval '2 hours' then
    return s.payload;
  end if;
  begin
    return mycen_admin_snapshot_store(p_name, p_days);
  exception when query_canceled or others then
    -- No llegó a tiempo (o falló): la foto anterior, si hay; si no, el error de siempre
    if s.payload is null then raise; end if;
    update mycen_admin_snapshots set error = left(sqlerrm, 300), error_at = now() where name = p_name and days = p_days;
    return s.payload;
  end;
end $$;
revoke all on function public.mycen_admin_snapshot(text, integer) from public, anon, authenticated;

-- ─── Las admin_* de siempre: misma firma, misma forma, desde la foto ─────────
create or replace function public.admin_overview(p_days integer default 30)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
begin perform mycen_assert_admin(); return mycen_admin_snapshot('overview', coalesce(p_days, 30)); end $$;
create or replace function public.admin_growth_overview(p_days integer default 90)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
begin perform mycen_assert_admin(); return mycen_admin_snapshot('growth_overview', coalesce(p_days, 90)); end $$;
create or replace function public.admin_growth_retention()
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
begin perform mycen_assert_admin(); return mycen_admin_snapshot('growth_retention', 0); end $$;
create or replace function public.admin_growth_funnel(p_days integer default 30)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
begin perform mycen_assert_admin(); return mycen_admin_snapshot('growth_funnel', coalesce(p_days, 30)); end $$;
create or replace function public.admin_growth_adoption(p_days integer default 30)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
begin perform mycen_assert_admin(); return mycen_admin_snapshot('growth_adoption', coalesce(p_days, 30)); end $$;
create or replace function public.admin_product_metrics(p_days integer default 30)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
begin perform mycen_assert_admin(); return mycen_admin_snapshot('product_metrics', coalesce(p_days, 30)); end $$;
create or replace function public.admin_signup_sources(p_days integer default 30)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
begin perform mycen_assert_admin(); return mycen_admin_snapshot('signup_sources', coalesce(p_days, 30)); end $$;

do $$
declare f text;
begin
  foreach f in array array['admin_overview(integer)', 'admin_growth_overview(integer)', 'admin_growth_retention()',
    'admin_growth_funnel(integer)', 'admin_growth_adoption(integer)', 'admin_product_metrics(integer)',
    'admin_signup_sources(integer)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- Estado: igual que antes, con la parte pesada desde la foto (y su hora en heavy_computed_at)
create or replace function public.admin_system_status()
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v_settings jsonb;
  v_probe    text;
  v_heavy    jsonb;
  v_cron     jsonb;
  v_net      jsonb;
  v_slow     jsonb;
  v_stmts    text;
begin
  perform mycen_assert_admin();
  v_heavy := mycen_admin_snapshot('status_heavy', 0);

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
    'storage', v_heavy->'storage',
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
    -- Lo que recorre todo (cada archivo, cada dirección del sitemap) sale de la foto de cada hora
    'sitemap_paths', (v_heavy->>'sitemap_paths')::bigint,
    'heavy_computed_at', (select computed_at from mycen_admin_snapshots where name = 'status_heavy' and days = 0)
  );
end $$;
revoke all on function public.admin_system_status() from public, anon;
grant execute on function public.admin_system_status() to authenticated;

-- ─── De cuándo es cada foto, y recalcular una ya ─────────────────────────────
create or replace function public.admin_snapshot_info()
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
begin
  perform mycen_assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object('name', pl.name, 'days', pl.days, 'computed_at', s.computed_at,
             'duration_ms', s.duration_ms, 'error', s.error, 'error_at', s.error_at) order by pl.name, pl.days)
    from mycen_admin_snapshot_plan() pl
    left join mycen_admin_snapshots s on s.name = pl.name and s.days = pl.days), '[]'::jsonb);
end $$;
revoke all on function public.admin_snapshot_info() from public, anon;
grant execute on function public.admin_snapshot_info() to authenticated;

create or replace function public.admin_refresh_snapshot(p_name text, p_days integer default 0)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
begin
  perform mycen_assert_admin();
  if not exists (select 1 from mycen_admin_snapshot_plan() pl where pl.name = p_name and pl.days = coalesce(p_days, 0)) then
    raise exception 'UNKNOWN_SNAPSHOT' using errcode = '22023';
  end if;
  perform mycen_admin_snapshot_store(p_name, coalesce(p_days, 0));
  return (select jsonb_build_object('computed_at', computed_at, 'duration_ms', duration_ms)
          from mycen_admin_snapshots where name = p_name and days = coalesce(p_days, 0));
end $$;
revoke all on function public.admin_refresh_snapshot(text, integer) from public, anon;
grant execute on function public.admin_refresh_snapshot(text, integer) to authenticated;

-- ─── El trabajo de cada hora ─────────────────────────────────────────────────
-- Recalcula todo el plan. Cada foto por separado: si una falla, queda su error y las demás siguen.
create or replace function public.mycen_refresh_admin_snapshots()
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare r record; ok integer := 0; failed integer := 0;
begin
  perform set_config('mycen.snapshot_job', 'on', true);
  for r in select * from mycen_admin_snapshot_plan() loop
    begin
      perform mycen_admin_snapshot_store(r.name, r.days);
      ok := ok + 1;
    exception when query_canceled or others then
      failed := failed + 1;
      insert into mycen_admin_snapshots (name, days, error, error_at) values (r.name, r.days, left(sqlerrm, 300), now())
      on conflict (name, days) do update set error = excluded.error, error_at = excluded.error_at;
    end;
  end loop;
  perform set_config('mycen.snapshot_job', '', true);
  return jsonb_build_object('ok', ok, 'failed', failed);
end $$;
revoke all on function public.mycen_refresh_admin_snapshots() from public, anon, authenticated;

-- Cada hora, minuto 7 (si pg_cron está prendido). Sin el límite de una sesión: puede tardar minutos con millones.
do $$
begin
  if to_regnamespace('cron') is not null and exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'cron' and p.proname = 'schedule'
  ) then
    begin
      perform cron.unschedule('mycen-admin-snapshots');
    exception when others then null;
    end;
    perform cron.schedule('mycen-admin-snapshots', '7 * * * *',
      $cron$set statement_timeout = '50min'; select public.mycen_refresh_admin_snapshots()$cron$);
  end if;
exception when others then
  raise notice 'pg_cron no disponible: el panel calcula en vivo (como antes) hasta que se prenda';
end $$;

-- Recalcular a mano también cuenta para el tope por cuenta (igual a 20261205000001 + admin_refresh_snapshot)
create or replace function public.mycen_account_rate_limit_for(p_rpc text)
returns integer language sql immutable set search_path = public, extensions, pg_temp as $$
  select case p_rpc
    when 'publish_space'          then 60
    when 'restore_space_version'  then 30
    when 'duplicate_space'        then 20
    when 'publish_project'        then 60
    when 'record_referral'        then 10
    when 'admin_refresh_snapshot' then 60
  end;
$$;
revoke all on function public.mycen_account_rate_limit_for(text) from public, anon, authenticated;

notify pgrst, 'reload schema';
