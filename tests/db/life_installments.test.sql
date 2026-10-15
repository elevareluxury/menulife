-- Life OS · compras en cuotas.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into life_goals (id, user_id) values ('90000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

insert into life_installment_plans (id, description, category, currency, total_amount, installments, first_date, cancelled_at) values
  -- 3 cuotas de 100: la primera hace dos meses (día 1) → las 3 vencidas
  ('c1000000-0000-0000-0000-000000000001', 'Heladera', 'Hogar', 'ARS', 100, 3, (date_trunc('month', current_date) - interval '2 months')::date, null),
  -- Día 31: en los meses cortos cae el último día
  ('c1000000-0000-0000-0000-000000000002', 'Celular', null, 'USD', 1000, 6, date '2025-01-31', null),
  -- Empieza en el futuro: nada
  ('c1000000-0000-0000-0000-000000000003', 'Viaje', null, 'ARS', 1200, 12, current_date + 10, null),
  -- Cancelada a mitad del mes -2: sólo las de los meses -5, -4, -3 y -2
  ('c1000000-0000-0000-0000-000000000004', 'Curso', null, 'ARS', 1200, 12, (date_trunc('month', current_date) - interval '5 months')::date,
    (date_trunc('month', current_date) - interval '2 months' + interval '14 days 12 hours')),
  -- En curso: 6 cuotas desde el mes pasado → 2 vencidas
  ('c1000000-0000-0000-0000-000000000005', 'Bici', null, 'ARS', 600, 6, (date_trunc('month', current_date) - interval '1 month')::date, null);

do $$
declare
  first_run int;
begin
  first_run := life_materialize_installments(current_date, 'America/Argentina/Buenos_Aires');
  assert first_run = 3 + 6 + 0 + 4 + 2, format('cargó %s, se esperaban 15', first_run);

  -- Monto: total / cuotas redondeado; la última ajusta los centavos y la suma da exacto
  assert (select array_agg(amount order by installment_no) from life_transactions where installment_plan_id = 'c1000000-0000-0000-0000-000000000001')
    = array[33.33, 33.33, 33.34]::numeric[], 'la última ajusta los centavos';
  assert (select sum(amount) from life_transactions where installment_plan_id = 'c1000000-0000-0000-0000-000000000002') = 1000, 'suma exacta';
  assert (select amount from life_transactions where installment_plan_id = 'c1000000-0000-0000-0000-000000000002' and installment_no = 6) = 166.65, 'última 166,65';
  -- Gasto con la categoría, moneda y descripción de la compra
  assert (select bool_and(type = 'expense' and category = 'Hogar' and description = 'Heladera' and currency = 'ARS')
          from life_transactions where installment_plan_id = 'c1000000-0000-0000-0000-000000000001'), 'datos de la compra';
  assert (select bool_and(category = 'Otros') from life_transactions where installment_plan_id = 'c1000000-0000-0000-0000-000000000002'), 'sin categoría = Otros';

  -- Mismo día del mes; el 31 cae el último día; al mediodía de la zona
  assert (select array_agg((occurred_at at time zone 'America/Argentina/Buenos_Aires')::date order by installment_no)
          from life_transactions where installment_plan_id = 'c1000000-0000-0000-0000-000000000002')
    = array['2025-01-31', '2025-02-28', '2025-03-31', '2025-04-30', '2025-05-31', '2025-06-30']::date[], 'fechas de cada cuota';
  assert (select bool_and(extract(hour from occurred_at at time zone 'America/Argentina/Buenos_Aires') = 12)
          from life_transactions where installment_plan_id is not null), 'al mediodía local';

  -- last_no queda al día
  assert (select last_no from life_installment_plans where id = 'c1000000-0000-0000-0000-000000000001') = 3, 'last_no completa';
  assert (select last_no from life_installment_plans where id = 'c1000000-0000-0000-0000-000000000003') = 0, 'futura sin cargar';
  assert (select last_no from life_installment_plans where id = 'c1000000-0000-0000-0000-000000000004') = 4, 'cancelada: hasta la fecha de corte';

  -- Otra vez: no duplica
  assert life_materialize_installments(current_date, 'UTC') = 0, 'idempotente';

  -- Borrar una cuota cargada no la vuelve a cargar
  delete from life_transactions where installment_plan_id = 'c1000000-0000-0000-0000-000000000005' and installment_no = 2;
  assert life_materialize_installments(current_date, 'UTC') = 0, 'lo borrado no vuelve';

  -- Cancelar las que faltan: no carga más aunque pase el tiempo
  update life_installment_plans set cancelled_at = now() where id = 'c1000000-0000-0000-0000-000000000005';
  assert life_materialize_installments(current_date + 1, 'UTC') = 0, 'cancelada no carga más';

  -- La misma cuota dos veces: no
  begin
    insert into life_transactions (user_id, type, amount, category, currency, occurred_at, installment_plan_id, installment_no)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'expense', 1, 'Otros', 'ARS', now(), 'c1000000-0000-0000-0000-000000000001', 1);
    raise exception 'debería fallar: cuota duplicada';
  exception when unique_violation then null;
  end;

  -- Borrar la compra deja las cuotas como movimientos comunes
  delete from life_installment_plans where id = 'c1000000-0000-0000-0000-000000000004';
  assert (select count(*) from life_transactions where description = 'Curso' and installment_plan_id is null) = 4, 'quedan sin plan';

  -- Zona inválida o fecha absurda: se usa la del servidor sin fallar
  perform life_materialize_installments(current_date + 400, 'Mars/Olympus');
end $$;

-- Validaciones
do $$
declare
  bad text[] := array[
    $q$insert into life_installment_plans (currency, total_amount, installments, first_date) values ('ARS', 100, 1, current_date)$q$,
    $q$insert into life_installment_plans (currency, total_amount, installments, first_date) values ('ARS', 1000, 73, current_date)$q$,
    $q$insert into life_installment_plans (currency, total_amount, installments, first_date) values ('ARS', 0, 3, current_date)$q$,
    $q$insert into life_installment_plans (currency, total_amount, installments, first_date) values ('ARS', 5, 6, current_date)$q$,
    $q$insert into life_installment_plans (currency, total_amount, installments, first_date) values ('ars', 100, 3, current_date)$q$,
    $q$insert into life_installment_plans (currency, total_amount, installments, first_date, last_no) values ('ARS', 100, 3, current_date, 4)$q$,
    $q$insert into life_installment_plans (currency, total_amount, installments, first_date, description) values ('ARS', 100, 3, current_date, repeat('x', 121))$q$,
    $q$update life_transactions set installment_no = 73 where installment_plan_id is not null$q$
  ];
  i int;
begin
  for i in 1 .. array_length(bad, 1) loop
    begin
      execute bad[i];
      raise exception 'debería fallar: %', bad[i];
    exception when check_violation then null;
    end;
  end loop;
end $$;

-- Meta ajena: no
do $$ begin
  insert into life_installment_plans (currency, total_amount, installments, first_date, goal_id)
    values ('ARS', 100, 3, current_date, '90000000-0000-0000-0000-00000000000b');
  raise exception 'debería fallar: meta ajena';
exception when insufficient_privilege then null;
end $$;

-- Otra cuenta no ve ni carga las compras de Ana
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from life_installment_plans) = 0, 'no ve compras ajenas';
  assert life_materialize_installments(current_date, 'UTC') = 0, 'no carga compras ajenas';
  update life_installment_plans set cancelled_at = now();
  delete from life_installment_plans;
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert (select count(*) from life_installment_plans where cancelled_at is null) = 3, 'otra cuenta no toca nada';
end $$;

-- Sin sesión, nada
reset role;
set local role anon;
do $$ begin
  begin
    perform life_materialize_installments(current_date, 'UTC');
    raise exception 'anon no debería poder';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from life_installment_plans;
    raise exception 'anon no debería leer';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
