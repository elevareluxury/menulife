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
