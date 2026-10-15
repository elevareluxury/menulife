-- Life OS · Diario privado: sólo la dueña lee y escribe; largo, fecha y topes.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

insert into life_journal_entries (id, entry_date, body) values
  ('d1000000-0000-0000-0000-000000000001', current_date, 'Hoy fue un buen día.'),
  ('d1000000-0000-0000-0000-000000000002', current_date, repeat('a', 10000));

do $$ begin
  assert (select user_id from life_journal_entries where id = 'd1000000-0000-0000-0000-000000000001') = 'aaaaaaaa-0000-0000-0000-000000000001', 'dueña por defecto';
  assert (select count(*) from life_journal_entries) = 2, 'varias por día';
end $$;

-- Validaciones: texto vacío, sólo espacios, muy largo, fecha fuera de rango
do $$
declare
  bad text[] := array[
    $q$insert into life_journal_entries (entry_date, body) values (current_date, '')$q$,
    $q$insert into life_journal_entries (entry_date, body) values (current_date, '   ')$q$,
    $q$insert into life_journal_entries (entry_date, body) values (current_date, repeat('a', 10001))$q$,
    $q$insert into life_journal_entries (entry_date, body) values (current_date + 5, 'Del futuro')$q$,
    $q$insert into life_journal_entries (entry_date, body) values (date '1800-01-01', 'Muy viejo')$q$,
    $q$update life_journal_entries set body = '' where id = 'd1000000-0000-0000-0000-000000000001'$q$,
    $q$update life_journal_entries set entry_date = current_date + 30 where id = 'd1000000-0000-0000-0000-000000000001'$q$
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

-- Editar: cambia el texto y updated_at; created_at no se toca
do $$
declare c timestamptz;
begin
  c := (select created_at from life_journal_entries where id = 'd1000000-0000-0000-0000-000000000001');
  update life_journal_entries set body = 'Mejor de lo que pensaba.', created_at = now() - interval '1 year'
    where id = 'd1000000-0000-0000-0000-000000000001';
  assert (select body from life_journal_entries where id = 'd1000000-0000-0000-0000-000000000001') = 'Mejor de lo que pensaba.', 'edita';
  assert (select created_at from life_journal_entries where id = 'd1000000-0000-0000-0000-000000000001') = c, 'created_at fijo';
end $$;

-- Tope por día: 20 (al crear y al mover una a ese día)
do $$
declare i int;
begin
  for i in 1 .. 18 loop
    insert into life_journal_entries (entry_date, body) values (current_date, 'Entrada ' || i);
  end loop;
  assert (select count(*) from life_journal_entries where entry_date = current_date) = 20, 'llegó a 20';
  begin
    insert into life_journal_entries (entry_date, body) values (current_date, 'Una más');
    raise exception 'debería fallar: tope por día';
  exception when check_violation then null;
  end;
  insert into life_journal_entries (id, entry_date, body) values ('d1000000-0000-0000-0000-000000000003', current_date - 1, 'Ayer');
  begin
    update life_journal_entries set entry_date = current_date where id = 'd1000000-0000-0000-0000-000000000003';
    raise exception 'debería fallar: mover a un día lleno';
  exception when check_violation then null;
  end;
  -- Editar el texto de una del día lleno sí se puede
  update life_journal_entries set body = 'Cambiada' where id = 'd1000000-0000-0000-0000-000000000002';
end $$;

-- Otra cuenta no ve, no cambia, no borra ni escribe en nombre de Ana
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$
declare n int;
begin
  assert (select count(*) from life_journal_entries) = 0, 'no ve entradas ajenas';
  update life_journal_entries set body = 'Hackeada' where id = 'd1000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'no cambia entradas ajenas';
  delete from life_journal_entries where id = 'd1000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'no borra entradas ajenas';
  begin
    insert into life_journal_entries (user_id, entry_date, body) values ('aaaaaaaa-0000-0000-0000-000000000001', current_date - 3, 'Intrusa');
    raise exception 'debería fallar: escribir para otra cuenta';
  exception when insufficient_privilege then null;
  end;
  -- Su propio diario sí (el tope por día es por cuenta)
  insert into life_journal_entries (entry_date, body) values (current_date, 'Lo mío');
  assert (select count(*) from life_journal_entries) = 1, 've sólo lo suyo';
end $$;

-- Ana no puede pasarle una entrada a otra cuenta
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  begin
    update life_journal_entries set user_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'd1000000-0000-0000-0000-000000000001';
    raise exception 'debería fallar: cambiar la dueña';
  exception when insufficient_privilege then null;
  end;
end $$;

-- El visitante anónimo no tiene acceso
reset role;
set local role anon;
do $$ begin
  begin
    perform count(*) from life_journal_entries;
    raise exception 'debería fallar: anon lee';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Tope total: 20.000 por cuenta (carga masiva sin el trigger, después se prueba con él)
reset role;
alter table life_journal_entries disable trigger life_journal_rules;
insert into life_journal_entries (user_id, entry_date, body)
  select 'aaaaaaaa-0000-0000-0000-000000000001', current_date - 10 - (g / 20)::int, 'x'
  from generate_series(1, 20000 - (select count(*) from life_journal_entries where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')) g;
alter table life_journal_entries enable trigger life_journal_rules;
set local role authenticated;
do $$ begin
  assert (select count(*) from life_journal_entries) = 20000, 'llegó a 20.000';
  begin
    insert into life_journal_entries (entry_date, body) values (date '2001-01-01', 'Una más');
    raise exception 'debería fallar: tope total';
  exception when check_violation then null;
  end;
end $$;

-- Borrar la cuenta borra su diario
reset role;
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$ begin
  assert (select count(*) from life_journal_entries where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0, 'se borra con la cuenta';
  assert (select count(*) from life_journal_entries) = 1, 'lo de la otra cuenta queda';
end $$;

rollback;
