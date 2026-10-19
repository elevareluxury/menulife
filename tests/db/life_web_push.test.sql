-- Life OS · avisos con la app cerrada (20261109000001_life_web_push): suscripciones privadas y recordatorios que salen
-- una sola vez, a la hora de la zona de la cuenta. Hora fija: 2026-10-20 15:00 UTC = martes 12:00 en Buenos Aires.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'carla@x');
insert into user_settings (user_id, timezone) values ('aaaaaaaa-0000-0000-0000-000000000001', 'America/Argentina/Buenos_Aires');

-- Ana: suscripción desde la app
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select life_push_subscribe('https://push.example/ana', 'p256-ana', 'auth-ana', 'Europe/Madrid', 'Test');
do $$
declare
  bad text[] := array[
    $q$select life_push_subscribe('http://push.example/x', 'k', 'a')$q$,
    $q$select life_push_subscribe('https://push.example/x', '', 'a')$q$,
    $q$select * from life_push_subscriptions$q$,
    $q$select * from life_claim_due_reminders()$q$
  ];
  q text;
begin
  foreach q in array bad loop
    begin
      execute q;
      raise exception 'tendría que fallar: %', q;
    exception when others then
      if sqlerrm like 'tendría que fallar%' then raise; end if;
    end;
  end loop;
end $$;
reset role;

-- Tareas de Ana (hoy, martes 20)
insert into life_brain_items (id, user_id, type, title, due_date, due_time, remind_minutes, is_completed) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Llamar al banco', '2026-10-20', '12:00', 0, false),
  ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Dentista', '2026-10-20', '13:00', 30, false),
  ('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Sin hora', '2026-10-20', null, 0, false),
  ('10000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Hecha', '2026-10-20', '11:00', 0, true),
  ('10000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Sin aviso', '2026-10-20', '11:00', null, false),
  -- Beto no tiene ningún dispositivo suscrito: lo avisa la app abierta
  ('10000000-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000002', 'task', 'De Beto', '2026-10-20', '11:00', 0, false);

-- Hábitos de Ana
insert into life_habits (id, user_id, name, anchor, reminder_enabled, reminder_time, frequency, target_value) values
  ('20000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Tomar agua', 'el almuerzo', true, '11:30', '{"type":"daily","days":[0,1,2,3,4,5,6]}', null),
  ('20000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Gym', null, true, '11:30', '{"type":"weekly","days":[1,3]}', null),
  ('20000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Leer', null, true, '11:30', '{"type":"daily","days":[0,1,2,3,4,5,6]}', null),
  ('20000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Meditar', null, true, '14:00', '{"type":"daily","days":[0,1,2,3,4,5,6]}', null),
  ('20000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Vasos', null, true, '11:00', '{"type":"times_per_week","times":3}', 8);
-- Leer ya está hecho hoy; Vasos va 5 de 8 (no está completo)
insert into life_habit_logs (habit_id, user_id, completed_date) values ('20000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-20');
insert into life_habit_logs (habit_id, user_id, completed_date, value) values ('20000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-20', 5);

create temp table got as select * from life_claim_due_reminders('2026-10-20 15:00:00+00');
do $$ begin
  assert (select array_agg(title order by title) from got where kind = 'task') = array['Llamar al banco', 'Sin hora'],
    format('tareas: %s', (select array_agg(title) from got where kind = 'task'));
  assert (select array_agg(title order by title) from got where kind = 'habit') = array['Tomar agua', 'Vasos'],
    format('hábitos: %s', (select array_agg(title) from got where kind = 'habit'));
  assert (select body from got where title = 'Llamar al banco') = '12:00', 'la hora de la tarea';
  assert (select body from got where title = 'Sin hora') is null, 'sin hora no lleva hora';
  assert (select body from got where title = 'Tomar agua') = 'el almuerzo', 'el ancla del hábito';
  assert (select url from got where title = 'Llamar al banco') = '/life/brain?vista=tareas', 'abre las tareas';
  assert (select tag from got where title = 'Tomar agua') = 'life-habit-20000000-0000-0000-0000-000000000001-2026-10-20', 'tag por día';
  assert not exists (select 1 from got where user_id <> 'aaaaaaaa-0000-0000-0000-000000000001'), 'sólo cuentas suscritas';
  -- Quedaron marcadas: la app abierta tampoco las repite
  assert (select reminded_at from life_brain_items where id = '10000000-0000-0000-0000-000000000001') = '2026-10-20 15:00:00+00', 'reminded_at';
  assert (select reminded_at from life_brain_items where id = '10000000-0000-0000-0000-000000000006') is null, 'la de Beto sigue para la app';
end $$;

-- Un minuto después no sale nada repetido; el dentista (13:00 − 30 min = 12:30) todavía no
do $$ begin
  assert (select count(*) from life_claim_due_reminders('2026-10-20 15:01:00+00')) = 0, 'nada repetido';
  assert (select array_agg(title) from life_claim_due_reminders('2026-10-20 15:30:00+00')) = array['Dentista'], 'el dentista a las 12:30';
end $$;

-- Zona inválida y sin preferencias: UTC, sin romper
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
select life_push_subscribe('https://push.example/carla', 'p256-carla', 'auth-carla', 'Marte/Base', null);
reset role;
insert into life_brain_items (user_id, type, title, due_date, due_time, remind_minutes) values
  ('cccccccc-0000-0000-0000-000000000003', 'task', 'De Carla', '2026-10-20', '14:50', 0);
do $$ begin
  assert (select array_agg(title) from life_claim_due_reminders('2026-10-20 15:00:00+00')) = array['De Carla'], 'Carla en UTC';
end $$;

-- El mismo celular con otra cuenta: pasa a la nueva; la anterior no puede borrarla
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
select life_push_subscribe('https://push.example/ana', 'p256-b', 'auth-b');
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select life_push_unsubscribe('https://push.example/ana');
reset role;
do $$ begin
  assert (select user_id from life_push_subscriptions where endpoint = 'https://push.example/ana') = 'bbbbbbbb-0000-0000-0000-000000000002', 'pasó a Beto';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
select life_push_unsubscribe('https://push.example/ana');
reset role;
do $$ begin
  assert not exists (select 1 from life_push_subscriptions where endpoint = 'https://push.example/ana'), 'Beto la borró';
end $$;

rollback;
