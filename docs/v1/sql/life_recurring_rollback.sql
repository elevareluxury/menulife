-- Vuelta atrás de 20261027000001_life_recurring_transactions.sql (los movimientos ya generados quedan como movimientos comunes)
begin;
drop function if exists public.life_materialize_recurring(date, text);
drop index if exists public.uq_lt_recurring_period;
alter table public.life_transactions drop constraint if exists life_transactions_recurring_period_check;
alter table public.life_transactions drop column if exists recurring_period;
alter table public.life_transactions drop column if exists recurring_id;
drop table if exists public.life_recurring_transactions;
drop function if exists public.life_recurring_limit();
commit;
