-- Vuelta atrás de 20261029000002_life_installments.sql (las cuotas ya cargadas quedan como movimientos comunes)
begin;
drop function if exists public.life_materialize_installments(date, text);
drop index if exists public.uq_lt_installment;
alter table public.life_transactions drop constraint if exists life_transactions_installment_no_check;
alter table public.life_transactions drop column if exists installment_no;
alter table public.life_transactions drop column if exists installment_plan_id;
drop table if exists public.life_installment_plans;
drop function if exists public.life_installments_limit();
commit;
