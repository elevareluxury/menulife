-- Lanzamiento L5: registro de errores propio.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@x');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');

-- ── La app reporta (sin sesión) ─────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{"user-agent": "Mozilla/5.0", "x-forwarded-for": "1.1.1.1"}', true);
do $$ begin
  assert report_client_error('TypeError: x is undefined', E'at f (https://mycen.id/assets/Studio-AbCd1234.js:10:5)\nat g', 'studio', '/studio', 'abc1234', 'Chrome 128') = 'ok', 'entra';
  -- El mismo error en otra versión del archivo (otro hash y otra posición) se agrupa
  assert report_client_error('TypeError: x is undefined', E'at f (https://mycen.id/assets/Studio-ZzZz9999.js:99:1)\nat g', 'studio', '/studio') = 'ok', 'agrupa';
  assert report_client_error('  ', null, 'studio') = 'invalid', 'mensaje vacío';
  assert report_client_error('Algo', null, 'zona-rara') = 'ok', 'zona desconocida va a other';
  begin
    perform 1 from app_errors;
    assert false, 'el visitante no lee los errores';
  exception when insufficient_privilege then null; end;
  begin
    perform admin_list_errors('open');
    assert false, 'el visitante no usa las funciones de admin';
  exception when insufficient_privilege then null; end;
end $$;
-- Otra persona con el mismo error
select set_config('request.headers', '{"user-agent": "Mozilla/5.0", "x-forwarded-for": "2.2.2.2"}', true);
do $$ begin assert report_client_error('TypeError: x is undefined', 'at f (https://mycen.id/assets/Studio-Q1w2e3r4.js:1:1)', 'studio') = 'ok'; end $$;
-- Los robots no dejan errores
select set_config('request.headers', '{"user-agent": "Googlebot/2.1", "x-forwarded-for": "3.3.3.3"}', true);
do $$ begin assert report_client_error('Error de bot', null, 'landing') = 'ok', 'al bot no se le avisa'; end $$;
reset role;

do $$ begin
  assert (select count(*) from app_errors) = 2, 'dos errores distintos (el de studio agrupado y el de other)';
  assert (select count from app_errors where area = 'studio') = 3, 'pasó 3 veces';
  assert (select count(*) from app_error_hits h join app_errors e on e.id = h.error_id where e.area = 'studio') = 2, '2 personas afectadas';
  assert (select area from app_errors where message = 'Algo') = 'other', 'zona other';
  assert not exists (select 1 from app_errors where message = 'Error de bot'), 'sin errores de bots';
end $$;

-- ── Tope por visitante ──────────────────────────────────────────────────────
set local role anon;
select set_config('request.headers', '{"user-agent": "Mozilla/5.0", "x-forwarded-for": "9.9.9.9"}', true);
do $$ declare r text; begin
  for i in 1..50 loop perform report_client_error('Error distinto ' || chr(65 + i % 26) || repeat('z', i), null, 'life'); end loop;
  r := report_client_error('Uno más', null, 'life');
  assert r = 'limited', 'más de 50 por día: ' || r;
end $$;
reset role;

-- ── Super-admin ─────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  begin
    perform admin_list_errors('open');
    assert false, 'una cuenta común no ve los errores';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ declare v_id uuid; v jsonb; begin
  v := admin_list_errors('open');
  assert jsonb_array_length(v) >= 2, 'el admin ve los abiertos';
  select (e ->> 'id')::uuid into v_id from jsonb_array_elements(v) e where e ->> 'area' = 'studio';
  assert (select (e ->> 'affected')::int from jsonb_array_elements(v) e where e ->> 'area' = 'studio') = 2, 'personas afectadas';
  perform admin_set_error_status(v_id, 'resolved', 'Arreglado en 1.2');
  assert jsonb_array_length(admin_list_errors('resolved')) = 1, 'queda resuelto';
  assert (admin_error_summary() ->> 'open')::int >= 1, 'resumen';
  begin
    perform admin_set_error_status(v_id, 'cualquiera');
    assert false, 'estado inválido';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;

-- Si vuelve a pasar, se reabre solo
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{"user-agent": "Mozilla/5.0", "x-forwarded-for": "4.4.4.4"}', true);
do $$ begin perform report_client_error('TypeError: x is undefined', 'at f (https://mycen.id/assets/Studio-Nuevo123.js:3:3)', 'studio'); end $$;
reset role;
do $$ begin
  assert (select status from app_errors where area = 'studio') = 'open', 'se reabrió';
  assert (select reopened from app_errors where area = 'studio'), 'marcado como reabierto';
  assert (select note from app_errors where area = 'studio') = 'Arreglado en 1.2', 'la nota queda';
end $$;

rollback;
