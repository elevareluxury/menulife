-- =============================================================================
-- Life OS — Ánimo del día y revisión semanal guiada
--
--   · life_daily_reviews.mood: el ánimo del cierre del día, de 1 ("muy mal") a 5 ("muy bien"). null = no contestó
--     (es opcional). Lo usan Insights y "Tu mes", sólo con datos reales y con mínimos.
--   · life_weekly_reviews: una fila por persona y semana (week_start = primer día de la semana según las
--     preferencias). wins = lo que salió bien (≤ 500), let_go = qué soltar (≤ 500), next_focus = hasta 3 cosas para la
--     semana que viene, con la misma forma que las prioridades de "Mi día" ({ id, kind: 'task', task_id } o
--     { id, kind: 'text', text, done }), closed_at = cuándo se terminó la revisión.
--   · RLS: sólo el dueño lee y escribe lo suyo.
--
-- Requiere 20261021000001_v1_daily_review.sql (life_daily_reviews y life_valid_priorities). Idempotente.
-- Vuelta atrás: docs/v1/sql/life_reflection_rollback.sql
-- =============================================================================

begin;

-- ── Ánimo del día ───────────────────────────────────────────────────────────────
alter table public.life_daily_reviews add column if not exists mood smallint;

alter table public.life_daily_reviews drop constraint if exists life_daily_reviews_mood_check;
alter table public.life_daily_reviews add constraint life_daily_reviews_mood_check check (mood is null or mood between 1 and 5);

-- ── Revisión semanal ────────────────────────────────────────────────────────────
create table if not exists public.life_weekly_reviews (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  week_start  date        not null,
  wins        text,
  let_go      text,
  next_focus  jsonb       not null default '[]'::jsonb,
  closed_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.life_weekly_reviews drop constraint if exists life_weekly_reviews_check;
alter table public.life_weekly_reviews add constraint life_weekly_reviews_check check (
  public.life_valid_priorities(next_focus)
  and (wins is null or char_length(wins) <= 500)
  and (let_go is null or char_length(let_go) <= 500)
);

alter table public.life_weekly_reviews enable row level security;
drop policy if exists life_weekly_reviews_owner on public.life_weekly_reviews;
create policy life_weekly_reviews_owner on public.life_weekly_reviews for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.life_weekly_reviews from anon;
grant select, insert, update, delete on public.life_weekly_reviews to authenticated;

create index if not exists idx_life_weekly_reviews_user_week on public.life_weekly_reviews (user_id, week_start desc);

notify pgrst, 'reload schema';

commit;
