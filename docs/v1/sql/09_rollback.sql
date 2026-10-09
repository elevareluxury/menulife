-- Vuelta atrás de 20261019000001_v1_task_recurrence.sql (V1 · etapa 09). Las tareas quedan; se pierden la repetición
-- y las subtareas.
begin;
alter table public.life_brain_items drop constraint if exists life_brain_items_recurrence_check;
alter table public.life_brain_items drop constraint if exists life_brain_items_subtasks_check;
alter table public.life_brain_items drop column if exists next_occurrence_id;
alter table public.life_brain_items drop column if exists recurrence;
alter table public.life_brain_items drop column if exists subtasks;
drop function if exists public.life_valid_recurrence(jsonb);
drop function if exists public.life_valid_subtasks(jsonb);
commit;
