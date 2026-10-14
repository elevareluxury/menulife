-- Life OS · gastos e ingresos fijos que se repiten cada mes.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into life_goals (id, user_id) values ('90000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

-- Alquiler el 31 desde hace 3 meses y medio; sueldo el día 1 desde hoy; uno en pausa
insert into life_recurring_transactions (id, type, amount, category, description, currency, day_of_month, starts_on) values
  ('a1000000-0000-0000-0000-000000000001', 'expense', 500000, 'Vivienda', 'Alquiler', 'ARS', 31, (date_trunc('month', current_date) - interval '3 months')::date),
  ('a1000000-0000-0000-0000-000000000002', 'income', 3000, 'Sueldo', null, 'USD', 1, current_date);
insert into life_recurring_transactions (id, type, amount, currency, day_of_month, starts_on, active) values
  ('a1000000-0000-0000-0000-000000000003', 'expense', 10, 'USD', 1, (current_date - 200), false);

do $$
declare
  first_run int;
  expected int;
begin
  first_run := life_materialize_recurring(current_date, 'America/Argentina/Buenos_Aires');
  -- Alquiler: los 3 meses anteriores siempre; este mes sólo si hoy es el último día. Sueldo: sólo si hoy es día 1.
  expected := 3
    + (case when current_date = (date_trunc('month', current_date) + interval '1 month - 1 day')::date then 1 else 0 end)
    + (case when extract(day from current_date) = 1 then 1 else 0 end);
  assert first_run = expected, format('cargó %s, se esperaban %s', first_run, expected);
  -- Día 31 en un mes de 30 (o febrero) = último día del mes, al mediodía de la zona
  assert (select bool_and(extract(day from (occurred_at at time zone 'America/Argentina/Buenos_Aires') + interval '1 day') = 1)
          from life_transactions where recurring_id = 'a1000000-0000-0000-0000-000000000001'), 'el 31 cae el último día';
  assert (select bool_and(extract(hour from occurred_at at time zone 'America/Argentina/Buenos_Aires') = 12)
          from life_transactions where recurring_id is not null), 'al mediodía local';
  assert not exists (select 1 from life_transactions where recurring_id = 'a1000000-0000-0000-0000-000000000003'), 'en pausa no carga';
  -- Otra vez: no duplica
  assert life_materialize_recurring(current_date, 'UTC') = 0, 'idempotente';
  -- Borrar uno generado no lo vuelve a cargar
  delete from life_transactions where recurring_id = 'a1000000-0000-0000-0000-000000000001'
    and recurring_period = to_char(current_date - interval '1 month', 'YYYY-MM');
  assert life_materialize_recurring(current_date, 'UTC') = 0, 'lo borrado no vuelve';
  -- Zona inválida o fecha absurda: se usa la del servidor sin fallar
  perform life_materialize_recurring(current_date + 400, 'Mars/Olympus');
end $$;

-- Validaciones
do $$
declare
  bad text[] := array[
    $q$insert into life_recurring_transactions (type, amount, currency, day_of_month, starts_on) values ('expense', 0, 'ARS', 5, current_date)$q$,
    $q$insert into life_recurring_transactions (type, amount, currency, day_of_month, starts_on) values ('expense', 10, 'ars', 5, current_date)$q$,
    $q$insert into life_recurring_transactions (type, amount, currency, day_of_month, starts_on) values ('expense', 10, 'ARS', 32, current_date)$q$,
    $q$insert into life_recurring_transactions (type, amount, currency, day_of_month, starts_on) values ('gift', 10, 'ARS', 5, current_date)$q$
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
  insert into life_recurring_transactions (type, amount, currency, day_of_month, starts_on, goal_id)
    values ('expense', 10, 'ARS', 5, current_date, '90000000-0000-0000-0000-00000000000b');
  raise exception 'debería fallar: meta ajena';
exception when insufficient_privilege then null;
end $$;

-- Otra cuenta no ve ni carga los fijos de Ana
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from life_recurring_transactions) = 0, 'no ve fijos ajenos';
  assert life_materialize_recurring(current_date, 'UTC') = 0, 'no carga fijos ajenos';
end $$;

-- Sin sesión, nada
reset role;
set local role anon;
do $$ begin
  begin
    perform life_materialize_recurring(current_date, 'UTC');
    raise exception 'anon no debería poder';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
