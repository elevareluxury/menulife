-- "Elegí tu nombre": registros por lugar del campo (admin_signup_sources).
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@x');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');

-- Sin sesión se puede anotar el registro abierto con el lugar
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert track_product_event('signup_started', '{"channel": "hero"}') = 'ok', 'registro abierto desde el hero';
end $$;
reset role;

delete from product_events;
insert into product_events (user_id, event, props, created_at) values
  (null, 'signup_started', '{"channel": "hero"}', now() - interval '2 days'),
  (null, 'signup_started', '{"channel": "hero"}', now() - interval '2 days'),
  (null, 'signup_started', '{"channel": "pie", "ref": "ana"}', now() - interval '1 day'),
  (null, 'signup_started', '{}', now() - interval '1 day'),
  (null, 'signup_started', '{"channel": "inventado"}', now() - interval '1 day'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'signup_completed', '{"channel": "hero"}', now() - interval '2 days'),
  -- La misma cuenta dos veces cuenta una
  ('aaaaaaaa-0000-0000-0000-000000000001', 'signup_completed', '{"channel": "hero"}', now() - interval '2 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'signup_completed', '{"ref": "ana"}', now() - interval '1 day'),
  -- Fuera del período
  (null, 'signup_started', '{"channel": "perfil"}', now() - interval '60 days');

-- Una cuenta común no lo puede leer
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  perform admin_signup_sources(30);
  assert false, 'sólo super-admins';
exception when others then
  if sqlerrm like '%sólo super-admins%' then raise; end if;
end $$;

-- El super-admin ve los cinco lugares, en orden
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ declare m jsonb; begin
  m := admin_signup_sources(30);
  assert jsonb_array_length(m) = 5, 'cinco lugares';
  assert m -> 0 = '{"place": "hero", "started": 2, "completed": 1}'::jsonb, 'hero: ' || (m -> 0)::text;
  assert m -> 1 = '{"place": "cierre", "started": 0, "completed": 0}'::jsonb, 'cierre: ' || (m -> 1)::text;
  assert m -> 2 = '{"place": "perfil", "started": 0, "completed": 0}'::jsonb, 'perfil fuera del período: ' || (m -> 2)::text;
  assert m -> 3 = '{"place": "pie", "started": 1, "completed": 0}'::jsonb, 'pie: ' || (m -> 3)::text;
  assert m -> 4 = '{"place": "otro", "started": 2, "completed": 1}'::jsonb, 'otro (sin lugar o desconocido): ' || (m -> 4)::text;
end $$;
reset role;

rollback;
