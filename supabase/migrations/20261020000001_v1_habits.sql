-- =============================================================================
-- Mycen V1 · Etapa 10 — Life OS: hábitos que se adaptan a la vida real
--
--   · life_habits: target_value (null = sí/no), unit (≤ 20), anchor ("después de…", ≤ 60), reminder_time y
--     reminder_enabled. frequency admite además { type: 'times_per_week', times: 1..7 }.
--   · life_habit_logs.value (default 1): con cantidad, el día se cumple cuando value >= target_value.
--   · Los hábitos de antes ({ type: 'daily'|'weekly', days }) siguen igual. El check de frequency se agrega NOT VALID:
--     valida lo nuevo sin frenar la migración por datos viejos raros.
--   · La RLS de siempre (cada uno lo suyo) no cambia.
--
-- Requiere 20260615000001_create_life_os.sql. Idempotente.
-- Vuelta atrás: docs/v1/sql/10_rollback.sql
-- =============================================================================

begin;

alter table public.life_habits
  add column if not exists target_value     numeric,
  add column if not exists unit             text,
  add column if not exists anchor           text,
  add column if not exists reminder_time    time,
  add column if not exists reminder_enabled boolean not null default false;

alter table public.life_habit_logs
  add column if not exists value numeric not null default 1;

create or replace function public.life_valid_habit_frequency(f jsonb) returns boolean
language sql immutable as $$
  select case when jsonb_typeof(f) <> 'object' then false else coalesce(
    case f ->> 'type'
      when 'times_per_week' then jsonb_typeof(f -> 'times') = 'number' and (f ->> 'times') ~ '^[1-7]$'
      when 'daily' then true
      when 'weekly' then true
      else false
    end
    and (not f ? 'days' or case when jsonb_typeof(f -> 'days') = 'array' then
         jsonb_array_length(f -> 'days') <= 7
         and not exists (select 1 from jsonb_array_elements(f -> 'days') d where d::text !~ '^[0-6]$')
         else false end), false) end
$$;

alter table public.life_habits drop constraint if exists life_habits_v1_check;
alter table public.life_habits add constraint life_habits_v1_check check (
  (target_value is null or (target_value > 0 and target_value <= 100000))
  and (unit is null or char_length(unit) <= 20)
  and (anchor is null or char_length(anchor) <= 60)
  and (not reminder_enabled or reminder_time is not null)
);
alter table public.life_habits drop constraint if exists life_habits_frequency_check;
alter table public.life_habits add constraint life_habits_frequency_check
  check (public.life_valid_habit_frequency(frequency)) not valid;

alter table public.life_habit_logs drop constraint if exists life_habit_logs_value_check;
alter table public.life_habit_logs add constraint life_habit_logs_value_check check (value > 0 and value <= 100000);

commit;
