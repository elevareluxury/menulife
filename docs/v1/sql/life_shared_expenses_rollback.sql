-- Vuelta atrás de 20261029000003_life_shared_expenses.sql (se pierden las cuentas compartidas; los movimientos quedan)
begin;
drop table if exists public.life_splits;
drop function if exists public.life_split_check_tx();
drop function if exists public.life_splits_limit();
notify pgrst, 'reload schema';
commit;
