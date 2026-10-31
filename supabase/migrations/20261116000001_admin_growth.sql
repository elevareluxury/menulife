-- =============================================================================
-- Panel del equipo — Crecimiento (lo que mide una app mundial para seguir creciendo), sin contenido de nadie:
--
--   · user_activity_days: una fila por persona y día que usó Mycen (zona: Life OS / Studio, plataforma, idioma y zona
--     horaria del dispositivo; nunca IP ni lo que hizo). La escribe mycen_mark_active() (la app la llama una vez por
--     día y zona). Nadie lee la tabla directo. Se llena hacia atrás con actividad real que ya existe (eventos de
--     producto, Brain, hábitos, movimientos) para que las curvas no arranquen en cero.
--   · admin_growth_overview(p_days): activos por día/semana/mes (DAU/WAU/MAU) y "stickiness", serie diaria y mensual
--     de registros, activos y publicados, crecimiento contra el período anterior, ciclo de vida de la semana (nuevas,
--     siguen, vuelven, se fueron), por plataforma, idioma y región (zona horaria) y visitas a perfiles.
--   · admin_growth_retention(): retención por semana de registro (12 semanas × 12 semanas).
--   · admin_growth_funnel(p_days): registro → onboarding → publicó → compartió → primera visita → primer mensaje,
--     referidos (factor K) y de dónde llegan las visitas.
--   · admin_growth_adoption(p_days): qué módulos y estructuras usan los perfiles publicados y qué partes de Life OS
--     usan las personas activas; perfiles más visitados.
--
-- Todo exige super-admin. Idempotente. Requiere 20261105000001_admin_console.sql y 20261111000001_life_os_metrics.sql.
-- Vuelta atrás: drop function public.admin_growth_overview(integer); drop function public.admin_growth_retention();
--   drop function public.admin_growth_funnel(integer); drop function public.admin_growth_adoption(integer);
--   drop function public.mycen_mark_active(text, text, text, text); drop table public.user_activity_days;
-- =============================================================================

begin;

-- ─── Actividad diaria ────────────────────────────────────────────────────────
create table if not exists public.user_activity_days (
  user_id  uuid    not null references auth.users(id) on delete cascade,
  day      date    not null,
  life     boolean not null default false,
  studio   boolean not null default false,
  platform text    check (platform is null or platform in ('web', 'pwa', 'ios', 'android')),
  lang     text    check (lang is null or lang in ('es','en','pt','fr','de','it','zh','ja','ko','hi','ar','ru')),
  tz       text    check (tz is null or tz ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2}$' and char_length(tz) <= 64),
  primary key (user_id, day)
);
create index if not exists user_activity_days_day_idx on public.user_activity_days (day);
alter table public.user_activity_days enable row level security;
revoke all on public.user_activity_days from anon, authenticated;

-- La app avisa "usé Mycen hoy" (una vez por día y zona). Día en UTC, igual para todas las cuentas.
create or replace function public.mycen_mark_active(p_area text, p_platform text default null, p_lang text default null,
                                                    p_tz text default null)
returns text language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v_user uuid := (select auth.uid());
  v_platform text := case when p_platform in ('web', 'pwa', 'ios', 'android') then p_platform end;
  v_lang text := case when p_lang in ('es','en','pt','fr','de','it','zh','ja','ko','hi','ar','ru') then p_lang end;
  v_tz text := case when char_length(p_tz) <= 64 and p_tz ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2}$' then p_tz end;
begin
  if v_user is null then return 'invalid'; end if;
  if p_area not in ('life', 'studio') then return 'invalid'; end if;
  insert into user_activity_days as a (user_id, day, life, studio, platform, lang, tz)
  values (v_user, (now() at time zone 'utc')::date, p_area = 'life', p_area = 'studio', v_platform, v_lang, v_tz)
  on conflict (user_id, day) do update set
    life = a.life or excluded.life,
    studio = a.studio or excluded.studio,
    platform = coalesce(excluded.platform, a.platform),
    lang = coalesce(excluded.lang, a.lang),
    tz = coalesce(excluded.tz, a.tz);
  return 'ok';
end $$;

revoke all on function public.mycen_mark_active(text, text, text, text) from public, anon;
grant execute on function public.mycen_mark_active(text, text, text, text) to authenticated;

-- Historia: la actividad que ya existe (sólo fechas; nada del contenido). Se puede volver a correr sin duplicar.
do $$
declare
  src record;
begin
  for src in
    select * from (values
      ('product_events', 'created_at', 'null'),
      ('life_brain_items', 'created_at', 'life'),
      ('life_habit_logs', 'created_at', 'life'),
      ('life_transactions', 'created_at', 'life'),
      ('life_journal_entries', 'created_at', 'life'),
      ('life_daily_reviews', 'created_at', 'life')
    ) as t(tbl, col, area)
  loop
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = src.tbl and column_name = src.col)
       and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = src.tbl and column_name = 'user_id') then
      execute format($q$
        insert into public.user_activity_days (user_id, day, life)
        select distinct x.user_id, (x.%2$I at time zone 'utc')::date, %3$s
        from public.%1$I x join auth.users u on u.id = x.user_id
        where x.user_id is not null and x.%2$I > now() - interval '400 days'
        on conflict (user_id, day) do update set life = public.user_activity_days.life or excluded.life
      $q$, src.tbl, src.col, case when src.area = 'life' then 'true' else 'false' end);
    end if;
  end loop;
end $$;

-- ─── Ayudas ──────────────────────────────────────────────────────────────────
-- % con un decimal; sin base devuelve null (la pantalla dice "sin datos", nunca un 0 inventado)
create or replace function public.mycen_pct(p_part numeric, p_total numeric) returns numeric
language sql immutable set search_path = public, extensions, pg_temp as $$
  select case when coalesce(p_total, 0) = 0 then null else round(100 * p_part / p_total, 1) end
$$;
revoke all on function public.mycen_pct(numeric, numeric) from public, anon;

-- Personas distintas que usaron una parte de Life OS desde una fecha (si la tabla no existe, null)
create or replace function public.mycen_users_since(p_table text, p_since timestamptz, p_where text default null)
returns bigint language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare v bigint;
begin
  if p_table not in ('life_brain_items', 'life_habit_logs', 'life_transactions', 'life_goals', 'life_journal_entries',
                     'life_daily_reviews', 'life_habits') then
    return null;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = p_table and column_name = 'created_at') then
    return null;
  end if;
  execute format('select count(distinct user_id) from public.%I where created_at >= $1 %s', p_table,
                 case p_where when 'task' then $w$and type = 'task'$w$ when 'capture' then $w$and type <> 'task'$w$ else '' end)
    into v using p_since;
  return v;
end $$;
revoke all on function public.mycen_users_since(text, timestamptz, text) from public, anon, authenticated;

-- ─── Resumen de crecimiento ──────────────────────────────────────────────────
create or replace function public.admin_growth_overview(p_days integer default 90)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_days  integer := least(greatest(coalesce(p_days, 90), 14), 365);
  v_today date := (now() at time zone 'utc')::date;
  v_from  date;
  v_dau   bigint; v_wau bigint; v_mau bigint; v_avg_dau numeric;
begin
  perform mycen_assert_admin();
  v_from := v_today - (v_days - 1);

  select count(*) into v_dau from user_activity_days where day = v_today;
  select count(distinct user_id) into v_wau from user_activity_days where day > v_today - 7;
  select count(distinct user_id) into v_mau from user_activity_days where day > v_today - 30;
  select avg(n) into v_avg_dau from (
    select d::date, (select count(*) from user_activity_days a where a.day = d::date) as n
    from generate_series(v_today - 29, v_today, interval '1 day') d) x;

  return jsonb_build_object(
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
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'dau', (select count(*) from user_activity_days a where a.day = d.day),
        'wau', (select count(distinct a.user_id) from user_activity_days a where a.day > d.day - 7 and a.day <= d.day),
        'mau', (select count(distinct a.user_id) from user_activity_days a where a.day > d.day - 30 and a.day <= d.day),
        'signups', coalesce(s.n, 0),
        'published', coalesce(p.n, 0)
      ) order by d.day), '[]'::jsonb)
      from (select g::date as day from generate_series(v_from, v_today, interval '1 day') g) d
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
      from (select coalesce(platform, 'unknown') as k, count(*) as n from (
              select distinct on (user_id) user_id, platform from user_activity_days
              where day > v_today - 30 and platform is not null order by user_id, day desc) x group by 1) y
    ),
    'languages', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'users', n) order by n desc), '[]'::jsonb)
      from (select lang as k, count(*) as n from (
              select distinct on (user_id) user_id, lang from user_activity_days
              where day > v_today - 30 and lang is not null order by user_id, day desc) x group by 1) y
    ),
    'regions', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'users', n) order by n desc), '[]'::jsonb)
      from (select split_part(tz, '/', 1) as k, count(*) as n from (
              select distinct on (user_id) user_id, tz from user_activity_days
              where day > v_today - 30 and tz is not null order by user_id, day desc) x group by 1) y
    ),
    'timezones', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'users', n) order by n desc), '[]'::jsonb)
      from (select tz as k, count(*) as n from (
              select distinct on (user_id) user_id, tz from user_activity_days
              where day > v_today - 30 and tz is not null order by user_id, day desc) x group by 1 order by 2 desc limit 15) y
    ),
    'areas', jsonb_build_object(
      'life',   (select count(distinct user_id) from user_activity_days where day > v_today - 30 and life),
      'studio', (select count(distinct user_id) from user_activity_days where day > v_today - 30 and studio)
    ),
    -- Visitas a perfiles en todo Mycen (personas distintas por día, con el hash diario anónimo)
    'visits', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'views', coalesce(v.views, 0), 'visitors', coalesce(v.visitors, 0)) order by d.day), '[]'::jsonb)
      from (select g::date as day from generate_series(v_from, v_today, interval '1 day') g) d
      left join (select (created_at at time zone 'utc')::date as day, count(*) as views, count(distinct visitor_hash) as visitors
                 from profile_events where event_type = 'view' and created_at >= v_from group by 1) v on v.day = d.day
    )
  );
end $$;

revoke all on function public.admin_growth_overview(integer) from public, anon;
grant execute on function public.admin_growth_overview(integer) to authenticated;

-- ─── Retención por semana de registro ────────────────────────────────────────
-- Cohorte = semana (lunes, UTC) en que se registró; cada casilla = % de la cohorte con actividad en esa semana.
-- Las semanas que todavía no pasaron no se calculan (null).
create or replace function public.admin_growth_retention()
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_this_week date := date_trunc('week', now() at time zone 'utc')::date;
begin
  perform mycen_assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'week', c.week, 'size', c.size,
      'weeks', (
        select jsonb_agg(case when c.week + 7 * k > v_this_week then null else mycen_pct((
          select count(distinct a.user_id) from user_activity_days a
          join auth.users u on u.id = a.user_id
          where date_trunc('week', u.created_at at time zone 'utc')::date = c.week
            and a.day >= c.week + 7 * k and a.day < c.week + 7 * (k + 1)), c.size) end order by k)
        from generate_series(0, 11) k)
    ) order by c.week desc)
    from (
      select date_trunc('week', created_at at time zone 'utc')::date as week, count(*) as size
      from auth.users where created_at >= v_this_week - 7 * 11
      group by 1
    ) c
  ), '[]'::jsonb);
end $$;

revoke all on function public.admin_growth_retention() from public, anon;
grant execute on function public.admin_growth_retention() to authenticated;

-- ─── Embudo, referidos y fuentes ─────────────────────────────────────────────
create or replace function public.admin_growth_funnel(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_days  integer := least(greatest(coalesce(p_days, 30), 7), 365);
  v_since timestamptz := now() - make_interval(days => v_days);
  v_publishers bigint;
begin
  perform mycen_assert_admin();
  select count(distinct user_id) into v_publishers from profiles
  where published_at is not null and published_at < v_since;

  return jsonb_build_object(
    'days', v_days,
    -- Cuentas registradas en el período y hasta dónde llegó cada una (en cualquier momento después)
    'steps', (
      with c as (select id from auth.users where created_at >= v_since)
      select jsonb_build_array(
        jsonb_build_object('key', 'signup_started', 'users',
          (select count(*) from product_events where event = 'signup_started' and created_at >= v_since)),
        jsonb_build_object('key', 'signed_up', 'users', (select count(*) from c)),
        jsonb_build_object('key', 'onboarding', 'users', (select count(distinct e.user_id) from product_events e join c on c.id = e.user_id
          where e.event = 'onboarding_step')),
        jsonb_build_object('key', 'published', 'users', (select count(distinct p.user_id) from profiles p join c on c.id = p.user_id
          where p.published_at is not null)),
        jsonb_build_object('key', 'shared', 'users', (select count(distinct e.user_id) from product_events e join c on c.id = e.user_id
          where e.event in ('share_tool_used', 'qr_downloaded'))),
        jsonb_build_object('key', 'first_visit', 'users', (select count(distinct p.user_id) from profiles p join c on c.id = p.user_id
          where exists (select 1 from profile_events v where v.profile_id = p.id and v.event_type = 'view'))),
        jsonb_build_object('key', 'first_message', 'users', (select count(distinct p.user_id) from profiles p join c on c.id = p.user_id
          where exists (select 1 from profile_messages m where m.profile_id = p.id))),
        jsonb_build_object('key', 'came_back', 'users', (select count(distinct a.user_id) from user_activity_days a
          join auth.users u on u.id = a.user_id where u.created_at >= v_since and a.day > (u.created_at at time zone 'utc')::date))
      )
    ),
    -- Referidos: registros que llegaron desde un perfil y factor K aproximado (por cada persona que ya tenía un
    -- perfil publicado al empezar el período, cuántas cuentas nuevas trajo)
    'referrals', jsonb_build_object(
      'signups', (select count(*) from referrals where created_at >= v_since),
      'referrers', (select count(distinct p.user_id) from referrals r join profiles p on p.id = r.referred_by where r.created_at >= v_since),
      'publishers_at_start', v_publishers,
      'k', case when v_publishers > 0 then round((select count(*) from referrals where created_at >= v_since)::numeric / v_publishers, 3) end,
      'share_of_signups', mycen_pct((select count(*) from referrals where created_at >= v_since),
                                    (select count(*) from auth.users where created_at >= v_since))
    ),
    -- De dónde llegan las visitas a todos los perfiles (?src= o el sitio de origen)
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'visits', n) order by n desc), '[]'::jsonb)
      from (select coalesce(nullif(source, ''), nullif(referrer_host, ''), 'direct') as k, count(*) as n
            from profile_events where event_type = 'view' and created_at >= v_since
            group by 1 order by 2 desc limit 15) s
    ),
    'signup_channels', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'users', n) order by n desc), '[]'::jsonb)
      from (select coalesce(props ->> 'channel', 'direct') as k, count(*) as n from product_events
            where event = 'signup_completed' and created_at >= v_since group by 1) s
    )
  );
end $$;

revoke all on function public.admin_growth_funnel(integer) from public, anon;
grant execute on function public.admin_growth_funnel(integer) to authenticated;

-- ─── Uso de cada función ─────────────────────────────────────────────────────
create or replace function public.admin_growth_adoption(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_days  integer := least(greatest(coalesce(p_days, 30), 7), 365);
  v_since timestamptz := now() - make_interval(days => v_days);
  v_published bigint;
  v_active bigint;
begin
  perform mycen_assert_admin();
  select count(*) into v_published from profiles where status = 'published' and suspended_at is null;
  select count(distinct user_id) into v_active from user_activity_days where day >= (v_since at time zone 'utc')::date;

  return jsonb_build_object(
    'days', v_days,
    'published_profiles', v_published,
    'active_users', v_active,
    -- Tipos de módulo visibles en perfiles publicados: cuántos perfiles usan cada uno
    'modules', (
      select coalesce(jsonb_agg(jsonb_build_object('key', type, 'profiles', n, 'pct', mycen_pct(n, v_published)) order by n desc), '[]'::jsonb)
      from (select m.type, count(distinct m.profile_id) as n from profile_modules m
            join profiles p on p.id = m.profile_id
            where p.status = 'published' and p.suspended_at is null and m.visibility = 'active'
            group by m.type) s
    ),
    'layouts', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'profiles', n, 'pct', mycen_pct(n, v_published)) order by n desc), '[]'::jsonb)
      from (select coalesce(theme ->> 'layout', 'clasica') as k, count(*) as n from profiles
            where status = 'published' and suspended_at is null group by 1) s
    ),
    'modes', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'profiles', n) order by n desc), '[]'::jsonb)
      from (select coalesce(theme ->> 'mode', 'universo') as k, count(*) as n from profiles
            where status = 'published' and suspended_at is null group by 1) s
    ),
    -- Life OS: personas que usaron cada parte en el período (sobre las activas)
    'life', jsonb_build_array(
      jsonb_build_object('key', 'tasks',    'users', mycen_users_since('life_brain_items', v_since, 'task')),
      jsonb_build_object('key', 'captures', 'users', mycen_users_since('life_brain_items', v_since, 'capture')),
      jsonb_build_object('key', 'habits',   'users', mycen_users_since('life_habit_logs', v_since)),
      jsonb_build_object('key', 'money',    'users', mycen_users_since('life_transactions', v_since)),
      jsonb_build_object('key', 'goals',    'users', mycen_users_since('life_goals', v_since)),
      jsonb_build_object('key', 'journal',  'users', mycen_users_since('life_journal_entries', v_since)),
      jsonb_build_object('key', 'reviews',  'users', mycen_users_since('life_daily_reviews', v_since))
    ),
    -- Perfiles más visitados (sólo publicados y públicos; personas distintas por día sumadas)
    'top_profiles', (
      select coalesce(jsonb_agg(jsonb_build_object('handle', mycen_space_handle(t.profile_id), 'views', t.views, 'visitors', t.visitors)
                                order by t.visitors desc, t.views desc), '[]'::jsonb)
      from (select e.profile_id, count(*) as views, count(distinct (e.visitor_hash, (e.created_at at time zone 'utc')::date)) as visitors
            from profile_events e join profiles p on p.id = e.profile_id
            where e.event_type = 'view' and e.created_at >= v_since
              and p.status = 'published' and p.visibility = 'public' and p.suspended_at is null
            group by e.profile_id order by 3 desc, 2 desc limit 20) t
    )
  );
end $$;

revoke all on function public.admin_growth_adoption(integer) from public, anon;
grant execute on function public.admin_growth_adoption(integer) to authenticated;

commit;

notify pgrst, 'reload schema';
