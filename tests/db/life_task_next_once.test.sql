-- Tareas que se repiten: una sola siguiente por tarea (occurrence_of único), sólo de la misma cuenta.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

insert into life_brain_items (id, user_id, type, title, due_date, recurrence) values
  ('20000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Regar', '2026-10-09', '{"freq":"daily"}'),
  ('20000000-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001', 'idea', 'Una idea', null, null);

-- Primer dispositivo: completa y crea la siguiente
update life_brain_items set is_completed = true where id = '20000000-0000-0000-0000-000000000001';
insert into life_brain_items (id, user_id, type, title, due_date, recurrence, occurrence_of) values
  ('20000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Regar', '2026-10-10', '{"freq":"daily"}',
   '20000000-0000-0000-0000-000000000001');

-- Segundo dispositivo (o segundo toque): la misma siguiente otra vez → rechazada
do $$ begin
  begin
    insert into life_brain_items (user_id, type, title, due_date, recurrence, occurrence_of) values
      ('aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Regar', '2026-10-10', '{"freq":"daily"}', '20000000-0000-0000-0000-000000000001');
    raise exception 'se duplicó la siguiente';
  exception when unique_violation then null;
  end;
  assert (select count(*) from life_brain_items where occurrence_of = '20000000-0000-0000-0000-000000000001') = 1, 'una sola siguiente';
end $$;

-- Destildar: se borra la siguiente sin hacer y el lugar queda libre para volver a tildar
delete from life_brain_items where id = '20000000-0000-0000-0000-000000000002' and is_completed = false;
insert into life_brain_items (user_id, type, title, due_date, recurrence, occurrence_of) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Regar', '2026-10-10', '{"freq":"daily"}', '20000000-0000-0000-0000-000000000001');

-- Sólo una tarea propia puede ser el origen (no una idea)
do $$ begin
  begin
    insert into life_brain_items (user_id, type, title, occurrence_of) values
      ('aaaaaaaa-0000-0000-0000-000000000001', 'task', 'x', '20000000-0000-0000-0000-000000000009');
    raise exception 'origen que no es tarea aceptado';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Beto no puede ocupar el lugar de la siguiente de Ana (aunque sepa el id)
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
insert into life_brain_items (id, user_id, type, title) values
  ('30000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'task', 'De Beto');
do $$ begin
  begin
    insert into life_brain_items (user_id, type, title, occurrence_of) values
      ('bbbbbbbb-0000-0000-0000-000000000002', 'task', 'x', '20000000-0000-0000-0000-000000000001');
    raise exception 'origen ajeno aceptado';
  exception when insufficient_privilege then null;
  end;
  begin
    update life_brain_items set occurrence_of = '20000000-0000-0000-0000-000000000001' where id = '30000000-0000-0000-0000-000000000001';
    raise exception 'origen ajeno aceptado al cambiar';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Borrar el origen deja la siguiente sin origen (no la borra)
reset role;
delete from life_brain_items where id = '20000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select count(*) from life_brain_items where title = 'Regar' and occurrence_of is null) = 1, 'la siguiente queda';
end $$;

rollback;

-- Las que ya existían se anotan desde next_occurrence_id (la migración es idempotente: se vuelve a correr).
-- Sin transacción alrededor (la migración tiene la suya): al final se borra lo creado.
insert into auth.users values ('cccccccc-0000-0000-0000-000000000003', 'caro@x');
insert into life_brain_items (id, user_id, type, title, due_date, recurrence) values
  ('40000000-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000003', 'task', 'Siguiente', '2026-10-10', '{"freq":"daily"}');
insert into life_brain_items (id, user_id, type, title, due_date, recurrence, is_completed, next_occurrence_id) values
  ('40000000-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'task', 'Origen', '2026-10-09', '{"freq":"daily"}', true,
   '40000000-0000-0000-0000-000000000002');
\i supabase/migrations/20261103000002_life_task_next_once.sql
do $$ begin
  assert (select occurrence_of from life_brain_items where id = '40000000-0000-0000-0000-000000000002') = '40000000-0000-0000-0000-000000000001',
    'la siguiente vieja quedó anotada';
end $$;
delete from life_brain_items where user_id = 'cccccccc-0000-0000-0000-000000000003';
delete from auth.users where id = 'cccccccc-0000-0000-0000-000000000003';
