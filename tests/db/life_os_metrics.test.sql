-- Métricas de Life OS: eventos nuevos (sólo etiquetas de una lista fija) y el resumen del panel.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x'),
  ('dddddddd-0000-0000-0000-000000000004', 'dani@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@x');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');

-- ── Validación de los eventos nuevos ────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert track_product_event('goal_created') = 'ok', 'meta';
  assert track_product_event('goal_created', '{"tipo": "viaje"}') = 'invalid', 'la meta no lleva nada';
  assert track_product_event('item_linked_to_goal', '{"tipo": "habit"}') = 'ok', 'vínculo';
  assert track_product_event('item_linked_to_goal', '{"tipo": "Ahorrar para Japón"}') = 'invalid', 'tipo fuera de la lista';
  assert track_product_event('item_linked_to_goal') = 'invalid', 'el vínculo dice qué se vinculó';
  assert track_product_event('capture_used', '{"tipo": "quick", "dest": "idea"}') = 'ok', 'captura rápida';
  assert track_product_event('capture_used', '{"tipo": "dump", "dest": "task", "count": 3}') = 'ok', 'vaciar la cabeza';
  assert track_product_event('capture_used', '{"tipo": "voice", "dest": "money"}') = 'ok', 'por voz';
  assert track_product_event('capture_used', '{"tipo": "dump", "dest": "task", "count": 0}') = 'invalid', 'count positivo';
  assert track_product_event('capture_used', '{"tipo": "quick", "dest": "comprar pan"}') = 'invalid', 'destino fuera de la lista';
  assert track_product_event('capture_used', '{"tipo": "quick"}') = 'invalid', 'falta el destino';
  assert track_product_event('capture_used', '{"tipo": "quick", "dest": "idea", "mode": "x"}') = 'invalid', 'claves de más';
  assert track_product_event('weekly_review_done') = 'ok', 'revisión';
  assert track_product_event('reminder_shown', '{"kind": "task", "channel": "app"}') = 'ok', 'mostrado';
  assert track_product_event('reminder_opened', '{"kind": "task", "channel": "app"}') = 'ok', 'abierto';
  assert track_product_event('reminder_opened', '{"kind": "task", "channel": "sms"}') = 'invalid', 'canal fuera de la lista';
  assert track_product_event('reminder_shown', '{"kind": "task"}') = 'invalid', 'falta el canal';
  -- Lo de antes sigue igual
  assert track_product_event('habit_logged') = 'ok', 'evento viejo';
  assert track_product_event('no_existe') = 'invalid', 'evento desconocido';
end $$;
reset role;

do $$ begin
  assert (select count(*) from product_event_types) >= 19, 'lista de eventos';
  assert not exists (select 1 from pg_constraint where conname = 'product_events_event_check'), 'sin el check viejo';
  begin
    insert into product_events (event) values ('no_existe');
    assert false, 'la tabla tampoco acepta eventos desconocidos';
  exception when foreign_key_violation then null; end;
end $$;

-- ── Datos para el panel ─────────────────────────────────────────────────────
delete from product_events;
insert into product_events (user_id, event, props, created_at) values
  -- Ana: se registró hace 10 días, primer valor a la hora (prioridades), vinculó dos cosas a una meta
  ('aaaaaaaa-0000-0000-0000-000000000001', 'signup_completed', '{}', now() - interval '10 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'life_priorities_set', '{"count": 1}', now() - interval '10 days' + interval '1 hour'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'habit_logged', '{}', now() - interval '9 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'goal_created', '{}', now() - interval '9 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'item_linked_to_goal', '{"tipo": "habit"}', now() - interval '9 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'item_linked_to_goal', '{"tipo": "task"}', now() - interval '8 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'capture_used', '{"tipo": "quick", "dest": "idea"}', now() - interval '8 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'capture_used', '{"tipo": "dump", "dest": "task", "count": 3}', now() - interval '7 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'weekly_review_done', '{}', now() - interval '3 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'reminder_shown', '{"kind": "task", "channel": "push"}', now() - interval '2 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'reminder_shown', '{"kind": "task", "channel": "push"}', now() - interval '1 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'reminder_opened', '{"kind": "task", "channel": "push"}', now() - interval '1 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'reminder_shown', '{"kind": "habit", "channel": "app"}', now() - interval '1 days'),
  -- Beto: se registró hace 5 días, primer valor a las 3 h (tarea hecha), sin metas
  ('bbbbbbbb-0000-0000-0000-000000000002', 'signup_completed', '{}', now() - interval '5 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'task_completed', '{}', now() - interval '5 days' + interval '3 hours'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'capture_used', '{"tipo": "dump", "dest": "task", "count": 2}', now() - interval '4 days'),
  -- Dani: se registró y todavía no hizo nada de Life OS (no entra en la mediana)
  ('dddddddd-0000-0000-0000-000000000004', 'signup_completed', '{}', now() - interval '2 days'),
  -- Fuera del período de 30 días: no cuenta
  ('bbbbbbbb-0000-0000-0000-000000000002', 'weekly_review_done', '{}', now() - interval '60 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'item_linked_to_goal', '{"tipo": "money"}', now() - interval '60 days');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ declare m jsonb; c jsonb; r jsonb; begin
  m := admin_product_metrics(30);
  assert (m ->> 'period_life_users')::int = 2, 'dos cuentas activas en Life OS: ' || (m ->> 'period_life_users');
  assert (m ->> 'goal_linked_users')::int = 1, 'una vinculó algo a una meta: ' || (m ->> 'goal_linked_users');
  assert (m ->> 'goals_created')::int = 1, 'una meta creada';
  assert m -> 'goal_links' = '{"habit": 1, "task": 1}'::jsonb, 'vínculos por tipo: ' || (m -> 'goal_links')::text;
  assert (m ->> 'capture_users')::int = 2, 'dos usaron la captura';
  select x into c from jsonb_array_elements(m -> 'captures') x where x ->> 'tipo' = 'dump' and x ->> 'dest' = 'task';
  assert (c ->> 'uses')::int = 2 and (c ->> 'items')::int = 5, 'vaciar la cabeza: 2 usos, 5 tareas: ' || c::text;
  assert jsonb_array_length(m -> 'captures') = 2, 'captura por tipo y destino';
  assert (m ->> 'weekly_reviews')::int = 1 and (m ->> 'weekly_review_users')::int = 1, 'revisiones del período';
  select x into r from jsonb_array_elements(m -> 'reminders') x where x ->> 'kind' = 'task' and x ->> 'channel' = 'push';
  assert (r ->> 'shown')::int = 2 and (r ->> 'opened')::int = 1, 'push de tareas: 2 mostrados, 1 abierto: ' || r::text;
  select x into r from jsonb_array_elements(m -> 'reminders') x where x ->> 'kind' = 'habit' and x ->> 'channel' = 'app';
  assert (r ->> 'shown')::int = 1 and (r ->> 'opened')::int = 0, 'hábito con la app abierta';
  assert (m ->> 'first_value_users')::int = 2, 'dos llegaron al primer valor';
  assert (m ->> 'first_value_median_seconds')::numeric = 7200, 'mediana de 1 h y 3 h: ' || (m ->> 'first_value_median_seconds');
  -- Las métricas de antes siguen
  assert (m ->> 'signups')::int = 3, 'tres registros';
end $$;
reset role;

rollback;
