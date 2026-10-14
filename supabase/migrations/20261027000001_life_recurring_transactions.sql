-- =============================================================================
-- Life OS · Dinero: gastos e ingresos fijos que se repiten cada mes (alquiler, sueldo, suscripciones).
--
--   · life_recurring_transactions: la "plantilla" (tipo, importe, moneda, categoría, descripción, meta, día del mes).
--   · life_transactions suma recurring_id + recurring_period ('YYYY-MM'): cada mes generado queda marcado, y un
--     índice único impide cargar dos veces el mismo mes.
--   · life_materialize_recurring(p_today, p_tz): carga lo que ya venció (día 31 en un mes de 30 = último día),
--     sólo de la cuenta que llama (RLS), hasta 12 meses hacia atrás. last_period recuerda hasta dónde se cargó:
--     si la persona borra un movimiento generado, no vuelve a aparecer.
--   · Hasta 100 fijos por cuenta. La meta vinculada tiene que ser propia (life_check_goal_owner).
--
-- Requiere 20261026000001_life_goal_owner.sql. Idempotente.
-- Vuelta atrás: docs/v1/sql/life_recurring_rollback.sql
-- =============================================================================

begin;

create table if not exists public.life_recurring_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type         text not null check (type in ('income', 'expense')),
  amount       numeric(12,2) not null check (amount > 0),
  category     text check (category is null or char_length(category) <= 60),
  description  text check (description is null or char_length(description) <= 120),
  currency     text not null check (currency ~ '^[A-Z]{3}$'),
  goal_id      uuid references public.life_goals(id) on delete set null,
  day_of_month smallint not null check (day_of_month between 1 and 31),
  starts_on    date not null,
  last_period  text check (last_period is null or last_period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_lrt_user on public.life_recurring_transactions(user_id);

alter table public.life_recurring_transactions enable row level security;
drop policy if exists lrt_owner on public.life_recurring_transactions;
create policy lrt_owner on public.life_recurring_transactions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.life_recurring_transactions from anon;
grant select, insert, update, delete on public.life_recurring_transactions to authenticated;

-- Tope por cuenta
create or replace function public.life_recurring_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.life_recurring_transactions where user_id = new.user_id) >= 100 then
    raise exception 'recurring_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function public.life_recurring_limit() from public, anon, authenticated;
drop trigger if exists life_recurring_limit on public.life_recurring_transactions;
create trigger life_recurring_limit before insert on public.life_recurring_transactions
  for each row execute function public.life_recurring_limit();

-- Meta propia (función de 20261026000001)
drop trigger if exists life_recurring_transactions_goal_owner on public.life_recurring_transactions;
create trigger life_recurring_transactions_goal_owner before insert or update of goal_id, user_id on public.life_recurring_transactions
  for each row execute function public.life_check_goal_owner();

-- Movimientos generados
alter table public.life_transactions add column if not exists recurring_id uuid
  references public.life_recurring_transactions(id) on delete set null;
alter table public.life_transactions add column if not exists recurring_period text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'life_transactions_recurring_period_check') then
    alter table public.life_transactions add constraint life_transactions_recurring_period_check
      check (recurring_period is null or recurring_period ~ '^\d{4}-(0[1-9]|1[0-2])$');
  end if;
end $$;
create unique index if not exists uq_lt_recurring_period on public.life_transactions(recurring_id, recurring_period)
  where recurring_id is not null;

-- Carga lo vencido (la llama la app al abrir Dinero o Mi día)
create or replace function public.life_materialize_recurring(p_today date, p_tz text default 'UTC')
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  r       record;
  v_today date := p_today;
  v_tz    text := 'UTC';
  v_month date;
  v_last  date;
  v_due   date;
  v_ins   integer;
  n       integer := 0;
begin
  if auth.uid() is null then return 0; end if;
  -- La fecha del dispositivo puede diferir un día del servidor por la zona horaria; más que eso, no se acepta
  if v_today is null or v_today > current_date + 1 or v_today < current_date - 1 then v_today := current_date; end if;
  if p_tz is not null and exists (select 1 from pg_timezone_names where name = p_tz) then v_tz := p_tz; end if;

  for r in
    select * from public.life_recurring_transactions where user_id = auth.uid() and active order by id for update
  loop
    v_month := greatest(date_trunc('month', r.starts_on), date_trunc('month', v_today) - interval '12 months')::date;
    if r.last_period is not null then
      v_month := greatest(v_month, (to_date(r.last_period || '-01', 'YYYY-MM-DD') + interval '1 month')::date);
    end if;
    v_last := null;
    while v_month <= date_trunc('month', v_today)::date loop
      v_due := v_month + (least(r.day_of_month, extract(day from (v_month + interval '1 month' - interval '1 day'))::int) - 1);
      exit when v_due > v_today;
      if v_due >= r.starts_on then
        insert into public.life_transactions
          (user_id, type, amount, category, description, currency, goal_id, occurred_at, recurring_id, recurring_period)
        values
          (r.user_id, r.type, r.amount, r.category, r.description, r.currency, r.goal_id,
           (v_due + time '12:00') at time zone v_tz, r.id, to_char(v_month, 'YYYY-MM'))
        on conflict (recurring_id, recurring_period) where recurring_id is not null do nothing;
        get diagnostics v_ins = row_count;
        n := n + v_ins;
      end if;
      v_last := v_month;
      v_month := (v_month + interval '1 month')::date;
    end loop;
    if v_last is not null then
      update public.life_recurring_transactions set last_period = to_char(v_last, 'YYYY-MM') where id = r.id;
    end if;
  end loop;
  return n;
end;
$$;

revoke all on function public.life_materialize_recurring(date, text) from public, anon;
grant execute on function public.life_materialize_recurring(date, text) to authenticated;

notify pgrst, 'reload schema';

commit;
