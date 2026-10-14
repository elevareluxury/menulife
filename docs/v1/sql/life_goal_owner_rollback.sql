-- Vuelta atrás de 20261026000001_life_goal_owner.sql
begin;
do $$
declare t text;
begin
  foreach t in array array['life_brain_items', 'life_habits', 'life_transactions', 'life_goal_milestones', 'life_goal_checkins'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', t || '_goal_owner', t);
    end if;
  end loop;
end $$;
drop function if exists public.life_check_goal_owner();
commit;
