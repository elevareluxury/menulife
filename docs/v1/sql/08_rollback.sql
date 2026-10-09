-- Vuelta atrás de 20261018000001_v1_referrals.sql (V1 · etapa 08). Borra las atribuciones de "Creá tu identidad".
begin;
drop function if exists public.record_referral(text, text);
drop table if exists public.referrals;
commit;
