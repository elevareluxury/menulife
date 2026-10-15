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
