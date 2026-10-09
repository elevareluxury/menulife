-- =============================================================================
-- Mycen V1 · Etapa 10 — Life OS: hábitos que se adaptan a la vida real
--
--   · life_habits: target_value (null = sí/no), unit (≤ 20), anchor ("después de…", ≤ 60), reminder_time y
--     reminder_enabled. frequency admite además { type: 'times_per_week', times: 1..7 }.
--   · life_habit_logs.value (default 1): con cantidad, el día se cumple cuando value >= target_value.
--   · Los hábitos de antes ({ type: 'daily'|'weekly', days }) siguen igual. El check de frequency se agrega NOT VALID:
--     valida lo nuevo sin frenar la migración por datos viejos raros.
--   · La RLS de siempre (cada uno lo suyo) no cambia.
--   · Si una base no tiene las tablas de hábitos (la migración de Life OS de junio se aplicó a medias), las crea con
--     la misma definición y RLS que 20260615000001_create_life_os.sql.
--
-- Requiere 20260615000001_create_life_os.sql. Idempotente.
-- Vuelta atrás: docs/v1/sql/10_rollback.sql
-- =============================================================================

begin;

-- ─── 0. Tablas de hábitos (por si faltan) ────────────────────────────────────

create table if not exists public.life_habits (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  icon       text        not null default 'CheckCircle',
  color      text        not null default '#F4705A',
  frequency  jsonb       not null default '{"type":"daily","days":[0,1,2,3,4,5,6]}',
  is_active  boolean     not null default true,
  sort_order int         not null default 0,
  created_at timestamptz not null default now()
);
alter table public.life_habits enable row level security;
drop policy if exists "lh_owner" on public.life_habits;
create policy "lh_owner" on public.life_habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists idx_lh_user on public.life_habits(user_id, is_active, sort_order);

create table if not exists public.life_habit_logs (
  id             uuid        default gen_random_uuid() primary key,
  habit_id       uuid        not null references public.life_habits(id) on delete cascade,
  user_id        uuid        not null references auth.users(id) on delete cascade,
  completed_date date        not null,
  created_at     timestamptz not null default now(),
  unique (habit_id, completed_date)
);
alter table public.life_habit_logs enable row level security;
drop policy if exists "lhl_owner" on public.life_habit_logs;
create policy "lhl_owner" on public.life_habit_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists idx_lhl_user_date on public.life_habit_logs(user_id, completed_date desc);
create index if not exists idx_lhl_habit_date on public.life_habit_logs(habit_id, completed_date desc);

-- Vínculo con metas (20261006000001), sólo si existe la tabla de metas
do $$ begin
  if to_regclass('public.life_goals') is not null then
    alter table public.life_habits add column if not exists goal_id uuid references public.life_goals(id) on delete set null;
    create index if not exists idx_life_habits_goal on public.life_habits(goal_id) where goal_id is not null;
  end if;
end $$;

-- ─── 1. Cantidad, ancla, recordatorio y "X veces por semana" ─────────────────

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

-- Que la API vea enseguida las tablas y columnas nuevas
notify pgrst, 'reload schema';

commit;
