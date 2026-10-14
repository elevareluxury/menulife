-- Auditoría total: sólo se vincula a metas propias (tareas, hábitos, movimientos).
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into life_goals (id, user_id) values
  ('90000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('90000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

-- Con la meta propia (o sin meta) se puede
insert into life_brain_items (id, user_id, type, title, goal_id) values
  ('91000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Propia', '90000000-0000-0000-0000-00000000000a'),
  ('91000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'idea', 'Sin meta', null);
insert into life_habits (user_id, name, goal_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Leer', '90000000-0000-0000-0000-00000000000a');
insert into life_transactions (user_id, goal_id) values ('aaaaaaaa-0000-0000-0000-000000000001', '90000000-0000-0000-0000-00000000000a');
update life_brain_items set goal_id = null where id = '91000000-0000-0000-0000-000000000001';
-- Cambiar otro campo no vuelve a chequear
update life_brain_items set title = 'Otra' where id = '91000000-0000-0000-0000-000000000002';

-- Con una meta ajena, no
do $$
declare
  bad text[] := array[
    $q$insert into life_brain_items (user_id, type, title, goal_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'task', 'x', '90000000-0000-0000-0000-00000000000b')$q$,
    $q$update life_brain_items set goal_id = '90000000-0000-0000-0000-00000000000b' where id = '91000000-0000-0000-0000-000000000002'$q$,
    $q$insert into life_habits (user_id, name, goal_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', '90000000-0000-0000-0000-00000000000b')$q$,
    $q$insert into life_transactions (user_id, goal_id) values ('aaaaaaaa-0000-0000-0000-000000000001', '90000000-0000-0000-0000-00000000000b')$q$
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

-- Nadie llama a la función directo
do $$ begin
  assert not has_function_privilege('authenticated', 'public.life_check_goal_owner()', 'execute'), 'la función no se expone';
end $$;

rollback;
