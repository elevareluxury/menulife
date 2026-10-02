-- ═══════════════════════════════════════════════════════════════════
-- MYCEN · Fase 3 — Todas las tareas en Brain
-- Suma fecha, hora, recordatorio, meta y foco a life_brain_items
-- y copia las tareas de la Agenda (life_tasks). No borra nada.
-- ═══════════════════════════════════════════════════════════════════

alter table public.life_brain_items
  add column if not exists due_date       date,
  add column if not exists due_time       time,
  add column if not exists remind_minutes integer,
  add column if not exists reminded_at    timestamptz,
  add column if not exists completed_at   timestamptz,
  add column if not exists goal_id        uuid references public.life_goals(id) on delete set null,
  add column if not exists is_focus       boolean not null default false;

alter table public.life_brain_items drop constraint if exists life_brain_items_remind_check;
alter table public.life_brain_items add constraint life_brain_items_remind_check
  check (remind_minutes is null or remind_minutes between 0 and 10080);

-- Fecha real de cuando se completó cada tarea (para el Replay)
update public.life_brain_items
   set completed_at = updated_at
 where is_completed and completed_at is null;

create or replace function public.life_brain_completed_at()
returns trigger language plpgsql as $$
begin
  if new.is_completed and new.completed_at is null then
    new.completed_at := now();
  elsif not new.is_completed then
    new.completed_at := null;
  end if;
  return new;
end; $$;

drop trigger if exists life_brain_completed_at on public.life_brain_items;
create trigger life_brain_completed_at
  before insert or update of is_completed on public.life_brain_items
  for each row execute function public.life_brain_completed_at();

create index if not exists idx_lbi_user_due
  on public.life_brain_items (user_id, due_date)
  where type = 'task' and not is_archived;

-- Copiar las tareas de la Agenda a Brain (mismo id: si se corre de nuevo, no duplica)
insert into public.life_brain_items
  (id, user_id, type, title, content, is_completed, is_archived, created_at, updated_at,
   due_date, due_time, remind_minutes, reminded_at, completed_at, goal_id)
select t.id, t.user_id, 'task', t.title, t.notes, t.completed_at is not null, false,
       t.created_at, t.updated_at,
       t.due_date, t.due_time, t.remind_minutes, t.reminded_at, t.completed_at, t.goal_id
  from public.life_tasks t
on conflict (id) do nothing;

-- Verificación: las dos cantidades tienen que coincidir
select (select count(*) from public.life_tasks) as tareas_agenda,
       (select count(*) from public.life_brain_items b
         where exists (select 1 from public.life_tasks t where t.id = b.id)) as copiadas_a_brain;
