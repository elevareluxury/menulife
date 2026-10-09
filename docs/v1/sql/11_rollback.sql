-- Vuelta atrás de 20261021000001_v1_daily_review.sql (V1 · etapa 11). Borra las prioridades y los cierres del día.
begin;
drop table if exists public.life_daily_reviews;
drop function if exists public.life_valid_priorities(jsonb);
commit;
