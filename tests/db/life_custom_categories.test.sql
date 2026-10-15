-- Life OS · Dinero: categorías propias.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

insert into life_categories (id, type, name, color) values
  ('c1000000-0000-0000-0000-000000000001', 'expense', 'Mascotas', '#22C55E'),
  ('c1000000-0000-0000-0000-000000000002', 'income', 'Alquileres', '#3B82F6');

-- Un movimiento y un fijo con la categoría propia
insert into life_transactions (type, amount, category, currency)
  values ('expense', 1500, 'c:c1000000-0000-0000-0000-000000000001', 'ARS');
insert into life_recurring_transactions (type, amount, category, currency, day_of_month, starts_on)
  values ('income', 900, 'c:c1000000-0000-0000-0000-000000000002', 'USD', 5, current_date);

do $$ begin
  assert (select user_id from life_categories where id = 'c1000000-0000-0000-0000-000000000001') = 'aaaaaaaa-0000-0000-0000-000000000001', 'dueña por defecto';
  -- Las fijas (texto) siguen igual
  insert into life_transactions (type, amount, category, currency) values ('expense', 10, 'Comida', 'ARS');
end $$;

-- Validaciones de la categoría
do $$
declare
  bad text[] := array[
    $q$insert into life_categories (type, name, color) values ('expense', '', '#22C55E')$q$,
    $q$insert into life_categories (type, name, color) values ('expense', ' Café', '#22C55E')$q$,
    $q$insert into life_categories (type, name, color) values ('expense', repeat('x', 41), '#22C55E')$q$,
    $q$insert into life_categories (type, name, color) values ('expense', 'Café', 'red')$q$,
    $q$insert into life_categories (type, name, color) values ('expense', 'Café', '#22C55')$q$,
    $q$insert into life_categories (type, name, color) values ('gift', 'Café', '#22C55E')$q$
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

-- Nombre repetido (sin distinguir mayúsculas) en el mismo tipo: no; en el otro tipo o archivada: sí
do $$ begin
  begin
    insert into life_categories (type, name, color) values ('expense', 'MASCOTAS', '#F4705A');
    raise exception 'debería fallar: nombre repetido';
  exception when unique_violation then null;
  end;
  insert into life_categories (type, name, color) values ('income', 'Mascotas', '#F4705A');
  update life_categories set archived_at = now() where id = 'c1000000-0000-0000-0000-000000000001';
  insert into life_categories (id, type, name, color) values ('c1000000-0000-0000-0000-000000000003', 'expense', 'Mascotas', '#F4705A');
  -- Restaurar la vieja choca con la nueva del mismo nombre
  begin
    update life_categories set archived_at = null where id = 'c1000000-0000-0000-0000-000000000001';
    raise exception 'debería fallar: restaurar con nombre repetido';
  exception when unique_violation then null;
  end;
  -- Archivada: el movimiento viejo la sigue teniendo y se puede leer su nombre
  assert (select c.name from life_transactions t join life_categories c on t.category = 'c:' || c.id
          where t.amount = 1500) = 'Mascotas', 'el movimiento viejo conserva su categoría';
end $$;

-- Una categoría propia inexistente o mal escrita en un movimiento: no
do $$
declare
  bad text[] := array[
    $q$insert into life_transactions (type, amount, category, currency) values ('expense', 1, 'c:no-es-un-id', 'ARS')$q$,
    $q$insert into life_transactions (type, amount, category, currency) values ('expense', 1, 'c:c9000000-0000-0000-0000-000000000009', 'ARS')$q$
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

-- Otra cuenta no ve, no cambia y no usa las categorías de Ana
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$
declare n int;
begin
  assert (select count(*) from life_categories) = 0, 'no ve categorías ajenas';
  update life_categories set name = 'Hackeada' where id = 'c1000000-0000-0000-0000-000000000003';
  get diagnostics n = row_count;
  assert n = 0, 'no cambia categorías ajenas';
  delete from life_categories where id = 'c1000000-0000-0000-0000-000000000003';
  get diagnostics n = row_count;
  assert n = 0, 'no borra categorías ajenas';
  begin
    insert into life_categories (user_id, type, name, color) values ('aaaaaaaa-0000-0000-0000-000000000001', 'expense', 'Intrusa', '#06B6D4');
    raise exception 'debería fallar: crear para otra cuenta';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into life_transactions (type, amount, category, currency) values ('expense', 1, 'c:c1000000-0000-0000-0000-000000000003', 'ARS');
    raise exception 'debería fallar: usar una categoría ajena';
  exception when insufficient_privilege then null;
  end;
  -- Puede tener la suya con el mismo nombre
  insert into life_categories (type, name, color) values ('expense', 'Mascotas', '#22C55E');
end $$;

-- Tope (de vuelta como Ana)
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
-- Tope: 50 sin archivar
do $$
declare i int;
begin
  for i in 1 .. 47 loop
    insert into life_categories (type, name, color) values ('expense', 'Extra ' || i, '#06B6D4');
  end loop;
  assert (select count(*) from life_categories where archived_at is null) = 50, 'llegó a 50';
  begin
    insert into life_categories (type, name, color) values ('expense', 'Una más', '#06B6D4');
    raise exception 'debería fallar: tope';
  exception when check_violation then null;
  end;
  -- Restaurar una archivada pasando el tope tampoco
  begin
    update life_categories set archived_at = null, name = 'Mascotas viejas' where id = 'c1000000-0000-0000-0000-000000000001';
    raise exception 'debería fallar: tope al restaurar';
  exception when check_violation then null;
  end;
end $$;

reset role;
do $$ begin
  assert (select name from life_categories where id = 'c1000000-0000-0000-0000-000000000003') = 'Mascotas', 'sigue igual';
end $$;

rollback;
