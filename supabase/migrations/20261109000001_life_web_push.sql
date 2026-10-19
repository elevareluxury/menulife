-- =============================================================================
-- Life OS · avisos con la app cerrada (Web Push)
--
-- La app web instalada en el inicio sólo avisaba con Life OS abierto. Ahora cada celular o navegador que permite los
-- avisos se suscribe (life_push_subscribe) y la función life-reminders (supabase/functions, cada minuto) manda lo que
-- toca: pide a life_claim_due_reminders() los recordatorios vencidos y los marca en el mismo paso, así cada uno sale
-- una sola vez aunque la app también esté abierta (tareas: el mismo reminded_at que usa la app).
--
-- Privado: nadie lee las suscripciones desde la app (sólo el servidor, con service_role). Al cerrar sesión la app borra
-- la suya (life_push_unsubscribe), así en un celular compartido la cuenta siguiente no recibe los avisos de otra.
--
-- Idempotente. Deshacer: drop function life_claim_due_reminders, life_push_subscribe, life_push_unsubscribe;
-- drop table life_habit_push_sent, life_push_subscriptions.
-- =============================================================================
begin;

create table if not exists public.life_push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Dirección del servicio de avisos del navegador (Google, Apple, Mozilla…): siempre https
  endpoint    text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh      text not null check (length(p256dh) <= 200),
  auth        text not null check (length(auth) <= 100),
  -- Zona del dispositivo, por si la cuenta no eligió una (user_settings.timezone)
  timezone    text check (timezone is null or length(timezone) <= 64),
  user_agent  text check (user_agent is null or length(user_agent) <= 300),
  created_at  timestamptz not null default now(),
  last_sent_at timestamptz,
  failures    integer not null default 0
);
create index if not exists idx_life_push_user on public.life_push_subscriptions(user_id);
alter table public.life_push_subscriptions enable row level security;
revoke all on public.life_push_subscriptions from public, anon, authenticated;

-- Hábitos ya avisados por push (uno por día): los de tareas usan life_brain_items.reminded_at
create table if not exists public.life_habit_push_sent (
  habit_id uuid not null references public.life_habits(id) on delete cascade,
  day      date not null,
  sent_at  timestamptz not null default now(),
  primary key (habit_id, day)
);
alter table public.life_habit_push_sent enable row level security;
revoke all on public.life_habit_push_sent from public, anon, authenticated;

-- Suscribe este dispositivo a la cuenta con sesión. Si el dispositivo era de otra cuenta, pasa a esta.
create or replace function public.life_push_subscribe(p_endpoint text, p_p256dh text, p_auth text,
  p_timezone text default null, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or coalesce(length(p_p256dh), 0) not between 1 and 200 or coalesce(length(p_auth), 0) not between 1 and 100 then
    raise exception 'Suscripción inválida' using errcode = '22023';
  end if;
  insert into public.life_push_subscriptions (user_id, endpoint, p256dh, auth, timezone, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(nullif(p_timezone, ''), 64), left(nullif(p_user_agent, ''), 300))
  on conflict (endpoint) do update set
    user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
    timezone = excluded.timezone, user_agent = excluded.user_agent, failures = 0;
end $$;

-- Deja de avisar a este dispositivo (sólo si es de la cuenta con sesión)
create or replace function public.life_push_unsubscribe(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.life_push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke all on function public.life_push_subscribe(text, text, text, text, text) from public, anon;
revoke all on function public.life_push_unsubscribe(text) from public, anon;
grant execute on function public.life_push_subscribe(text, text, text, text, text) to authenticated;
grant execute on function public.life_push_unsubscribe(text) to authenticated;

-- Recordatorios que tocan ahora para las cuentas con algún dispositivo suscrito. Los marca en el mismo paso (cada uno
-- sale una vez). Las horas son las de la zona de la cuenta, como en la app (useTaskReminders / useHabitReminders):
--   tareas: fecha + hora (09:00 si no tiene) − "avisar antes", hasta 12 h tarde
--   hábitos: hora del recordatorio, los días que tocan, si hoy no se cumplió todavía, hasta 2 h tarde
create or replace function public.life_claim_due_reminders(p_now timestamptz default now())
returns table (user_id uuid, kind text, item_id uuid, title text, body text, url text, tag text)
language plpgsql security definer set search_path = public as $
#variable_conflict use_column
begin
  return query
  with zones as (
    select s.user_id, coalesce(
      (select z.name from pg_timezone_names z where z.name = us.timezone),
      (select z.name from pg_timezone_names z where z.name = max(s.timezone)),
      'UTC') as tz
    from public.life_push_subscriptions s
    left join public.user_settings us on us.user_id = s.user_id
    group by s.user_id, us.timezone
  ), due as (
    select t.id
    from public.life_brain_items t
    join zones z on z.user_id = t.user_id
    where t.type = 'task' and not t.is_completed and not t.is_archived
      and t.reminded_at is null and t.remind_minutes is not null and t.due_date is not null
      and t.due_date between (p_now at time zone z.tz)::date - 1 and (p_now at time zone z.tz)::date + 8
      and ((t.due_date + coalesce(t.due_time, time '09:00')) at time zone z.tz) - make_interval(mins => t.remind_minutes)
          between p_now - interval '12 hours' and p_now
    for update of t skip locked
  ), claimed as (
    update public.life_brain_items t set reminded_at = p_now
    from due where t.id = due.id
    returning t.user_id, t.id, t.title, t.due_time
  )
  select c.user_id, 'task'::text, c.id, c.title,
    case when c.due_time is null then null else to_char(c.due_time, 'HH24:MI') end,
    '/life/brain?vista=tareas'::text, 'life-task-' || c.id::text
  from claimed c;

  return query
  with zones as (
    select s.user_id, coalesce(
      (select z.name from pg_timezone_names z where z.name = us.timezone),
      (select z.name from pg_timezone_names z where z.name = max(s.timezone)),
      'UTC') as tz
    from public.life_push_subscriptions s
    left join public.user_settings us on us.user_id = s.user_id
    group by s.user_id, us.timezone
  ), today as (
    select z.user_id, z.tz, (p_now at time zone z.tz)::date as d from zones z
  ), due as (
    select h.id, h.user_id, h.name, h.anchor, td.d
    from public.life_habits h
    join today td on td.user_id = h.user_id
    where h.is_active and h.reminder_enabled and h.reminder_time is not null
      and ((td.d + h.reminder_time) at time zone td.tz) between p_now - interval '2 hours' and p_now
      and (h.frequency->>'type' = 'times_per_week'
           or jsonb_typeof(h.frequency->'days') is distinct from 'array'
           or jsonb_array_length(h.frequency->'days') = 0
           or (h.frequency->'days') @> to_jsonb(extract(dow from td.d)::int))
      and not exists (
        select 1 from public.life_habit_logs l
        where l.habit_id = h.id and l.completed_date = td.d
          and (case when h.target_value > 0 then coalesce(l.value, 1) >= h.target_value else coalesce(l.value, 1) > 0 end))
  ), sent as (
    insert into public.life_habit_push_sent (habit_id, day)
    select due.id, due.d from due
    on conflict do nothing
    returning habit_id, day
  )
  select due.user_id, 'habit'::text, due.id, due.name, due.anchor, '/life/habits'::text,
    'life-habit-' || due.id::text || '-' || to_char(due.d, 'YYYY-MM-DD')
  from due join sent on sent.habit_id = due.id and sent.day = due.d;

  -- Lo de hace más de una semana ya no hace falta
  delete from public.life_habit_push_sent where day < (p_now at time zone 'UTC')::date - 7;
end $$;

revoke all on function public.life_claim_due_reminders(timestamptz) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.life_claim_due_reminders(timestamptz) to service_role;
    grant select, update, delete on public.life_push_subscriptions to service_role;
  end if;
end $$;

commit;
