-- Mycen V1 · etapa 14: métricas de producto propias.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@x');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');

-- ── Sin sesión: sólo empezar el registro ────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert track_product_event('signup_started', '{"ref": "ana"}') = 'ok', 'empieza el registro';
  assert track_product_event('habit_logged') = 'invalid', 'sin sesión no hay eventos de Life OS';
  assert track_product_event('cualquiera') = 'invalid', 'evento desconocido';
  begin
    perform 1 from product_events;
    assert false, 'el visitante no lee los eventos';
  exception when insufficient_privilege then null; end;
  begin
    insert into product_events (event) values ('signup_started');
    assert false, 'nadie inserta directo';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ── Con sesión ──────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert track_product_event('signup_completed', '{"ref": "beto", "tipo": "personal"}') = 'ok', 'registro con referido';
  assert track_product_event('onboarding_step', '{"step": 3}') = 'ok', 'paso';
  assert track_product_event('profile_published', '{"seconds": 120}') = 'ok', 'publicó';
  assert track_product_event('life_returned', '{"days": 4}') = 'ok', 'volvió';
  -- Nada de contenido: claves desconocidas, textos largos u objetos anidados
  assert track_product_event('task_completed', '{"title": "Pagar la luz"}') = 'invalid', 'sin títulos de tareas';
  assert track_product_event('share_tool_used', jsonb_build_object('platform', repeat('x', 65))) = 'invalid', 'texto largo';
  assert track_product_event('share_tool_used', '{"platform": {"a": 1}}') = 'invalid', 'sin objetos anidados';
  assert track_product_event('share_tool_used', '[1, 2]') = 'invalid', 'props objeto';
  begin
    perform admin_product_metrics(30);
    assert false, 'una cuenta común no ve las métricas';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$ begin
  assert (select user_id from product_events where event = 'signup_completed') = 'aaaaaaaa-0000-0000-0000-000000000001', 'con su cuenta';
  assert (select user_id from product_events where event = 'signup_started') is null, 'sin sesión, sin cuenta';
end $$;

-- ── Tope por cuenta ─────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ declare r text; begin
  for i in 1..300 loop perform track_product_event('habit_logged'); end loop;
  r := track_product_event('habit_logged');
  assert r = 'limited', 'más de 300 por hora: ' || r;
end $$;
reset role;

-- ── Datos de una cohorte para el panel ──────────────────────────────────────
-- Hace 50 días (y no 40): el panel muestra el "mes 1" recién cuando toda la semana de la cohorte llegó al día 36,
-- así que con 40 días el resultado dependía del día de la semana en que corre el test.
delete from product_events where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into product_events (user_id, event, props, created_at) values
  ('bbbbbbbb-0000-0000-0000-000000000002', 'signup_completed', '{}', now() - interval '50 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'profile_published', '{"seconds": 600}', now() - interval '50 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'life_my_day_opened', '{}', now() - interval '50 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'life_my_day_opened', '{}', now() - interval '49 days'),   -- día 1
  ('bbbbbbbb-0000-0000-0000-000000000002', 'habit_logged', '{}', now() - interval '42 days'),         -- día 8
  ('bbbbbbbb-0000-0000-0000-000000000002', 'habit_logged', '{}', now() - interval '17 days');         -- día 33
insert into product_events (user_id, event, created_at)
  select 'bbbbbbbb-0000-0000-0000-000000000002', 'habit_logged', now() - make_interval(days => d) from generate_series(0, 4) d;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ declare m jsonb; c jsonb; begin
  m := admin_product_metrics(90);
  assert (m ->> 'signups')::int = 2, 'dos registros: ' || (m ->> 'signups');
  assert (m ->> 'published')::int = 2, 'los dos publicaron';
  assert (m ->> 'publish_median_seconds')::numeric = 360, 'mediana 120 y 600: ' || (m ->> 'publish_median_seconds');
  assert (m ->> 'habit4_users')::int = 1, 'un hábito 4+ días en la semana';
  assert (m ->> 'returned_users')::int = 1, 'una persona volvió';
  assert (m ->> 'referral_signups')::int = 1 and m -> 'referrals' -> 0 ->> 'ref' = 'beto', 'registros por referido';
  select x into c from jsonb_array_elements(m -> 'retention') x
   where (x ->> 'week')::date = date_trunc('week', (now() - interval '50 days')::date)::date;
  assert (c ->> 'users')::int = 1, 'cohorte de hace 50 días';
  assert (c ->> 'd1')::int = 1, 'volvió al día siguiente';
  assert (c ->> 'd7')::int = 1, 'y en la primera semana (día 8)';
  assert (c ->> 'd30')::int = 1, 'y al mes (día 33)';
end $$;
reset role;

rollback;
