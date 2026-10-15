-- Life OS: presupuestos, ánimo y revisión semanal, "¿por qué lo hago?" y diario privado.
-- Pegar entero en Supabase → SQL Editor → Run. Son las 4 migraciones 20261030000001…4 en orden (se pueden correr más de una vez).

-- ===== 20261030000001_life_budgets =====
-- =============================================================================
-- Life OS · Dinero: presupuestos amables (un tope mensual por categoría de gasto, en una moneda).
--
--   · life_budgets: de cada cuenta; categoría (fija, como 'Comida', o propia, 'c:' || id), moneda (ISO, 3 letras) y
--     monto (> 0). Vale para todos los meses: lo gastado se calcula en el dispositivo con los movimientos del mes.
--   · Uno por categoría y moneda (nunca se suman monedas distintas).
--   · Una categoría propia tiene que ser de la misma cuenta (trigger life_check_category_owner, de
--     20261029000001_life_custom_categories.sql).
--   · RLS: sólo el dueño. Tope: 60 por cuenta.
--
-- Idempotente. Vuelta atrás: docs/v1/sql/life_budgets_rollback.sql
-- =============================================================================

begin;

create table if not exists public.life_budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category    text not null check (char_length(category) between 1 and 60 and category = btrim(category)),
  currency    text not null check (currency ~ '^[A-Z]{3}$'),
  amount      numeric(12,2) not null check (amount > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists uq_life_budgets on public.life_budgets(user_id, category, currency);

alter table public.life_budgets enable row level security;
drop policy if exists life_budgets_owner on public.life_budgets;
create policy life_budgets_owner on public.life_budgets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.life_budgets from anon;
grant select, insert, update, delete on public.life_budgets to authenticated;

-- Tope por cuenta + updated_at + la cuenta no cambia
create or replace function public.life_budgets_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if new.user_id <> old.user_id then
      raise exception 'budget_owner' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.life_budgets where user_id = new.user_id) >= 60 then
    raise exception 'budget_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function public.life_budgets_rules() from public, anon, authenticated;
drop trigger if exists life_budgets_rules on public.life_budgets;
create trigger life_budgets_rules before insert or update on public.life_budgets
  for each row execute function public.life_budgets_rules();

-- Categoría propia: de la misma cuenta (misma función que movimientos y fijos)
drop trigger if exists life_budgets_category_owner on public.life_budgets;
create trigger life_budgets_category_owner before insert or update of category, user_id on public.life_budgets
  for each row execute function public.life_check_category_owner();

notify pgrst, 'reload schema';

commit;

-- ===== 20261030000002_life_reflection =====
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

-- ===== 20261030000003_life_why =====
-- =============================================================================
-- Life OS · "¿Por qué lo hago?": cada hábito y cada meta puede guardar su propia frase ("¿Por qué es importante
-- para vos?"). Opcional, hasta 200 caracteres y sin quedar en blanco (vacío = null). La app la muestra en la ficha,
-- antes de archivar o borrar ("Lo empezaste porque: …") y en "Qué bueno verte de vuelta".
--
-- Sólo suma una columna por tabla: la RLS de cada una (cada cuenta lo suyo) no cambia, y exportar/borrar Life OS
-- ya incluye estas tablas enteras. Idempotente.
-- Vuelta atrás: docs/v1/sql/life_why_rollback.sql
-- =============================================================================

begin;

do $$
declare t text;
begin
  foreach t in array array['life_habits', 'life_goals'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I add column if not exists why text', t);
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_why_check');
    execute format('alter table public.%I add constraint %I check (why is null or (char_length(why) <= 200 and btrim(why) <> %L))',
      t, t || '_why_check', '');
  end loop;
end $$;

commit;

-- ===== 20261030000004_life_journal =====
-- =============================================================================
-- Life OS · Diario privado (V1.1, FEATURES.journal).
--
--   · life_journal_entries: de cada cuenta; fecha del día (entry_date, local de la persona) y texto libre
--     (1–10.000 caracteres, no sólo espacios). Puede haber varias por día.
--   · Sólo la dueña lee, escribe, cambia y borra (RLS). Nadie más: ni anon, ni otras cuentas.
--   · Topes: 20 entradas por día y 20.000 en total por cuenta. Fecha entre 1900-01-01 y mañana (la zona horaria de
--     la persona puede ir adelantada respecto del servidor).
--   · El bloqueo (PIN o huella/cara) vive en el dispositivo: la base no sabe nada de él.
--   · Ninguna RPC pública, búsqueda general, Insights, Replay, métricas ni el link de calendario leen esta tabla.
--     Se exporta con "Tus datos" y se borra con "Borrar Life OS" y con la cuenta (FK en cascada).
--
-- Idempotente. Vuelta atrás: docs/v1/sql/life_journal_rollback.sql
-- =============================================================================

begin;

create table if not exists public.life_journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null,
  body       text not null check (char_length(body) between 1 and 10000 and btrim(body) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ljournal_user_date on public.life_journal_entries(user_id, entry_date desc, created_at desc);

alter table public.life_journal_entries enable row level security;
drop policy if exists ljournal_owner on public.life_journal_entries;
create policy ljournal_owner on public.life_journal_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.life_journal_entries from anon;
grant select, insert, update, delete on public.life_journal_entries to authenticated;

-- Fecha válida, topes por día y por cuenta, dueña fija y updated_at
create or replace function public.life_journal_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.entry_date < date '1900-01-01' or new.entry_date > current_date + 1 then
    raise exception 'journal_date' using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.created_at := old.created_at;
    if new.user_id <> old.user_id then
      raise exception 'journal_owner' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.life_journal_entries where user_id = new.user_id) >= 20000 then
    raise exception 'journal_limit' using errcode = 'check_violation';
  end if;
  if (tg_op = 'INSERT' or new.entry_date <> old.entry_date)
    and (select count(*) from public.life_journal_entries
         where user_id = new.user_id and entry_date = new.entry_date and id <> new.id) >= 20 then
    raise exception 'journal_day_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function public.life_journal_rules() from public, anon, authenticated;
drop trigger if exists life_journal_rules on public.life_journal_entries;
create trigger life_journal_rules before insert or update on public.life_journal_entries
  for each row execute function public.life_journal_rules();

commit;

