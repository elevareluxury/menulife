-- =============================================================================
-- Mycen V1 · Etapa 09 — Life OS: tareas que se repiten y subtareas
--
--   · life_brain_items.recurrence (jsonb): { freq: 'daily'|'weekly'|'monthly'|'interval', interval?, weekdays?,
--     monthday? }. Sólo tareas y sólo con fecha de vencimiento (sin fecha no hay "próxima").
--   · life_brain_items.subtasks (jsonb): [{ id, text, done }], máximo 20 y 200 caracteres por texto.
--   · life_brain_items.next_occurrence_id: al completar una tarea que se repite, la app crea la siguiente (con la
--     fecha local de la persona) y la anota acá. Así no se duplica si se destilda y se vuelve a tildar.
--   · La base valida todo; la RLS de siempre (cada uno ve y cambia lo suyo) no cambia.
--
-- Requiere 20261005000001_brain_tasks.sql. Idempotente.
-- Vuelta atrás: docs/v1/sql/09_rollback.sql
-- =============================================================================

begin;

alter table public.life_brain_items
  add column if not exists recurrence jsonb,
  add column if not exists subtasks jsonb not null default '[]'::jsonb,
  add column if not exists next_occurrence_id uuid references public.life_brain_items(id) on delete set null;

create or replace function public.life_valid_recurrence(r jsonb) returns boolean
language sql immutable as $$
  -- coalesce: una clave que falta da null, y un check con null pasaría
  select r is null or case when jsonb_typeof(r) <> 'object' then false else coalesce((
    not exists (select 1 from jsonb_object_keys(r) k where k not in ('freq', 'interval', 'weekdays', 'monthday'))
    and r ->> 'freq' in ('daily', 'weekly', 'monthly', 'interval')
    and (not r ? 'interval' or (jsonb_typeof(r -> 'interval') = 'number'
         and (r ->> 'interval') ~ '^[0-9]{1,3}$' and (r ->> 'interval')::int between 1 and 365))
    and (r ->> 'freq' <> 'weekly' or case when jsonb_typeof(r -> 'weekdays') = 'array' then
         jsonb_array_length(r -> 'weekdays') between 1 and 7
         and not exists (select 1 from jsonb_array_elements(r -> 'weekdays') w where w::text !~ '^[0-6]$')
         else false end)
    and (not r ? 'monthday' or (jsonb_typeof(r -> 'monthday') = 'number'
         and (r ->> 'monthday') ~ '^[0-9]{1,2}$' and (r ->> 'monthday')::int between 1 and 31))
  ), false) end
$$;

create or replace function public.life_valid_subtasks(s jsonb) returns boolean
language sql immutable as $$
  -- CASE (no AND) para no llamar a jsonb_array_elements / jsonb_object_keys sobre algo que no es lista u objeto
  select case when jsonb_typeof(s) = 'array' and jsonb_array_length(s) <= 20 then not exists (
    select 1 from jsonb_array_elements(s) x
    -- Cada subtarea: exactamente { id, text, done } con sus tipos (lo que falta cuenta como inválido)
    where not case when jsonb_typeof(x) = 'object' then coalesce(
        jsonb_typeof(x -> 'id') = 'string' and char_length(x ->> 'id') between 1 and 64
        and jsonb_typeof(x -> 'text') = 'string' and char_length(btrim(x ->> 'text')) between 1 and 200
        and jsonb_typeof(x -> 'done') = 'boolean'
        and not exists (select 1 from jsonb_object_keys(x) k where k not in ('id', 'text', 'done')), false)
      else false end
  ) else false end
$$;

alter table public.life_brain_items drop constraint if exists life_brain_items_recurrence_check;
alter table public.life_brain_items add constraint life_brain_items_recurrence_check check (
  public.life_valid_recurrence(recurrence) and (recurrence is null or (type = 'task' and due_date is not null))
);
alter table public.life_brain_items drop constraint if exists life_brain_items_subtasks_check;
alter table public.life_brain_items add constraint life_brain_items_subtasks_check check (public.life_valid_subtasks(subtasks));

commit;
