-- Life OS · Dinero: presupuestos (life_budgets).
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into life_categories (id, user_id, type, name, color) values
  ('c1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 'Mascotas', '#22C55E'),
  ('c2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'expense', 'Plantas', '#3B82F6');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

-- Una fija, la misma en otra moneda y una propia
insert into life_budgets (id, category, currency, amount) values
  ('d1000000-0000-0000-0000-000000000001', 'Comida', 'ARS', 150000),
  ('d1000000-0000-0000-0000-000000000002', 'Comida', 'USD', 120.50),
  ('d1000000-0000-0000-0000-000000000003', 'c:c1000000-0000-0000-0000-000000000001', 'ARS', 20000);

do $$ begin
  assert (select user_id from life_budgets where id = 'd1000000-0000-0000-0000-000000000001') = 'aaaaaaaa-0000-0000-0000-000000000001', 'user_id por defecto = auth.uid()';
  assert (select count(*) from life_budgets) = 3, 'tres presupuestos';
end $$;

-- Editar el monto mueve updated_at
update life_budgets set updated_at = now() - interval '1 day' where id = 'd1000000-0000-0000-0000-000000000001';
update life_budgets set amount = 160000 where id = 'd1000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select amount from life_budgets where id = 'd1000000-0000-0000-0000-000000000001') = 160000, 'monto editado';
  assert (select updated_at > now() - interval '1 hour' from life_budgets where id = 'd1000000-0000-0000-0000-000000000001'), 'updated_at al día';
end $$;

-- Uno por categoría y moneda
do $$ begin
  insert into life_budgets (category, currency, amount) values ('Comida', 'ARS', 5);
  raise exception 'debería fallar: repetido';
exception when unique_violation then null;
end $$;

-- Validaciones
do $$
declare
  bad text[] := array[
    $q$insert into life_budgets (category, currency, amount) values ('', 'ARS', 10)$q$,
    $q$insert into life_budgets (category, currency, amount) values (' Ocio', 'ARS', 10)$q$,
    $q$insert into life_budgets (category, currency, amount) values (repeat('x', 61), 'ARS', 10)$q$,
    $q$insert into life_budgets (category, currency, amount) values ('Ocio', 'ars', 10)$q$,
    $q$insert into life_budgets (category, currency, amount) values ('Ocio', 'PESOS', 10)$q$,
    $q$insert into life_budgets (category, currency, amount) values ('Ocio', 'ARS', 0)$q$,
    $q$insert into life_budgets (category, currency, amount) values ('Ocio', 'ARS', -5)$q$,
    $q$update life_budgets set amount = 0 where id = 'd1000000-0000-0000-0000-000000000001'$q$
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

-- Categoría propia ajena o mal escrita: no
do $$
declare
  bad text[] := array[
    $q$insert into life_budgets (category, currency, amount) values ('c:c2000000-0000-0000-0000-000000000001', 'ARS', 10)$q$,
    $q$insert into life_budgets (category, currency, amount) values ('c:no-es-un-id', 'ARS', 10)$q$,
    $q$update life_budgets set category = 'c:c2000000-0000-0000-0000-000000000001' where id = 'd1000000-0000-0000-0000-000000000003'$q$
  ];
  i int;
begin
  for i in 1 .. array_length(bad, 1) loop
    begin
      execute bad[i];
      raise exception 'debería fallar: %', bad[i];
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;

-- Tope: 60 por cuenta
do $$
declare i int;
begin
  for i in 1 .. 57 loop
    insert into life_budgets (category, currency, amount) values ('Ocio', chr(65 + i / 26) || chr(65 + i % 26) || 'Z', 10);
  end loop;
  assert (select count(*) from life_budgets) = 60, 'sesenta';
  begin
    insert into life_budgets (category, currency, amount) values ('Salud', 'ARS', 10);
    raise exception 'debería fallar: tope';
  exception when check_violation then
    assert sqlerrm = 'budget_limit', 'mensaje del tope';
  end;
  delete from life_budgets where currency like '%Z' and category = 'Ocio';
end $$;

-- Otra cuenta no ve, no cambia ni borra los de Ana, y no puede crear filas a nombre de Ana
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$
declare n int;
begin
  assert (select count(*) from life_budgets) = 0, 'no ve presupuestos ajenos';
  update life_budgets set amount = 1;
  get diagnostics n = row_count;
  assert n = 0, 'no cambia presupuestos ajenos';
  delete from life_budgets;
  get diagnostics n = row_count;
  assert n = 0, 'no borra presupuestos ajenos';
  begin
    insert into life_budgets (user_id, category, currency, amount)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'Ocio', 'ARS', 10);
    raise exception 'debería fallar: fila a nombre de otra cuenta';
  exception when insufficient_privilege then null;
  end;
  -- Beto sí puede usar su propia categoría
  insert into life_budgets (category, currency, amount) values ('c:c2000000-0000-0000-0000-000000000001', 'EUR', 30);
end $$;

-- Sin sesión, nada
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from life_budgets;
    raise exception 'anon no debería poder leer';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
do $$ begin
  assert (select count(*) from life_budgets where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 3, 'los de Ana siguen';
  assert (select count(*) from life_budgets where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 1, 'el de Beto';
end $$;

-- Al borrar la cuenta se borran sus presupuestos
delete from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000002';
do $$ begin
  assert (select count(*) from life_budgets where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 0, 'cascada';
end $$;

rollback;
