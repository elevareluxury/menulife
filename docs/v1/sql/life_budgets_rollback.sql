-- Vuelta atrás de 20261030000001_life_budgets.sql (se pierden los presupuestos; los movimientos quedan)
begin;
drop table if exists public.life_budgets;
drop function if exists public.life_budgets_rules();
notify pgrst, 'reload schema';
commit;
