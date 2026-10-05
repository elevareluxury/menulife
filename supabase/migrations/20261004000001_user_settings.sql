-- ═══════════════════════════════════════════════════════════════════
-- MYCEN · Fase 1 — Preferencias de cuenta (idioma, moneda, zona horaria)
-- Privadas: cada usuario lee y edita solo las suyas.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.user_settings (
  user_id          uuid        primary key references auth.users(id) on delete cascade,
  language         text        not null default 'es'
                     check (language in ('es','en','pt','fr','de','it','zh','ja','ko','hi','ar','ru')),
  currency         text        not null default 'ARS'
                     check (currency ~ '^[A-Z]{3}$'),
  -- Monedas adicionales para Money (ej. USD si ganás en dólares). Máximo 5.
  extra_currencies text[]      not null default '{}'
                     check (cardinality(extra_currencies) <= 5
                            and array_to_string(extra_currencies, ',') ~ '^([A-Z]{3}(,[A-Z]{3})*)?$'),
  timezone         text,
  week_start       smallint    not null default 1 check (week_start in (0, 1)),  -- 0 domingo · 1 lunes
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "us_owner" on public.user_settings;
create policy "us_owner" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Misma función de updated_at que usan profiles y life_tasks
create or replace function public.mycen_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists user_settings_touch_updated_at on public.user_settings;
create trigger user_settings_touch_updated_at
  before update on public.user_settings
  for each row execute function public.mycen_touch_updated_at();

-- Los perfiles pueden tener cualquiera de los 12 idiomas como idioma original
alter table public.profiles drop constraint if exists profiles_default_locale_check;
alter table public.profiles add constraint profiles_default_locale_check
  check (default_locale in ('es','en','pt','fr','de','it','zh','ja','ko','hi','ar','ru'));

-- Verificación: tiene que devolver "user_settings ok"
select 'user_settings ok' as resultado
where exists (select 1 from information_schema.tables
              where table_schema = 'public' and table_name = 'user_settings');
