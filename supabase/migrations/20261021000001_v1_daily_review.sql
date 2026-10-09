-- =============================================================================
-- Mycen V1 · Etapa 11 — Life OS: "Mi día" (mañana con foco y cierre del día)
--
--   · life_daily_reviews: una fila por persona y fecha local (date). priorities = hasta 3 prioridades, cada una
--     { id, kind: 'task', task_id } (una tarea de Brain: se cumple cuando se completa la tarea) o
--     { id, kind: 'text', text, done } (escrita al vuelo). reflection = "¿Cómo te fue hoy?" (≤ 280). closed_at = cuándo
--     se cerró el día.
--   · RLS: sólo el dueño lee y escribe lo suyo.
--
-- Requiere 20260615000001_create_life_os.sql. Idempotente.
-- Vuelta atrás: docs/v1/sql/11_rollback.sql
-- =============================================================================

begin;

create or replace function public.life_valid_priorities(p jsonb) returns boolean
language sql immutable as $$
  select case when jsonb_typeof(p) = 'array' and jsonb_array_length(p) <= 3 then not exists (
    select 1 from jsonb_array_elements(p) x
    where not case when jsonb_typeof(x) = 'object' then coalesce(
        jsonb_typeof(x -> 'id') = 'string' and char_length(x ->> 'id') between 1 and 64
        and not exists (select 1 from jsonb_object_keys(x) k where k not in ('id', 'kind', 'task_id', 'text', 'done'))
        and case x ->> 'kind'
          when 'task' then jsonb_typeof(x -> 'task_id') = 'string'
            and (x ->> 'task_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          when 'text' then jsonb_typeof(x -> 'text') = 'string' and char_length(btrim(x ->> 'text')) between 1 and 200
            and (not x ? 'done' or jsonb_typeof(x -> 'done') = 'boolean')
          else false
        end, false)
      else false end
  ) else false end
$$;

create table if not exists public.life_daily_reviews (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  date        date        not null,
  priorities  jsonb       not null default '[]'::jsonb,
  reflection  text,
  closed_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.life_daily_reviews drop constraint if exists life_daily_reviews_check;
alter table public.life_daily_reviews add constraint life_daily_reviews_check check (
  public.life_valid_priorities(priorities)
  and (reflection is null or char_length(reflection) <= 280)
);

alter table public.life_daily_reviews enable row level security;
drop policy if exists life_daily_reviews_owner on public.life_daily_reviews;
create policy life_daily_reviews_owner on public.life_daily_reviews for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.life_daily_reviews from anon;
grant select, insert, update, delete on public.life_daily_reviews to authenticated;

create index if not exists idx_life_daily_reviews_user_date on public.life_daily_reviews (user_id, date desc);

notify pgrst, 'reload schema';

commit;
