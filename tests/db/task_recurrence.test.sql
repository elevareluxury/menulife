-- V1 · etapa 09: tareas que se repiten y subtareas, validadas en la base.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

-- Formas válidas
insert into life_brain_items (id, user_id, type, title, due_date, recurrence, subtasks) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Diaria', '2026-10-09', '{"freq":"daily"}', '[]'),
  ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Semanal', '2026-10-09',
   '{"freq":"weekly","interval":2,"weekdays":[1,4]}', '[{"id":"a","text":"Comprar","done":false},{"id":"b","text":"Pagar","done":true}]'),
  ('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Mensual', '2026-01-31', '{"freq":"monthly","monthday":31}', '[]'),
  ('10000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Cada 10', '2026-10-09', '{"freq":"interval","interval":10}', '[]'),
  ('10000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Sin repetir', null, null, '[]');

-- La siguiente ocurrencia queda anotada en la completada
update life_brain_items set is_completed = true, next_occurrence_id = '10000000-0000-0000-0000-000000000005'
 where id = '10000000-0000-0000-0000-000000000001';

-- Formas inválidas: cada una tiene que fallar
do $$
declare
  bad text[][] := array[
    array['{"freq":"yearly"}', '2026-10-09', 'task'],
    array['{"freq":"weekly"}', '2026-10-09', 'task'],
    array['{"freq":"weekly","weekdays":[]}', '2026-10-09', 'task'],
    array['{"freq":"weekly","weekdays":[7]}', '2026-10-09', 'task'],
    array['{"freq":"monthly","monthday":32}', '2026-10-09', 'task'],
    array['{"freq":"interval","interval":0}', '2026-10-09', 'task'],
    array['{"freq":"interval","interval":1.5}', '2026-10-09', 'task'],
    array['{"freq":"daily","extra":1}', '2026-10-09', 'task'],
    array['{"freq":"daily"}', null, 'task'],
    array['{"freq":"daily"}', '2026-10-09', 'note'],
    array['{"freq":"weekly","weekdays":"lunes"}', '2026-10-09', 'task'],
    array['{"freq":"weekly","weekdays":["1"]}', '2026-10-09', 'task'],
    array['"daily"', '2026-10-09', 'task']
  ];
  i int;
begin
  for i in 1 .. array_length(bad, 1) loop
    begin
      insert into life_brain_items (user_id, type, title, due_date, recurrence)
      values ('aaaaaaaa-0000-0000-0000-000000000001', bad[i][3], 'x', bad[i][2]::date, bad[i][1]::jsonb);
      raise exception 'debería fallar: %', bad[i][1];
    exception when check_violation then null;
    end;
  end loop;
end $$;

do $$
declare
  many jsonb := (select jsonb_agg(jsonb_build_object('id', g::text, 'text', 'paso', 'done', false)) from generate_series(1, 21) g);
  bad jsonb[] := array[
    many,
    '[{"id":"a","text":"","done":false}]'::jsonb,
    jsonb_build_array(jsonb_build_object('id', 'a', 'text', repeat('x', 201), 'done', false)),
    '[{"id":"a","text":"ok","done":"no"}]'::jsonb,
    '[{"id":"a","text":"ok"}]'::jsonb,
    '[{"id":"a","text":"ok","done":false,"extra":1}]'::jsonb,
    '{"id":"a"}'::jsonb,
    '[1]'::jsonb,
    '"texto"'::jsonb
  ];
  i int;
begin
  for i in 1 .. array_length(bad, 1) loop
    begin
      insert into life_brain_items (user_id, type, title, subtasks) values ('aaaaaaaa-0000-0000-0000-000000000001', 'task', 'x', bad[i]);
      raise exception 'subtareas inválidas aceptadas: %', left(bad[i]::text, 60);
    exception when check_violation then null;
    end;
  end loop;
  -- 20 está bien
  insert into life_brain_items (user_id, type, title, subtasks)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'task', 'veinte', (select jsonb_agg(jsonb_build_object('id', g::text, 'text', 'paso', 'done', false)) from generate_series(1, 20) g));
end $$;

-- Cada uno ve sólo lo suyo (la RLS de siempre)
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from life_brain_items) = 0, 'Beto no ve las tareas de Ana';
end $$;

rollback;
