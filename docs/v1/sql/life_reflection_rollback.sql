-- Vuelta atrás de 20261030000002_life_reflection.sql. Borra las revisiones semanales y el ánimo de los cierres del día
-- (las prioridades, las reflexiones y los cierres quedan). life_valid_priorities sigue: la usa life_daily_reviews.
begin;
drop table if exists public.life_weekly_reviews;
alter table public.life_daily_reviews drop constraint if exists life_daily_reviews_mood_check;
alter table public.life_daily_reviews drop column if exists mood;
notify pgrst, 'reload schema';
commit;
