-- V1 · etapa 10: hábitos con cantidad, "X veces por semana", ancla y recordatorio.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

-- Hábitos de antes siguen funcionando
insert into life_habits (id, user_id, name) values ('20000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Leer');
insert into life_habits (id, user_id, name, frequency) values ('20000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Gym', '{"type":"weekly","days":[1,3,5]}');
-- Nuevos
insert into life_habits (id, user_id, name, target_value, unit, anchor, reminder_enabled, reminder_time)
values ('20000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Agua', 8, 'vasos', 'el café', true, '09:00');
insert into life_habits (id, user_id, name, frequency) values ('20000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Correr', '{"type":"times_per_week","times":3}');

insert into life_habit_logs (habit_id, user_id, completed_date) values ('20000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-09');
insert into life_habit_logs (habit_id, user_id, completed_date, value) values ('20000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-09', 5);
do $$ begin
  assert (select value from life_habit_logs where habit_id = '20000000-0000-0000-0000-000000000001') = 1, 'sí/no vale 1';
end $$;
-- "+1": mismo día, sube el valor
update life_habit_logs set value = value + 1 where habit_id = '20000000-0000-0000-0000-000000000003' and completed_date = '2026-10-09';

do $$
declare
  bad text[] := array[
    $q$insert into life_habits (user_id, name, target_value) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 0)$q$,
    $q$insert into life_habits (user_id, name, unit) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', repeat('u', 21))$q$,
    $q$insert into life_habits (user_id, name, anchor) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', repeat('a', 61))$q$,
    $q$insert into life_habits (user_id, name, reminder_enabled) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', true)$q$,
    $q$insert into life_habits (user_id, name, frequency) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', '{"type":"times_per_week","times":8}')$q$,
    $q$insert into life_habits (user_id, name, frequency) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', '{"type":"times_per_week"}')$q$,
    $q$insert into life_habits (user_id, name, frequency) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', '{"type":"monthly"}')$q$,
    $q$insert into life_habits (user_id, name, frequency) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', '{"type":"weekly","days":[9]}')$q$,
    $q$insert into life_habits (user_id, name, frequency) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', '"daily"')$q$,
    $q$insert into life_habit_logs (habit_id, user_id, completed_date, value) values ('20000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-09', 0)$q$
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

-- Cada uno lo suyo
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from life_habits) = 0;
  assert (select count(*) from life_habit_logs) = 0;
end $$;

rollback;
