-- =============================================================================
-- Seguridad (auditoría total previa al freeze): una tarea, idea, hábito, movimiento, paso o check-in sólo puede
-- vincularse a una meta propia (goal_id de la misma cuenta). Antes la RLS revisaba la fila pero no la meta: se
-- podía apuntar a una meta ajena (sin poder leerla ni cambiarla). life_tasks ya lo revisaba en su política.
--
-- Trigger antes de insertar o cambiar goal_id. Las filas que ya existen no se tocan. Idempotente.
-- Vuelta atrás: docs/v1/sql/life_goal_owner_rollback.sql
-- =============================================================================

begin;

create or replace function public.life_check_goal_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.goal_id is not null and not exists (
    select 1 from public.life_goals g where g.id = new.goal_id and g.user_id = new.user_id
  ) then
    raise exception 'goal_not_owned' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.life_check_goal_owner() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['life_brain_items', 'life_habits', 'life_transactions', 'life_goal_milestones', 'life_goal_checkins'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'goal_id')
      or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'user_id') then
      continue;
    end if;
    execute format('drop trigger if exists %I on public.%I', t || '_goal_owner', t);
    execute format('create trigger %I before insert or update of goal_id, user_id on public.%I
      for each row execute function public.life_check_goal_owner()', t || '_goal_owner', t);
  end loop;
end $$;

commit;
