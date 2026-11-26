-- Escala (etapa 3) y auditoría N1: recordatorios con la app cerrada (Web Push) sin perder avisos de nadie.
--   · life_claim_due_reminders entrega de a tandas: hasta 300 tareas y 300 hábitos por llamada y hasta 20 de cada uno
--     por cuenta. Así la respuesta nunca pasa el "Max rows" de la API (1000 por defecto) y una cuenta con miles de
--     recordatorios no tapa los de los demás: lo que no entra queda para la llamada siguiente (la función life-reminders
--     pide tandas hasta vaciar). Lo que no se reclamó sigue igual (las ventanas de 12 h y 2 h no cambian).
--   · Hasta 10 dispositivos por cuenta (life_push_subscribe borra los más viejos): una cuenta ya no puede registrar
--     direcciones de aviso sin límite.
-- Idempotente. Se aplica en Supabase → SQL Editor. Tests: tests/db/scale_reminders.test.sql.

-- Igual a 20261109000001 + topes (por cuenta y por llamada)
create or replace function public.life_claim_due_reminders(p_now timestamptz default now())
returns table (user_id uuid, kind text, item_id uuid, title text, body text, url text, tag text)
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
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
  ), candidates as (
    select c.id from (
      select t.id, row_number() over (partition by t.user_id order by t.due_date, t.due_time nulls first, t.id) as n,
             t.due_date, t.due_time
      from public.life_brain_items t
      join zones z on z.user_id = t.user_id
      where t.type = 'task' and not t.is_completed and not t.is_archived
        and t.reminded_at is null and t.remind_minutes is not null and t.due_date is not null
        and t.due_date between (p_now at time zone z.tz)::date - 1 and (p_now at time zone z.tz)::date + 8
        and ((t.due_date + coalesce(t.due_time, time '09:00')) at time zone z.tz) - make_interval(mins => t.remind_minutes)
            between p_now - interval '12 hours' and p_now
    ) c
    where c.n <= 20
    order by c.due_date, c.due_time nulls first, c.id
    limit 300
  ), due as (
    select t.id from public.life_brain_items t
    where t.id in (select id from candidates) and t.reminded_at is null
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
  ), all_due as (
    select h.id, h.user_id, h.name, h.anchor, td.d,
           row_number() over (partition by h.user_id order by h.reminder_time, h.id) as n
    from public.life_habits h
    join today td on td.user_id = h.user_id
    where h.is_active and h.reminder_enabled and h.reminder_time is not null
      and ((td.d + h.reminder_time) at time zone td.tz) between p_now - interval '2 hours' and p_now
      and (h.frequency->>'type' = 'times_per_week'
           or jsonb_typeof(h.frequency->'days') is distinct from 'array'
           or jsonb_array_length(h.frequency->'days') = 0
           or (h.frequency->'days') @> to_jsonb(extract(dow from td.d)::int))
      and not exists (
        select 1 from public.life_habit_push_sent ps where ps.habit_id = h.id and ps.day = td.d)
      and not exists (
        select 1 from public.life_habit_logs l
        where l.habit_id = h.id and l.completed_date = td.d
          and (case when h.target_value > 0 then coalesce(l.value, 1) >= h.target_value else coalesce(l.value, 1) > 0 end))
  ), due as (
    select * from all_due where n <= 20 order by d, id limit 300
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
  end if;
end $$;

-- Igual a 20261109000001 + hasta 10 dispositivos por cuenta (se van los que se usaron hace más tiempo)
create or replace function public.life_push_subscribe(p_endpoint text, p_p256dh text, p_auth text,
  p_timezone text default null, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or coalesce(length(p_p256dh), 0) not between 1 and 200 or coalesce(length(p_auth), 0) not between 1 and 100 then
    raise exception 'Suscripción inválida' using errcode = '22023';
  end if;
  -- clock_timestamp: dentro de una misma transacción now() es igual para todos y el orden no diría cuál es el último
  insert into public.life_push_subscriptions (user_id, endpoint, p256dh, auth, timezone, user_agent, created_at)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(nullif(p_timezone, ''), 64), left(nullif(p_user_agent, ''), 300),
          clock_timestamp())
  on conflict (endpoint) do update set
    user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
    timezone = excluded.timezone, user_agent = excluded.user_agent, failures = 0, created_at = clock_timestamp();
  delete from public.life_push_subscriptions s
  where s.user_id = auth.uid()
    and s.id not in (select id from public.life_push_subscriptions
                     where user_id = auth.uid() order by created_at desc, id limit 10);
end $$;
revoke all on function public.life_push_subscribe(text, text, text, text, text) from public, anon;
grant execute on function public.life_push_subscribe(text, text, text, text, text) to authenticated;
