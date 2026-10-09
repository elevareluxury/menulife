-- Vuelta atrás de 20261020000001_v1_habits.sql (V1 · etapa 10). Los hábitos y sus registros quedan; se pierden
-- cantidad, unidad, ancla y recordatorio. Los hábitos "X veces por semana" vuelven a diarios.
begin;
update public.life_habits set frequency = '{"type":"daily","days":[0,1,2,3,4,5,6]}' where frequency ->> 'type' = 'times_per_week';
alter table public.life_habits drop constraint if exists life_habits_v1_check;
alter table public.life_habits drop constraint if exists life_habits_frequency_check;
alter table public.life_habit_logs drop constraint if exists life_habit_logs_value_check;
alter table public.life_habits drop column if exists target_value, drop column if exists unit, drop column if exists anchor,
  drop column if exists reminder_time, drop column if exists reminder_enabled;
alter table public.life_habit_logs drop column if exists value;
drop function if exists public.life_valid_habit_frequency(jsonb);
commit;
