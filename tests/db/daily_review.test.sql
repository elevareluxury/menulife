-- V1 · etapa 11: "Mi día". Hasta 3 prioridades válidas, reflexión ≤ 280, una fila por día y sólo el dueño.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

insert into life_daily_reviews (user_id, date, priorities) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-09',
  '[{"id":"p1","kind":"task","task_id":"10000000-0000-0000-0000-000000000001"},{"id":"p2","kind":"text","text":"Llamar a mamá","done":false},{"id":"p3","kind":"text","text":"Caminar"}]');
update life_daily_reviews set reflection = 'Buen día', closed_at = now() where date = '2026-10-09';

do $$
declare
  bad text[] := array[
    $q$insert into life_daily_reviews (user_id, date, priorities) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-10', '[{"id":"a","kind":"text","text":"1"},{"id":"b","kind":"text","text":"2"},{"id":"c","kind":"text","text":"3"},{"id":"d","kind":"text","text":"4"}]')$q$,
    $q$insert into life_daily_reviews (user_id, date, priorities) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-10', '[{"id":"a","kind":"task","task_id":"no-es-uuid"}]')$q$,
    $q$insert into life_daily_reviews (user_id, date, priorities) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-10', '[{"id":"a","kind":"text","text":""}]')$q$,
    $q$insert into life_daily_reviews (user_id, date, priorities) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-10', '[{"id":"a","kind":"otro"}]')$q$,
    $q$insert into life_daily_reviews (user_id, date, priorities) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-10', '[{"id":"a","kind":"text","text":"x","extra":1}]')$q$,
    $q$insert into life_daily_reviews (user_id, date, priorities) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-10', '[1]')$q$,
    $q$insert into life_daily_reviews (user_id, date, priorities) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-10', '{"a":1}')$q$,
    $q$insert into life_daily_reviews (user_id, date, reflection) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-10', repeat('x', 281))$q$
  ];
  i int;
begin
  for i in 1 .. array_length(bad, 1) loop
    begin
      execute bad[i];
      raise exception 'debería fallar: %', left(bad[i], 120);
    exception when check_violation then null;
    end;
  end loop;
end $$;

-- Una por día
do $$ begin
  insert into life_daily_reviews (user_id, date) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-09');
  raise exception 'duplicado aceptado';
exception when unique_violation then null;
end $$;

-- Beto no ve ni toca lo de Ana
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from life_daily_reviews) = 0;
  update life_daily_reviews set reflection = 'hackeo';
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert (select reflection from life_daily_reviews where date = '2026-10-09') = 'Buen día';
end $$;

-- anon no lee
set local role anon;
do $$ begin
  perform 1 from life_daily_reviews;
  raise exception 'anon no debería leer';
exception when insufficient_privilege then null;
end $$;

rollback;
