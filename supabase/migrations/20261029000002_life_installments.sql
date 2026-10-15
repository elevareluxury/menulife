-- =============================================================================
-- Life OS · Dinero: compras en cuotas ("12 cuotas de $15.000").
--
--   · life_installment_plans: la compra (descripción, categoría, moneda, total, cantidad de cuotas 2–72, fecha de la
--     primera, meta opcional). last_no recuerda hasta qué cuota se cargó; cancelled_at corta las que faltan.
--   · life_transactions suma installment_plan_id + installment_no: cada cuota cargada queda marcada y un índice único
--     impide cargar dos veces la misma cuota.
--   · life_materialize_installments(p_today, p_tz): carga las cuotas vencidas hasta hoy (y no después de cancelled_at),
--     cada una el mismo día del mes que la primera (día 31 en un mes de 30 = último día), al mediodía de la zona.
--     Monto = total / cuotas redondeado a 2 decimales; la última ajusta la diferencia (la suma da exacto el total).
--     Como last_no avanza, una cuota que la persona borró no vuelve a aparecer.
--   · Total ≥ 1 por cuota (así ninguna cuota redondeada queda en 0). Hasta 200 compras por cuenta. La meta vinculada
--     tiene que ser propia (life_check_goal_owner). Sólo el dueño (RLS); la función es security invoker, como la de fijos.
--
-- Requiere 20261026000001_life_goal_owner.sql. Idempotente.
-- Vuelta atrás: docs/v1/sql/life_installments_rollback.sql
-- =============================================================================

begin;

create table if not exists public.life_installment_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  description   text check (description is null or char_length(description) <= 120),
  category      text check (category is null or char_length(category) <= 60),
  currency      text not null check (currency ~ '^[A-Z]{3}$'),
  total_amount  numeric(12,2) not null check (total_amount > 0),
  installments  smallint not null check (installments between 2 and 72),
  first_date    date not null check (first_date >= date '2000-01-01'),
  goal_id       uuid references public.life_goals(id) on delete set null,
  last_no       smallint not null default 0,
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  constraint life_installment_plans_min_amount check (total_amount >= installments),
  constraint life_installment_plans_last_no check (last_no between 0 and installments)
);

create index if not exists idx_lip_user on public.life_installment_plans(user_id);

alter table public.life_installment_plans enable row level security;
drop policy if exists lip_owner on public.life_installment_plans;
create policy lip_owner on public.life_installment_plans for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.life_installment_plans from anon;
grant select, insert, update, delete on public.life_installment_plans to authenticated;

-- Tope por cuenta
create or replace function public.life_installments_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.life_installment_plans where user_id = new.user_id) >= 200 then
    raise exception 'installments_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function public.life_installments_limit() from public, anon, authenticated;
drop trigger if exists life_installments_limit on public.life_installment_plans;
create trigger life_installments_limit before insert on public.life_installment_plans
  for each row execute function public.life_installments_limit();

-- Meta propia (función de 20261026000001)
drop trigger if exists life_installment_plans_goal_owner on public.life_installment_plans;
create trigger life_installment_plans_goal_owner before insert or update of goal_id, user_id on public.life_installment_plans
  for each row execute function public.life_check_goal_owner();

-- Cuotas cargadas
alter table public.life_transactions add column if not exists installment_plan_id uuid
  references public.life_installment_plans(id) on delete set null;
alter table public.life_transactions add column if not exists installment_no smallint;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'life_transactions_installment_no_check') then
    alter table public.life_transactions add constraint life_transactions_installment_no_check
      check (installment_no is null or installment_no between 1 and 72);
  end if;
end $$;
create unique index if not exists uq_lt_installment on public.life_transactions(installment_plan_id, installment_no)
  where installment_plan_id is not null;

-- Carga las cuotas vencidas (la llama la app al abrir Dinero)
create or replace function public.life_materialize_installments(p_today date, p_tz text default 'UTC')
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  r        record;
  v_today  date := p_today;
  v_tz     text := 'UTC';
  v_limit  date;
  v_base   numeric(12,2);
  v_amount numeric(12,2);
  v_day    int;
  v_month  date;
  v_due    date;
  v_no     int;
  v_last   int;
  v_ins    integer;
  n        integer := 0;
begin
  if auth.uid() is null then return 0; end if;
  -- La fecha del dispositivo puede diferir un día del servidor por la zona horaria; más que eso, no se acepta
  if v_today is null or v_today > current_date + 1 or v_today < current_date - 1 then v_today := current_date; end if;
  if p_tz is not null and exists (select 1 from pg_timezone_names where name = p_tz) then v_tz := p_tz; end if;

  for r in
    select * from public.life_installment_plans
    where user_id = auth.uid() and last_no < installments order by id for update
  loop
    v_limit := v_today;
    if r.cancelled_at is not null then v_limit := least(v_limit, (r.cancelled_at at time zone v_tz)::date); end if;
    v_base := round(r.total_amount / r.installments, 2);
    v_day  := extract(day from r.first_date)::int;
    v_no   := r.last_no + 1;
    v_last := r.last_no;
    while v_no <= r.installments loop
      v_month := (date_trunc('month', r.first_date) + make_interval(months => v_no - 1))::date;
      v_due := v_month + (least(v_day, extract(day from (v_month + interval '1 month' - interval '1 day'))::int) - 1);
      exit when v_due > v_limit;
      v_amount := case when v_no = r.installments then r.total_amount - v_base * (r.installments - 1) else v_base end;
      insert into public.life_transactions
        (user_id, type, amount, category, description, currency, goal_id, occurred_at, installment_plan_id, installment_no)
      values
        (r.user_id, 'expense', v_amount, coalesce(r.category, 'Otros'), r.description, r.currency, r.goal_id,
         (v_due + time '12:00') at time zone v_tz, r.id, v_no)
      on conflict (installment_plan_id, installment_no) where installment_plan_id is not null do nothing;
      get diagnostics v_ins = row_count;
      n := n + v_ins;
      v_last := v_no;
      v_no := v_no + 1;
    end loop;
    if v_last > r.last_no then
      update public.life_installment_plans set last_no = v_last where id = r.id;
    end if;
  end loop;
  return n;
end;
$$;

revoke all on function public.life_materialize_installments(date, text) from public, anon;
grant execute on function public.life_materialize_installments(date, text) to authenticated;

-- Categorías propias (20261029000001): una compra en cuotas sólo puede usar una categoría 'c:<id>' de la misma cuenta
do $$
begin
  if to_regprocedure('public.life_check_category_owner()') is not null then
    drop trigger if exists life_installment_plans_category_owner on public.life_installment_plans;
    create trigger life_installment_plans_category_owner before insert or update of category, user_id on public.life_installment_plans
      for each row execute function public.life_check_category_owner();
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
