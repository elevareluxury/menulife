-- Avisos push en el panel (20261209000001): la función anota cada corrida, los dispositivos que fallan siempre se
-- borran al 10.º fallo seguido, y admin_push_status (sólo super-admins) junta lo que la base sabe. Nadie de la app
-- puede anotar corridas, sumar fallos ni leer la tabla.
\ir ../../supabase/migrations/20261209000001_web_push_status.sql
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-7000-0000-0000-000000000001', 'ana@x.com'),
  ('aaaaaaaa-7000-0000-0000-000000000002', 'beto@x.com'),
  ('cccccccc-7000-0000-0000-000000000003', 'admin@mycen.id');
insert into public.super_admins (user_id) values ('cccccccc-7000-0000-0000-000000000003');
insert into public.life_push_subscriptions (id, user_id, endpoint, p256dh, auth, last_sent_at) values
  ('dddddddd-7000-0000-0000-000000000001', 'aaaaaaaa-7000-0000-0000-000000000001', 'https://push.example/a1', 'k', 'a', now() - interval '1 day'),
  ('dddddddd-7000-0000-0000-000000000002', 'aaaaaaaa-7000-0000-0000-000000000001', 'https://push.example/a2', 'k', 'a', null),
  ('dddddddd-7000-0000-0000-000000000003', 'aaaaaaaa-7000-0000-0000-000000000002', 'https://push.example/b1', 'k', 'a', null);
insert into public.product_events (user_id, event, props) values
  ('aaaaaaaa-7000-0000-0000-000000000001', 'reminder_shown', '{"kind": "task", "channel": "push"}'),
  ('aaaaaaaa-7000-0000-0000-000000000001', 'reminder_shown', '{"kind": "habit", "channel": "push"}'),
  ('aaaaaaaa-7000-0000-0000-000000000001', 'reminder_shown', '{"kind": "task", "channel": "app"}'),
  ('aaaaaaaa-7000-0000-0000-000000000001', 'reminder_opened', '{"kind": "task", "channel": "push"}');

-- La app no puede nada de esto
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-7000-0000-0000-000000000001', true);
do $$
begin
  begin perform life_push_record_run('ok'); assert false, 'anotar corridas: sólo el servidor';
  exception when insufficient_privilege then null; end;
  begin perform life_push_note_failures(array['dddddddd-7000-0000-0000-000000000003'::uuid]); assert false, 'fallos: sólo el servidor';
  exception when insufficient_privilege then null; end;
  begin perform 1 from life_push_runs; assert false, 'nadie lee la tabla';
  exception when insufficient_privilege then null; end;
  begin perform admin_push_status(); assert false, 'estado: no es admin';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  assert not has_function_privilege('anon', 'public.admin_push_status()', 'execute'), 'anon: estado';
  assert not has_function_privilege('anon', 'public.life_push_record_run(text, text, jsonb, text)', 'execute'), 'anon: corridas';
  assert not has_function_privilege('authenticated', 'public.life_push_note_failures(uuid[])', 'execute'), 'cuentas: fallos';
end $$;

-- Sin corridas todavía
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-7000-0000-0000-000000000003', true);
do $$
declare s jsonb;
begin
  s := admin_push_status();
  assert (s ->> 'subscriptions')::int = 3, 'dispositivos';
  assert (s ->> 'people')::int = 2, 'personas';
  assert (s ->> 'sent_7d')::int = 1, 'con algún aviso en 7 días';
  assert s -> 'run' = 'null'::jsonb, 'la función nunca corrió';
  assert (s ->> 'shown_24h')::int = 2, 'sólo los push entregados';
  assert (s ->> 'opened_24h')::int = 1, 'push tocados';
  assert s -> 'cron' = 'null'::jsonb, 'sin pg_cron no falla';
end $$;
reset role;

-- Corridas: sin claves, con claves malas y bien; la clave pública se guarda (no es secreta), la de "ok" queda
do $$
declare r life_push_runs%rowtype; k text := 'BOrRrmFI-7ajEpkj4fxUoGJFa_zFvFRQ3eU_MvYdRlIdRV1ZAt8mW0HvOaKPCdR8QfC4q0SMeu6RGm8JOsJvS9I';
begin
  perform life_push_record_run('no_keys');
  select * into r from life_push_runs;
  assert r.last_result = 'no_keys' and r.last_ok_at is null and r.public_key is null, 'sin claves';
  perform life_push_record_run('ok', k, '{"reminders": 2, "sent": 3}');
  select * into r from life_push_runs;
  assert r.last_result = 'ok' and r.last_ok_at is not null and r.public_key = k, 'corrida buena';
  assert (r.last_stats ->> 'sent')::int = 3, 'números de la corrida';
  perform life_push_record_run('error', k, null, repeat('x', 500));
  select * into r from life_push_runs;
  assert r.last_result = 'error' and r.last_ok_at is not null, 'un error no borra cuándo anduvo';
  assert length(r.last_error) = 300, 'error recortado';
  assert (r.last_stats ->> 'sent')::int = 3, 'quedan los números de la última buena';
  perform life_push_record_run('bad_keys', 'no vale!');
  select * into r from life_push_runs;
  assert r.public_key = k, 'una clave con otro formato no se guarda';
  begin perform life_push_record_run('otra cosa'); assert false, 'resultado inválido';
  exception when invalid_parameter_value then null; end;
  assert (select count(*) from life_push_runs) = 1, 'una sola fila';
end $$;

-- Fallos seguidos: al 10.º se borra; los demás quedan
do $$
declare i integer; n integer;
begin
  for i in 1..9 loop
    n := life_push_note_failures(array['dddddddd-7000-0000-0000-000000000003'::uuid]);
    assert n = 0, 'todavía no';
  end loop;
  assert (select failures from life_push_subscriptions where id = 'dddddddd-7000-0000-0000-000000000003') = 9, 'nueve fallos';
  n := life_push_note_failures(array['dddddddd-7000-0000-0000-000000000003'::uuid, 'dddddddd-7000-0000-0000-000000000002'::uuid]);
  assert n = 1, 'al décimo se borra';
  assert not exists (select 1 from life_push_subscriptions where id = 'dddddddd-7000-0000-0000-000000000003'), 'borrado';
  assert (select failures from life_push_subscriptions where id = 'dddddddd-7000-0000-0000-000000000002') = 1, 'el otro suma uno';
  assert life_push_note_failures('{}') = 0 and life_push_note_failures(null) = 0, 'sin ids no hace nada';
end $$;

-- El panel ve la corrida y la clave pública
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-7000-0000-0000-000000000003', true);
do $$
declare s jsonb;
begin
  s := admin_push_status();
  assert s -> 'run' ->> 'last_result' = 'bad_keys', 'última corrida';
  assert s -> 'run' ->> 'public_key' like 'BOrR%', 'clave pública con la que firma';
  assert (s ->> 'subscriptions')::int = 2 and (s ->> 'failing')::int = 1, 'dispositivos después de limpiar';
end $$;
reset role;

rollback;
