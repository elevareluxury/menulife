-- =============================================================================
-- Life OS · tareas que se repiten: la siguiente ocurrencia se crea una sola vez (auditoría V2 de lógica, punto 12).
--
--   Antes la app creaba la siguiente si next_occurrence_id venía vacío en el objeto que tenía en pantalla: dos toques
--   muy rápidos, o completar la misma tarea en dos dispositivos, creaban dos "siguientes".
--
--   · life_brain_items.occurrence_of: en la siguiente, la tarea que la originó. Índice único (donde no es null): la
--     base acepta una sola siguiente por tarea. El que llega segundo recibe 23505 y la app usa la que ya existe.
--   · Trigger: occurrence_of sólo puede apuntar a una tarea de la misma cuenta (si no, se podría ocupar el lugar de
--     la siguiente de otra persona).
--   · Las siguientes que ya existen se anotan desde next_occurrence_id (si una tarea tiene varias, sólo la vinculada).
--   · Destildar sigue igual: la siguiente se borra si no se hizo (y el lugar queda libre); si ya se hizo, queda y al
--     volver a tildar se vuelve a vincular esa (no se crea otra).
--   · La RLS de siempre (cada uno ve y cambia lo suyo) no cambia.
--
-- Requiere 20261019000001_v1_task_recurrence.sql. Idempotente.
-- Vuelta atrás: drop trigger life_brain_items_occurrence_owner on life_brain_items;
--   drop index life_brain_items_occurrence_of_key; alter table life_brain_items drop column occurrence_of;
-- =============================================================================

begin;

alter table public.life_brain_items
  add column if not exists occurrence_of uuid references public.life_brain_items(id) on delete set null;

-- Las que ya existen (antes del índice, sin repetir origen)
update public.life_brain_items n
   set occurrence_of = o.id
  from public.life_brain_items o
 where o.next_occurrence_id = n.id
   and o.user_id = n.user_id
   and n.occurrence_of is null
   and n.id <> o.id
   and not exists (select 1 from public.life_brain_items x where x.occurrence_of = o.id);

create unique index if not exists life_brain_items_occurrence_of_key
  on public.life_brain_items (occurrence_of) where occurrence_of is not null;

create or replace function public.life_check_occurrence_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.occurrence_of is not null and not exists (
    select 1 from public.life_brain_items o
     where o.id = new.occurrence_of and o.user_id = new.user_id and o.type = 'task'
  ) then
    raise exception 'occurrence_not_owned' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.life_check_occurrence_owner() from public, anon, authenticated;

drop trigger if exists life_brain_items_occurrence_owner on public.life_brain_items;
create trigger life_brain_items_occurrence_owner
  before insert or update of occurrence_of, user_id on public.life_brain_items
  for each row execute function public.life_check_occurrence_owner();

commit;
