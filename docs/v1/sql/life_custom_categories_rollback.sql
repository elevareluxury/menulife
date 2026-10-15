-- Vuelta atrás de 20261029000001_life_custom_categories.sql.
-- Los movimientos que usaban una categoría propia quedan con 'c:<id>' en category: antes de borrar la tabla se pasan
-- a "Otros" (la app ya no podría mostrar su nombre).
begin;
drop trigger if exists life_transactions_category_owner on public.life_transactions;
drop trigger if exists life_recurring_transactions_category_owner on public.life_recurring_transactions;
drop function if exists public.life_check_category_owner();
update public.life_transactions set category = 'Otros' where category like 'c:%';
do $$ begin
  if to_regclass('public.life_recurring_transactions') is not null then
    update public.life_recurring_transactions set category = 'Otros' where category like 'c:%';
  end if;
end $$;
drop table if exists public.life_categories;
drop function if exists public.life_categories_rules();
commit;
