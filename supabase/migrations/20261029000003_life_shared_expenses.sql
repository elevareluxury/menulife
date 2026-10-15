-- =============================================================================
-- Life OS · Dinero: gastos compartidos ("pagué yo la cena, la mitad es de Juan") y quién le debe a quién.
--
--   · El movimiento sigue registrando lo que salió de tu bolsillo (o tu parte, si pagó otra persona).
--     Las deudas van aparte, en life_splits: una fila por persona y movimiento.
--       direction 'owed_to_me' = esa persona te debe; 'i_owe' = le debés vos.
--   · Saldar = settled_at (y, si se registró el movimiento real, settlement_transaction_id).
--   · Un movimiento vinculado (transaction_id o settlement_transaction_id) tiene que ser de la misma cuenta
--     (life_split_check_tx). Si se borra el movimiento, la deuda queda (on delete set null).
--   · RLS: sólo el dueño. Hasta 5000 filas por cuenta.
--
-- Idempotente. Vuelta atrás: docs/v1/sql/life_shared_expenses_rollback.sql
-- =============================================================================

begin;

create table if not exists public.life_splits (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  transaction_id            uuid references public.life_transactions(id) on delete set null,
  person                    text not null check (char_length(person) between 1 and 40 and person = btrim(person)),
  direction                 text not null check (direction in ('owed_to_me', 'i_owe')),
  amount                    numeric(12,2) not null check (amount > 0),
  currency                  text not null check (currency ~ '^[A-Z]{3}$'),
  note                      text check (note is null or char_length(note) <= 200),
  settled_at                timestamptz,
  settlement_transaction_id uuid references public.life_transactions(id) on delete set null,
  created_at                timestamptz not null default now(),
  constraint life_splits_settlement_needs_settled check (settlement_transaction_id is null or settled_at is not null)
);

create index if not exists idx_life_splits_user on public.life_splits(user_id, settled_at);
create index if not exists idx_life_splits_tx on public.life_splits(transaction_id) where transaction_id is not null;
create index if not exists idx_life_splits_settlement on public.life_splits(settlement_transaction_id) where settlement_transaction_id is not null;

alter table public.life_splits enable row level security;
drop policy if exists life_splits_owner on public.life_splits;
create policy life_splits_owner on public.life_splits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.life_splits from anon;
grant select, insert, update, delete on public.life_splits to authenticated;

-- Movimientos vinculados: sólo de la misma cuenta
create or replace function public.life_split_check_tx()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.transaction_id is not null and not exists (
    select 1 from public.life_transactions t where t.id = new.transaction_id and t.user_id = new.user_id
  ) then
    raise exception 'transaction_not_owned' using errcode = '42501';
  end if;
  if new.settlement_transaction_id is not null and not exists (
    select 1 from public.life_transactions t where t.id = new.settlement_transaction_id and t.user_id = new.user_id
  ) then
    raise exception 'transaction_not_owned' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.life_split_check_tx() from public, anon, authenticated;
drop trigger if exists life_splits_tx_owner on public.life_splits;
create trigger life_splits_tx_owner before insert or update of transaction_id, settlement_transaction_id, user_id on public.life_splits
  for each row execute function public.life_split_check_tx();

-- Tope por cuenta
create or replace function public.life_splits_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.life_splits where user_id = new.user_id) >= 5000 then
    raise exception 'splits_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function public.life_splits_limit() from public, anon, authenticated;
drop trigger if exists life_splits_limit on public.life_splits;
create trigger life_splits_limit before insert on public.life_splits
  for each row execute function public.life_splits_limit();

notify pgrst, 'reload schema';

commit;
