-- Ánimo del día (1–5 u opcional) y revisión semanal (una por semana, largos, hasta 3 focos válidos, sólo el dueño).
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

-- Ánimo: opcional y de 1 a 5
insert into life_daily_reviews (user_id, date) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-09');
insert into life_daily_reviews (user_id, date, mood) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-10', 1);
insert into life_daily_reviews (user_id, date, mood) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-11', 5);
update life_daily_reviews set mood = 3 where date = '2026-10-09';
update life_daily_reviews set mood = null where date = '2026-10-10';

-- Revisión semanal completa
insert into life_weekly_reviews (user_id, week_start, wins, let_go, next_focus, closed_at) values (
  'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-05', 'Terminé el informe', 'El curso que no empecé',
  '[{"id":"f1","kind":"text","text":"Caminar"},{"id":"f2","kind":"task","task_id":"10000000-0000-0000-0000-000000000001"}]', now());
-- Un borrador sin cerrar, sin nada escrito
insert into life_weekly_reviews (user_id, week_start) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-12');

do $$
declare
  bad text[] := array[
    $q$update life_daily_reviews set mood = 0 where date = '2026-10-11'$q$,
    $q$update life_daily_reviews set mood = 6 where date = '2026-10-11'$q$,
    $q$insert into life_weekly_reviews (user_id, week_start, wins) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-19', repeat('x', 501))$q$,
    $q$insert into life_weekly_reviews (user_id, week_start, let_go) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-19', repeat('x', 501))$q$,
    $q$insert into life_weekly_reviews (user_id, week_start, next_focus) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-19', '[{"id":"a","kind":"text","text":"1"},{"id":"b","kind":"text","text":"2"},{"id":"c","kind":"text","text":"3"},{"id":"d","kind":"text","text":"4"}]')$q$,
    $q$insert into life_weekly_reviews (user_id, week_start, next_focus) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-19', '[{"id":"a","kind":"text","text":"  "}]')$q$,
    $q$insert into life_weekly_reviews (user_id, week_start, next_focus) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-19', '[{"id":"a","kind":"task","task_id":"no-es-uuid"}]')$q$,
    $q$insert into life_weekly_reviews (user_id, week_start, next_focus) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-19', '{"a":1}')$q$
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

-- Una por semana
do $$ begin
  insert into life_weekly_reviews (user_id, week_start) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-05');
  raise exception 'duplicado aceptado';
exception when unique_violation then null;
end $$;

-- Beto no ve ni toca lo de Ana, ni puede escribir a nombre de ella
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from life_weekly_reviews) = 0;
  update life_weekly_reviews set wins = 'hackeo';
  delete from life_weekly_reviews;
  update life_daily_reviews set mood = 1;
end $$;
do $$ begin
  insert into life_weekly_reviews (user_id, week_start) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-11-02');
  raise exception 'escribió a nombre de otra persona';
exception when insufficient_privilege then null;
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert (select wins from life_weekly_reviews where week_start = '2026-10-05') = 'Terminé el informe';
  assert (select count(*) from life_weekly_reviews) = 2;
  assert (select mood from life_daily_reviews where date = '2026-10-11') = 5;
  assert (select mood from life_daily_reviews where date = '2026-10-09') = 3;
  assert (select mood from life_daily_reviews where date = '2026-10-10') is null;
end $$;

-- anon no lee
set local role anon;
do $$ begin
  perform 1 from life_weekly_reviews;
  raise exception 'anon no debería leer';
exception when insufficient_privilege then null;
end $$;

rollback;
