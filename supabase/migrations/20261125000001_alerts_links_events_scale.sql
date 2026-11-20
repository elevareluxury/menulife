-- =============================================================================
-- Avisos al equipo, revisión de links y escala de la analítica (PR D)
--
--  1. Llaves de las tareas programadas (GitHub Actions): `mycen_cron_keys` guarda sólo el hash de cada llave. Las
--     funciones cron_* las puede llamar cualquiera, pero sin la llave correcta no devuelven nada. Así las tareas no
--     necesitan la service role. La llave se crea (o se cambia) en el SQL Editor:
--       select public.mycen_set_cron_key();     -- devuelve la llave UNA vez: pegarla en GitHub → MYCEN_CRON_KEY
--  2. Avisos al equipo (scripts/team-alerts.mjs, cada 15 min): cron_alert_digest(llave, desde) = errores nuevos,
--     denuncias, mensajes denunciados, registros de la última hora contra el promedio de la semana e interruptores.
--  3. Links peligrosos (scripts/link-scan.mjs, cada hora): cron_recent_links(llave, desde) = los links de lo publicado
--     desde esa fecha (Spaces y proyectos públicos); cron_flag_link(llave, perfil, link, amenaza) crea una denuncia
--     ('scam', para que la revise el equipo) una sola vez por perfil y link (mycen_link_flags).
--  4. Analítica a escala: índice para las cuentas del panel (visitas por fecha) y las visitas de más de 13 meses se
--     borran solas con mycen_purge_expired (Studio muestra hasta 90 días).
--
-- Idempotente. Se aplica pegándola en Supabase → SQL Editor. Tests: tests/db/alerts_links_scale.test.sql.
-- =============================================================================
begin;

-- ─── 1. Llaves de las tareas programadas ─────────────────────────────────────

create table if not exists public.mycen_cron_keys (
  purpose    text        primary key check (purpose in ('cron')),
  key_hash   text        not null,
  created_at timestamptz not null default now()
);
alter table public.mycen_cron_keys enable row level security;
revoke all on table public.mycen_cron_keys from public, anon, authenticated;

-- Sólo desde el SQL Editor (nadie de la API puede ejecutarla): crea una llave nueva y la devuelve una vez
create or replace function public.mycen_set_cron_key()
returns text language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  -- 64 caracteres hexadecimales al azar (gen_random_uuid usa el generador seguro de Postgres)
  v_key text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  insert into mycen_cron_keys (purpose, key_hash) values ('cron', encode(sha256(convert_to(v_key, 'UTF8')), 'hex'))
  on conflict (purpose) do update set key_hash = excluded.key_hash, created_at = now();
  return v_key;
end $$;
revoke all on function public.mycen_set_cron_key() from public, anon, authenticated;

create or replace function public.mycen_cron_key_ok(p_key text)
returns boolean language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select p_key is not null and char_length(p_key) between 32 and 128 and exists (
    select 1 from mycen_cron_keys where purpose = 'cron' and key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex'));
$$;
revoke all on function public.mycen_cron_key_ok(text) from public, anon, authenticated;

-- ─── 2. Avisos al equipo ─────────────────────────────────────────────────────

create or replace function public.cron_alert_digest(p_key text, p_since timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_since timestamptz := greatest(coalesce(p_since, now() - interval '15 minutes'), now() - interval '1 day');
begin
  if not mycen_cron_key_ok(p_key) then raise exception 'BAD_KEY' using errcode = '42501'; end if;
  return jsonb_build_object(
    'since', v_since,
    'new_errors', coalesce((
      select jsonb_agg(jsonb_build_object('area', area, 'message', left(message, 160), 'count', count) order by first_seen desc)
      from (select * from app_errors where first_seen >= v_since and status = 'open' order by first_seen desc limit 10) e), '[]'::jsonb),
    'reopened_errors', (select count(*) from app_errors where status = 'open' and last_seen >= v_since and first_seen < v_since and count >= 20),
    'reports', (select count(*) from profile_reports where created_at >= v_since),
    'reports_open', (select count(*) from profile_reports where status = 'open'),
    'message_reports', case when to_regclass('public.profile_message_reports') is null then 0
      else (select count(*) from profile_message_reports where created_at >= v_since) end,
    'signups_hour', (select count(*) from auth.users where created_at >= now() - interval '1 hour'),
    'signups_week_hourly', round((select count(*) from auth.users where created_at >= now() - interval '7 days') / 168.0, 1),
    'link_flags', (select count(*) from mycen_link_flags where created_at >= v_since),
    'flags', get_site_flags()
  );
end $$;

-- ─── 3. Links peligrosos ─────────────────────────────────────────────────────

create table if not exists public.mycen_link_flags (
  profile_id uuid        not null references public.profiles(id) on delete cascade,
  url        text        not null check (char_length(url) <= 2048),
  threat     text        not null check (char_length(threat) <= 64),
  created_at timestamptz not null default now(),
  primary key (profile_id, url)
);
alter table public.mycen_link_flags enable row level security;
revoke all on table public.mycen_link_flags from public, anon, authenticated;

-- Todos los textos con forma de link (http/https) de una composición publicada
create or replace function public.mycen_snapshot_links(p jsonb)
returns setof text language sql immutable set search_path = public, pg_temp as $$
  select distinct left(btrim(v #>> '{}'), 2048)
  from jsonb_path_query(coalesce(p, '{}'::jsonb), 'strict $.** ? (@.type() == "string")') as v
  where (v #>> '{}') ~* '^https?://[^\s]+$';
$$;
revoke all on function public.mycen_snapshot_links(jsonb) from public, anon, authenticated;

create or replace function public.cron_recent_links(p_key text, p_since timestamptz)
returns table (profile_id uuid, handle text, url text)
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_since timestamptz := greatest(coalesce(p_since, now() - interval '2 hours'), now() - interval '8 days');
begin
  if not mycen_cron_key_ok(p_key) then raise exception 'BAD_KEY' using errcode = '42501'; end if;
  return query
    -- Spaces publicados desde esa fecha (la versión que se ve)
    select p.id, mycen_space_handle(p.id), l.u
    from profiles p
    join profile_versions v on v.id = p.published_version_id
    cross join lateral mycen_snapshot_links(v.snapshot) as l(u)
    where v.created_at >= v_since and p.suspended_at is null
    union
    -- Proyectos publicados desde esa fecha (a nombre del principal)
    select pr.id, mycen_space_handle(pr.id), l.u
    from content_objects o
    join profiles pr on pr.identity_id = o.identity_id and pr.is_primary
    cross join lateral mycen_snapshot_links(o.published_snapshot) as l(u)
    where o.status = 'published' and o.published_at >= v_since and pr.suspended_at is null
    limit 20000;
end $$;

create or replace function public.cron_flag_link(p_key text, p_profile_id uuid, p_url text, p_threat text)
returns text language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v_threat text := left(coalesce(nullif(btrim(p_threat), ''), 'UNKNOWN'), 64);
begin
  if not mycen_cron_key_ok(p_key) then raise exception 'BAD_KEY' using errcode = '42501'; end if;
  if p_url is null or char_length(p_url) > 2048 or not exists (select 1 from profiles where id = p_profile_id) then
    return 'invalid';
  end if;
  insert into mycen_link_flags (profile_id, url, threat) values (p_profile_id, p_url, v_threat)
  on conflict do nothing;
  if not found then return 'duplicate'; end if;
  -- Una denuncia para el equipo (Denuncias): nadie la ve más que el panel; el perfil no se toca solo
  insert into profile_reports (profile_id, reason, details, reporter_hash)
  values (p_profile_id, 'scam', left('Link marcado como peligroso (' || v_threat || '): ' || p_url, 1000), 'system:web-risk');
  return 'flagged';
end $$;

-- Las cron_* las llama la tarea programada con la clave anónima (sin sesión): sin la llave no devuelven nada
revoke all on function public.cron_alert_digest(text, timestamptz) from public;
revoke all on function public.cron_recent_links(text, timestamptz) from public;
revoke all on function public.cron_flag_link(text, uuid, text, text) from public;
grant execute on function public.cron_alert_digest(text, timestamptz) to anon, authenticated;
grant execute on function public.cron_recent_links(text, timestamptz) to anon, authenticated;
grant execute on function public.cron_flag_link(text, uuid, text, text) to anon, authenticated;

-- ─── 4. Analítica a escala ───────────────────────────────────────────────────

-- Visitas por fecha de todos los perfiles (panel del equipo: crecimiento y visitas)
create index if not exists profile_events_views_time_idx on public.profile_events (created_at) where event_type = 'view';

-- Retención: lo de 20261121000001 + visitas y toques de más de 13 meses (Studio muestra hasta 90 días)
create or replace function public.mycen_purge_expired()
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  n_events   bigint := 0;
  n_activity bigint := 0;
  n_hits     bigint := 0;
  n_audit    bigint := 0;
  n_visits   bigint := 0;
begin
  if to_regclass('public.product_events') is not null then
    delete from product_events where created_at < now() - interval '25 months';
    get diagnostics n_events = row_count;
  end if;
  if to_regclass('public.user_activity_days') is not null then
    delete from user_activity_days where day < (current_date - interval '25 months')::date;
    get diagnostics n_activity = row_count;
  end if;
  if to_regclass('public.app_error_hits') is not null then
    delete from app_error_hits where day < current_date - 90;
    get diagnostics n_hits = row_count;
  end if;
  if to_regclass('public.admin_audit_log') is not null then
    perform set_config('mycen.retention_purge', 'on', true);
    delete from admin_audit_log where created_at < now() - interval '3 years';
    get diagnostics n_audit = row_count;
    perform set_config('mycen.retention_purge', '', true);
  end if;
  -- De a 200.000 por día como mucho: no traba la tabla aunque haya mucho atrasado
  delete from profile_events where id in (
    select id from profile_events where created_at < now() - interval '13 months' limit 200000);
  get diagnostics n_visits = row_count;
  delete from mycen_link_flags where created_at < now() - interval '13 months';
  return jsonb_build_object('product_events', n_events, 'user_activity_days', n_activity,
    'app_error_hits', n_hits, 'admin_audit_log', n_audit, 'profile_events', n_visits, 'at', now());
end $$;
revoke all on function public.mycen_purge_expired() from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
