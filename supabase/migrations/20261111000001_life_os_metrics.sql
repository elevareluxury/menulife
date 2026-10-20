-- =============================================================================
-- Mycen · Métricas de Life OS: ¿cumple su promesa? (sin guardar contenido de nadie)
--
--   · product_event_types: la lista cerrada de eventos pasa de un check (y una lista repetida en track_product_event)
--     a una tabla. Para sumar eventos en otra migración alcanza con
--       insert into public.product_event_types (event) values ('nuevo') on conflict do nothing;
--   · Eventos nuevos: goal_created, item_linked_to_goal {tipo: task|habit|money|note},
--     capture_used {tipo: quick|voice|dump, dest: task|idea|note|goal|money, count?}, weekly_review_done,
--     reminder_shown y reminder_opened {kind: task|habit, channel: app|push}.
--     Sus props se validan con valores fijos (mycen_valid_event_shape): no entra ningún texto de la persona.
--     reminder_shown con channel push lo registra la Edge Function life-reminders (service role, directo a la tabla).
--   · admin_product_metrics suma: % de cuentas activas que vinculan algo a una meta, captura por tipo y destino,
--     revisiones semanales, recordatorios mostrados/abiertos por tipo y canal, y la mediana del tiempo hasta el primer
--     valor (del registro al primer life_priorities_set, habit_logged o task_completed).
--
-- Requiere 20261022000001_v1_product_events.sql. Idempotente.
-- =============================================================================

begin;

create table if not exists public.product_event_types (
  event text primary key check (event ~ '^[a-z][a-z0-9_]{1,47}$')
);
alter table public.product_event_types enable row level security;
revoke all on public.product_event_types from anon, authenticated;

insert into public.product_event_types (event) values
  ('signup_started'), ('signup_completed'), ('onboarding_step'), ('profile_published'), ('share_tool_used'),
  ('qr_downloaded'), ('appearance_changed'),
  ('life_my_day_opened'), ('life_priorities_set'), ('life_day_closed'), ('habit_logged'), ('task_completed'), ('life_returned'),
  ('goal_created'), ('item_linked_to_goal'), ('capture_used'), ('weekly_review_done'), ('reminder_shown'), ('reminder_opened')
on conflict do nothing;

-- El check con la lista fija se cambia por la referencia a la tabla
alter table public.product_events drop constraint if exists product_events_event_check;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'product_events_event_fkey'
                 and conrelid = 'public.product_events'::regclass) then
    alter table public.product_events add constraint product_events_event_fkey
      foreign key (event) references public.product_event_types (event);
  end if;
end $$;

-- La Edge Function de recordatorios registra los push mostrados con la service role
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.product_event_types to service_role;
    grant insert on public.product_events to service_role;
  end if;
end $$;

-- Props válidas: objeto plano, claves conocidas, valores escalares cortos (texto ≤ 64, números, sí/no)
create or replace function public.mycen_valid_event_props(p jsonb) returns boolean
language sql immutable as $$
  select case when jsonb_typeof(p) = 'object' and octet_length(p::text) <= 2048 then not exists (
    select 1 from jsonb_each(p) kv
    where kv.key not in ('ref', 'tipo', 'step', 'seconds', 'platform', 'format', 'layout', 'mode', 'count', 'achieved', 'days',
                         'kind', 'channel', 'dest')
       or jsonb_typeof(kv.value) not in ('string', 'number', 'boolean')
       or (jsonb_typeof(kv.value) = 'string' and char_length(kv.value #>> '{}') > 64)
  ) else false end
$$;

-- Los eventos de Life OS nuevos sólo llevan etiquetas de una lista fija (y count, un número)
create or replace function public.mycen_valid_event_shape(p_event text, p jsonb) returns boolean
language sql immutable as $$
  select case
    when p_event in ('goal_created', 'weekly_review_done') then p = '{}'::jsonb
    when p_event = 'item_linked_to_goal' then
      p ? 'tipo' and (select count(*) from jsonb_object_keys(p)) = 1
      and coalesce(p ->> 'tipo' in ('task', 'habit', 'money', 'note'), false)
    when p_event = 'capture_used' then
      p ?& array['tipo', 'dest'] and not exists (select 1 from jsonb_object_keys(p) k where k not in ('tipo', 'dest', 'count'))
      and coalesce(p ->> 'tipo' in ('quick', 'voice', 'dump'), false)
      and coalesce(p ->> 'dest' in ('task', 'idea', 'note', 'goal', 'money'), false)
      and (not p ? 'count' or (jsonb_typeof(p -> 'count') = 'number' and (p ->> 'count')::numeric between 1 and 200))
    when p_event in ('reminder_shown', 'reminder_opened') then
      p ?& array['kind', 'channel'] and (select count(*) from jsonb_object_keys(p)) = 2
      and coalesce(p ->> 'kind' in ('task', 'habit'), false) and coalesce(p ->> 'channel' in ('app', 'push'), false)
    else true
  end
$$;

create or replace function public.track_product_event(p_event text, p_props jsonb default '{}'::jsonb)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v_user  uuid := auth.uid();
  v_props jsonb := coalesce(p_props, '{}'::jsonb);
begin
  if p_event is null or not exists (select 1 from product_event_types where event = p_event)
     or not mycen_valid_event_props(v_props) or not mycen_valid_event_shape(p_event, v_props) then
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

-- Resumen para el panel de super-admin. p_days = ventana para publicar, registros, hábitos, regresos y Life OS.
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
  -- Uso de Life OS: lo que hace la persona (un recordatorio mostrado no cuenta; tocarlo, sí)
  life as (
    select user_id, created_at::date as day from product_events
    where user_id is not null and event in ('life_my_day_opened', 'life_priorities_set', 'life_day_closed',
                                            'habit_logged', 'task_completed', 'life_returned', 'goal_created',
                                            'item_linked_to_goal', 'capture_used', 'weekly_review_done', 'reminder_opened')
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
  ),
  period as (
    select user_id, event, props from product_events
    where user_id is not null and created_at >= v_since
      and event in ('goal_created', 'item_linked_to_goal', 'capture_used', 'weekly_review_done', 'reminder_shown', 'reminder_opened')
  ),
  -- Primer valor: prioridades del día, un hábito o una tarea hecha, contado desde el registro
  first_value as (
    select s.user_id, extract(epoch from min(e.created_at) - s.at) as seconds
    from signups s join product_events e on e.user_id = s.user_id and e.created_at >= s.at
      and e.event in ('life_priorities_set', 'habit_logged', 'task_completed')
    group by s.user_id, s.at
  ),
  reminder_rows as (
    select props ->> 'kind' as kind, props ->> 'channel' as channel,
           count(*) filter (where event = 'reminder_shown') as shown,
           count(*) filter (where event = 'reminder_opened') as opened
    from period where event in ('reminder_shown', 'reminder_opened')
    group by 1, 2
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
                           from (select * from refs order by n desc, ref limit 20) r), '[]'::jsonb),
    -- Integración: de las cuentas activas en Life OS del período, cuántas vincularon algo a una meta
    'goals_created', (select count(*) from period where event = 'goal_created'),
    'goal_linked_users', (select count(distinct p.user_id) from period p
                          where p.event = 'item_linked_to_goal' and p.user_id in (select user_id from period_life)),
    'goal_links', coalesce((select jsonb_object_agg(tipo, n) from (
                    select props ->> 'tipo' as tipo, count(*) as n from period
                    where event = 'item_linked_to_goal' group by 1) x), '{}'::jsonb),
    'capture_users', (select count(distinct user_id) from period where event = 'capture_used'),
    -- uses = veces que se usó; items = cosas guardadas (vaciar la cabeza guarda varias de una vez)
    'captures', coalesce((select jsonb_agg(jsonb_build_object('tipo', tipo, 'dest', dest, 'uses', uses, 'items', items)
                                           order by tipo, dest) from (
                  select props ->> 'tipo' as tipo, props ->> 'dest' as dest, count(*) as uses,
                         sum(case when jsonb_typeof(props -> 'count') = 'number' then (props ->> 'count')::int else 1 end) as items
                  from period where event = 'capture_used' group by 1, 2) x), '[]'::jsonb),
    'weekly_reviews', (select count(*) from period where event = 'weekly_review_done'),
    'weekly_review_users', (select count(distinct user_id) from period where event = 'weekly_review_done'),
    'reminders', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'channel', channel, 'shown', shown, 'opened', opened)
                                            order by kind, channel) from reminder_rows), '[]'::jsonb),
    'first_value_users', (select count(*) from first_value),
    'first_value_median_seconds', (select percentile_cont(0.5) within group (order by seconds) from first_value)
  ) into v_result;

  return v_result;
end $$;

revoke all on function public.admin_product_metrics(int) from public, anon;
grant execute on function public.admin_product_metrics(int) to authenticated;

commit;

notify pgrst, 'reload schema';
