-- =============================================================================
-- Life OS (V1.1): tus tareas en Google Calendar / calendario del iPhone por un link privado (suscripción ICS).
--
--   · life_calendar_feeds: un link por cuenta (token de 64 caracteres, imposible de adivinar). Nadie lee la tabla:
--     se maneja con life_calendar_token(p_rotate) (crear o cambiar el link; el viejo deja de andar) y
--     life_calendar_disable() (apagarlo).
--   · life_calendar_feed(p_token): lo pide la función de Vercel /cal/<token>.ics (sin sesión). Devuelve sólo las
--     tareas pendientes con fecha (de 30 días atrás a 400 adelante, hasta 1000): título, fecha, hora, aviso y
--     repetición. Nunca las notas ni nada más.
--
-- Idempotente. Vuelta atrás: docs/v1/sql/life_calendar_rollback.sql
-- =============================================================================

begin;

create table if not exists public.life_calendar_feeds (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      text not null unique check (token ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.life_calendar_feeds enable row level security;
revoke all on public.life_calendar_feeds from anon, authenticated;

create or replace function public.life_calendar_token(p_rotate boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_token text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select token into v_token from public.life_calendar_feeds where user_id = v_uid;
  if v_token is null or p_rotate then
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    insert into public.life_calendar_feeds (user_id, token) values (v_uid, v_token)
      on conflict (user_id) do update set token = excluded.token, created_at = now();
  end if;
  return v_token;
end;
$$;

create or replace function public.life_calendar_disable()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.life_calendar_feeds where user_id = auth.uid();
$$;

create or replace function public.life_calendar_feed(p_token text)
returns table (id uuid, title text, due_date date, due_time time, remind_minutes integer, recurrence jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.title, b.due_date, b.due_time, b.remind_minutes, b.recurrence
  from public.life_calendar_feeds f
  join public.life_brain_items b on b.user_id = f.user_id
  where p_token ~ '^[a-f0-9]{64}$' and f.token = p_token
    and b.type = 'task' and not b.is_archived and not b.is_completed
    and b.due_date between current_date - 30 and current_date + 400
  order by b.due_date, b.due_time nulls first
  limit 1000
$$;

revoke all on function public.life_calendar_token(boolean) from public, anon;
revoke all on function public.life_calendar_disable() from public, anon;
revoke all on function public.life_calendar_feed(text) from public;
grant execute on function public.life_calendar_token(boolean) to authenticated;
grant execute on function public.life_calendar_disable() to authenticated;
grant execute on function public.life_calendar_feed(text) to anon, authenticated;

-- /cal/… es la ruta de los links de calendario: nadie puede usar "cal" de username
insert into public.reserved_usernames (username, reason) values ('cal', 'route') on conflict (username) do nothing;

notify pgrst, 'reload schema';

commit;
