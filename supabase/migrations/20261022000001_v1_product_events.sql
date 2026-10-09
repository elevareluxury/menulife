-- =============================================================================
-- Mycen V1 · Etapa 14 — Métricas de producto propias (sin terceros)
--
--   · product_events: un evento de uso por fila (id, user_id o null, event, props ≤ 2 KB, created_at). Nadie la lee
--     ni escribe directo (RLS sin políticas): la app registra con track_product_event y sólo los super-admins leen
--     el resumen con admin_product_metrics.
--   · track_product_event(event, props): lista cerrada de eventos; props = objeto plano con claves conocidas y
--     valores cortos (nada de contenido de tareas, hábitos ni mensajes). Sin sesión sólo se acepta signup_started.
--     Topes: 300 eventos por cuenta por hora; 2000 por hora entre todos los visitantes sin sesión.
--     Devuelve 'ok' | 'invalid' | 'limited' (la app lo ignora: nunca bloquea la interfaz).
--   · admin_product_metrics(days): mediana hasta publicar, % de cuentas publicadas, retención de Life OS por
--     cohorte semanal (día 1, semana 1 y mes 1), % con un hábito 4+ días en la semana, tasa de regreso y
--     registros por referido.
--
-- Requiere 20261011000001_identity_moderation.sql (super_admins, mycen_assert_admin). Idempotente.
-- Vuelta atrás: docs/v1/sql/14_rollback.sql
-- =============================================================================

begin;

create table if not exists public.product_events (
  id          bigint      generated always as identity primary key,
  user_id     uuid        references auth.users(id) on delete set null,
  event       text        not null,
  props       jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint product_events_event_check check (event in (
    'signup_started', 'signup_completed', 'onboarding_step', 'profile_published', 'share_tool_used',
    'qr_downloaded', 'appearance_changed',
    'life_my_day_opened', 'life_priorities_set', 'life_day_closed', 'habit_logged', 'task_completed', 'life_returned'
  )),
  constraint product_events_props_check check (jsonb_typeof(props) = 'object' and octet_length(props::text) <= 2048)
);

create index if not exists product_events_event_time on public.product_events (event, created_at);
create index if not exists product_events_user_time on public.product_events (user_id, created_at);
create index if not exists product_events_anon_time on public.product_events (created_at) where user_id is null;

alter table public.product_events enable row level security;
revoke all on public.product_events from anon, authenticated;

-- Props válidas: objeto plano, claves conocidas, valores escalares cortos (texto ≤ 64, números, sí/no)
create or replace function public.mycen_valid_event_props(p jsonb) returns boolean
language sql immutable as $$
  select case when jsonb_typeof(p) = 'object' and octet_length(p::text) <= 2048 then not exists (
    select 1 from jsonb_each(p) kv
    where kv.key not in ('ref', 'tipo', 'step', 'seconds', 'platform', 'format', 'layout', 'mode', 'count', 'achieved', 'days')
       or jsonb_typeof(kv.value) not in ('string', 'number', 'boolean')
       or (jsonb_typeof(kv.value) = 'string' and char_length(kv.value #>> '{}') > 64)
  ) else false end
$$;

create or replace function public.track_product_event(p_event text, p_props jsonb default '{}'::jsonb)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v_user  uuid := auth.uid();
  v_props jsonb := coalesce(p_props, '{}'::jsonb);
begin
  if p_event is null or p_event not in (
    'signup_started', 'signup_completed', 'onboarding_step', 'profile_published', 'share_tool_used',
    'qr_downloaded', 'appearance_changed',
    'life_my_day_opened', 'life_priorities_set', 'life_day_closed', 'habit_logged', 'task_completed', 'life_returned'
  ) or not mycen_valid_event_props(v_props) then
    return 'invalid';
  end if;

  if v_user is null then
    -- Sin sesión sólo se puede empezar el registro
    if p_event <> 'signup_started' then return 'invalid'; end if;
    if (select count(*) from product_events where user_id is null and created_at > now() - interval '1 hour') >= 2000 then
      return 'limited';
    end if;
  elsif (select count(*) from product_events where user_id = v_user and created_at > now() - interval '1 hour') >= 300 then
    return 'limited';
  end if;

  insert into product_events (user_id, event, props) values (v_user, p_event, v_props);
  return 'ok';
end $$;

revoke all on function public.track_product_event(text, jsonb) from public;
grant execute on function public.track_product_event(text, jsonb) to anon, authenticated;

-- Resumen para el panel de super-admin. p_days = ventana para publicar, registros, hábitos y regresos.
create or replace function public.admin_product_metrics(p_days int default 90)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 90), 730)));
  v_result jsonb;
begin
  perform mycen_assert_admin();

  with
  signups as (
    select user_id, min(created_at) as at from product_events
    where event = 'signup_completed' and user_id is not null and created_at >= v_since group by user_id
  ),
  first_publish as (
    select distinct on (user_id) user_id, (props ->> 'seconds')::numeric as seconds
    from product_events
    where event = 'profile_published' and user_id is not null and jsonb_typeof(props -> 'seconds') = 'number'
    order by user_id, created_at
  ),
  life as (
    select user_id, created_at::date as day from product_events
    where user_id is not null and event in ('life_my_day_opened', 'life_priorities_set', 'life_day_closed',
                                            'habit_logged', 'task_completed', 'life_returned')
  ),
  life_first as (select user_id, min(day) as first_day from life group by user_id),
  cohorts as (
    select date_trunc('week', f.first_day)::date as week, f.user_id, f.first_day,
           bool_or(l.day = f.first_day + 1) as d1,
           bool_or(l.day between f.first_day + 7 and f.first_day + 13) as d7,
           bool_or(l.day between f.first_day + 30 and f.first_day + 36) as d30
    from life_first f join life l using (user_id)
    where f.first_day >= current_date - 7 * 12
    group by 1, 2, 3
  ),
  week_life as (select distinct user_id from life where day > current_date - 7),
  habit_days as (
    select user_id, count(distinct created_at::date) as days from product_events
    where event = 'habit_logged' and user_id is not null and created_at::date > current_date - 7 group by user_id
  ),
  period_life as (select distinct user_id from life where day >= v_since::date),
  returns as (
    select user_id, (props ->> 'days')::numeric as days from product_events
    where event = 'life_returned' and user_id is not null and created_at >= v_since
      and jsonb_typeof(props -> 'days') = 'number'
  ),
  refs as (
    select props ->> 'ref' as ref, count(distinct user_id) as n from product_events
    where event = 'signup_completed' and created_at >= v_since and coalesce(props ->> 'ref', '') <> ''
    group by 1
  )
  select jsonb_build_object(
    'days', p_days,
    'events_total', (select count(*) from product_events where created_at >= v_since),
    'signups', (select count(*) from signups),
    'published', (select count(*) from signups s where exists (select 1 from first_publish p where p.user_id = s.user_id)),
    'publish_median_seconds', (select percentile_cont(0.5) within group (order by seconds) from first_publish p
                               where p.user_id in (select user_id from signups)),
    'retention', coalesce((
      select jsonb_agg(jsonb_build_object(
               'week', week, 'users', users,
               -- null mientras la cohorte todavía no llegó a ese día
               'd1', case when week + 7 + 1 <= current_date then d1 end,
               'd7', case when week + 7 + 13 <= current_date then d7 end,
               'd30', case when week + 7 + 36 <= current_date then d30 end) order by week desc)
      from (select week, count(*) as users, count(*) filter (where d1) as d1, count(*) filter (where d7) as d7,
                   count(*) filter (where d30) as d30
            from cohorts group by week) c), '[]'::jsonb),
    'week_life_users', (select count(*) from week_life),
    'habit4_users', (select count(*) from habit_days where days >= 4),
    'period_life_users', (select count(*) from period_life),
    'returned_users', (select count(distinct user_id) from returns),
    'return_median_days', (select percentile_cont(0.5) within group (order by days) from returns),
    'referral_signups', (select coalesce(sum(n), 0) from refs),
    'referrals', coalesce((select jsonb_agg(jsonb_build_object('ref', ref, 'signups', n) order by n desc, ref)
                           from (select * from refs order by n desc, ref limit 20) r), '[]'::jsonb)
  ) into v_result;

  return v_result;
end $$;

revoke all on function public.admin_product_metrics(int) from public, anon;
grant execute on function public.admin_product_metrics(int) to authenticated;

commit;

notify pgrst, 'reload schema';
