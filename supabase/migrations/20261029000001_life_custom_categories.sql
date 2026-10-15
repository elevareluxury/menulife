-- =============================================================================
-- Life OS · Dinero: categorías propias (además de las fijas: Comida, Vivienda, Sueldo…).
--
--   · life_categories: de cada cuenta; tipo (income/expense), nombre (1–40, sin espacios al borde), color de la
--     paleta de Life OS (#RRGGBB) e ícono opcional. No se borran: se archivan (archived_at) y los movimientos viejos
--     siguen mostrando su nombre.
--   · Nombre único por cuenta y tipo (sin distinguir mayúsculas) entre las no archivadas.
--   · Tope: 50 sin archivar y 200 en total por cuenta.
--   · Un movimiento (o un fijo) guarda una categoría propia como 'c:' || id en category (el tipo de la columna no
--     cambia). Un trigger exige que sea de la misma cuenta.
--
-- Idempotente. Vuelta atrás: docs/v1/sql/life_custom_categories_rollback.sql
-- =============================================================================

begin;

create table if not exists public.life_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  name        text not null check (char_length(name) between 1 and 40 and name = btrim(name)),
  color       text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon        text check (icon is null or char_length(icon) between 1 and 40),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_lcat_user on public.life_categories(user_id);
create unique index if not exists uq_lcat_name on public.life_categories(user_id, type, lower(name))
  where archived_at is null;

alter table public.life_categories enable row level security;
drop policy if exists lcat_owner on public.life_categories;
create policy lcat_owner on public.life_categories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.life_categories from anon;
grant select, insert, update, delete on public.life_categories to authenticated;

-- Tope por cuenta (al crear y al restaurar una archivada) + updated_at
create or replace function public.life_categories_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if new.user_id <> old.user_id then
      raise exception 'category_owner' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.life_categories where user_id = new.user_id) >= 200 then
    raise exception 'category_limit' using errcode = 'check_violation';
  end if;
  if new.archived_at is null and (tg_op = 'INSERT' or old.archived_at is not null)
    and (select count(*) from public.life_categories where user_id = new.user_id and archived_at is null) >= 50 then
    raise exception 'category_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function public.life_categories_rules() from public, anon, authenticated;
drop trigger if exists life_categories_rules on public.life_categories;
create trigger life_categories_rules before insert or update on public.life_categories
  for each row execute function public.life_categories_rules();

-- Una categoría propia en un movimiento o un fijo tiene que ser de la misma cuenta
create or replace function public.life_check_category_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category is not null and new.category like 'c:%' then
    if new.category !~ '^c:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or not exists (
      select 1 from public.life_categories c where c.id = substr(new.category, 3)::uuid and c.user_id = new.user_id
    ) then
      raise exception 'category_not_owned' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.life_check_category_owner() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['life_transactions', 'life_recurring_transactions'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists %I on public.%I', t || '_category_owner', t);
    execute format('create trigger %I before insert or update of category, user_id on public.%I
      for each row execute function public.life_check_category_owner()', t || '_category_owner', t);
  end loop;
end $$;

commit;
