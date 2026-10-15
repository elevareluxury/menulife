-- Life OS · gastos compartidos (life_splits).
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into life_transactions (id, user_id, amount, currency) values
  ('c1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1000, 'ARS'),
  ('c1000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 500, 'ARS'),
  ('c2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 300, 'ARS');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

-- Pagué yo la cena: Juan me debe la mitad; pagó Lu: le debo mi parte
insert into life_splits (id, transaction_id, person, direction, amount, currency, note) values
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Juan', 'owed_to_me', 500, 'ARS', 'Cena'),
  ('d1000000-0000-0000-0000-000000000002', null, 'Lu', 'i_owe', 33.33, 'USD', null);

do $$ begin
  assert (select user_id from life_splits where id = 'd1000000-0000-0000-0000-000000000001') = 'aaaaaaaa-0000-0000-0000-000000000001', 'user_id por defecto = auth.uid()';
  assert (select count(*) from life_splits where settled_at is null) = 2, 'dos pendientes';
end $$;

-- Saldar con el movimiento de la devolución
update life_splits set settled_at = now(), settlement_transaction_id = 'c1000000-0000-0000-0000-000000000002'
  where id = 'd1000000-0000-0000-0000-000000000001';

-- Borrar el movimiento deja la deuda (sin vínculo)
delete from life_transactions where id = 'c1000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select transaction_id from life_splits where id = 'd1000000-0000-0000-0000-000000000001') is null, 'on delete set null';
end $$;

-- Validaciones
do $$
declare
  bad text[] := array[
    $q$insert into life_splits (person, direction, amount, currency) values ('', 'owed_to_me', 10, 'ARS')$q$,
    $q$insert into life_splits (person, direction, amount, currency) values (' Juan', 'owed_to_me', 10, 'ARS')$q$,
    $q$insert into life_splits (person, direction, amount, currency) values (repeat('x', 41), 'owed_to_me', 10, 'ARS')$q$,
    $q$insert into life_splits (person, direction, amount, currency) values ('Juan', 'gift', 10, 'ARS')$q$,
    $q$insert into life_splits (person, direction, amount, currency) values ('Juan', 'i_owe', 0, 'ARS')$q$,
    $q$insert into life_splits (person, direction, amount, currency) values ('Juan', 'i_owe', -5, 'ARS')$q$,
    $q$insert into life_splits (person, direction, amount, currency) values ('Juan', 'i_owe', 10, 'ars')$q$,
    $q$insert into life_splits (person, direction, amount, currency, note) values ('Juan', 'i_owe', 10, 'ARS', repeat('x', 201))$q$,
    $q$insert into life_splits (person, direction, amount, currency, settlement_transaction_id) values ('Juan', 'i_owe', 10, 'ARS', 'c1000000-0000-0000-0000-000000000002')$q$
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

-- Movimiento ajeno: no (ni como gasto ni como saldo)
do $$ begin
  insert into life_splits (transaction_id, person, direction, amount, currency)
    values ('c2000000-0000-0000-0000-000000000001', 'Juan', 'owed_to_me', 10, 'ARS');
  raise exception 'debería fallar: movimiento ajeno';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  update life_splits set settlement_transaction_id = 'c2000000-0000-0000-0000-000000000001'
    where id = 'd1000000-0000-0000-0000-000000000001';
  raise exception 'debería fallar: saldo con movimiento ajeno';
exception when insufficient_privilege then null;
end $$;

-- Otra cuenta no ve, no cambia ni borra las cuentas de Ana, y no puede crear filas a nombre de Ana
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$
declare n int;
begin
  assert (select count(*) from life_splits) = 0, 'no ve cuentas ajenas';
  update life_splits set amount = 1;
  get diagnostics n = row_count;
  assert n = 0, 'no cambia cuentas ajenas';
  delete from life_splits;
  get diagnostics n = row_count;
  assert n = 0, 'no borra cuentas ajenas';
  begin
    insert into life_splits (user_id, person, direction, amount, currency)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'Juan', 'owed_to_me', 10, 'ARS');
    raise exception 'debería fallar: fila a nombre de otra cuenta';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Sin sesión, nada
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from life_splits;
    raise exception 'anon no debería poder leer';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
do $$ begin
  assert (select count(*) from life_splits) = 2, 'las filas de Ana siguen';
end $$;

rollback;
