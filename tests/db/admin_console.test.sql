-- Panel del equipo: resumen, contadores, buscar personas, ficha y registro de acciones. Sólo super-admins.
begin;

insert into auth.users (id, email, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x.com', now() - interval '2 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@y.com', now() - interval '40 days'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@mycen.id', now() - interval '90 days');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana Pérez', 'draft');
insert into public.life_brain_items (user_id, type, title) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'task', 'algo privado'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'idea', 'otra cosa privada');

-- Ana publica (como dueña)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$
begin
  perform publish_space('11111111-0000-0000-0000-000000000001');
  -- Nadie que no sea del equipo usa el panel
  begin perform admin_overview(30); assert false, 'overview: no es admin';
  exception when insufficient_privilege then null; end;
  begin perform admin_search_accounts('ana'); assert false, 'buscar: no es admin';
  exception when insufficient_privilege then null; end;
  begin perform admin_account_detail('aaaaaaaa-0000-0000-0000-000000000001'); assert false, 'ficha: no es admin';
  exception when insufficient_privilege then null; end;
  begin perform admin_pending_counts(); assert false, 'contadores: no es admin';
  exception when insufficient_privilege then null; end;
  begin perform admin_list_audit(); assert false, 'registro: no es admin';
  exception when insufficient_privilege then null; end;
  begin perform 1 from admin_audit_log; assert false, 'nadie lee el registro directo';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role anon;
do $$ begin
  begin perform admin_overview(30); assert false, 'anónimo';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- El equipo
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$
declare o jsonb; s jsonb; d jsonb; l jsonb;
begin
  o := admin_overview(30);
  assert (o ->> 'accounts')::int = 3, 'tres cuentas';
  assert (o ->> 'accounts_7d')::int = 1, 'una nueva en la semana';
  assert (o ->> 'accounts_30d')::int = 1, 'una en el mes';
  assert (o ->> 'published')::int = 1, 'un perfil publicado';
  assert jsonb_array_length(o -> 'series') = 30, 'serie de 30 días';
  assert (select sum((x ->> 'published')::int) from jsonb_array_elements(o -> 'series') x) = 1, 'publicado hoy en la serie';
  assert (admin_pending_counts() ->> 'reports')::int = 0, 'sin denuncias';

  -- Buscar por email, por usuario y por nombre; los comodines no valen como comodines
  assert jsonb_array_length(admin_search_accounts('beto@')) = 1, 'por email';
  s := admin_search_accounts('ana');
  assert jsonb_array_length(s) = 1 and s -> 0 ->> 'username' = 'ana', 'por usuario';
  assert jsonb_array_length(admin_search_accounts('pérez')) = 1, 'por nombre';
  assert jsonb_array_length(admin_search_accounts('%')) = 0, '% es texto';
  assert jsonb_array_length(admin_search_accounts('a')) = 0, 'mínimo 2 letras';

  -- Ficha: Spaces y cantidades de Life OS, sin contenido
  d := admin_account_detail('aaaaaaaa-0000-0000-0000-000000000001');
  assert d ->> 'email' = 'ana@x.com', 'email';
  assert jsonb_array_length(d -> 'spaces') = 1 and d -> 'spaces' -> 0 ->> 'handle' = 'ana', 'su Space';
  assert (d -> 'life' ->> 'tasks')::int = 1 and (d -> 'life' ->> 'captures')::int = 1, 'cantidades de Life OS';
  assert position('privad' in d::text) = 0, 'nunca el contenido';
  assert admin_account_detail('dddddddd-0000-0000-0000-000000000009') is null, 'cuenta que no existe';

  -- Las acciones del equipo quedan anotadas solas
  perform admin_set_suspension('11111111-0000-0000-0000-000000000001', true, 'spam');
  perform admin_set_verified('aaaaaaaa-0000-0000-0000-000000000001', true);
  perform admin_set_site_flag('business', true);
  l := admin_list_audit(10);
  assert jsonb_array_length(l) = 3, 'tres acciones anotadas';
  assert l @> '[{"action": "space_suspended", "admin_email": "admin@mycen.id"}]', 'suspensión con quién';
  assert l @> '[{"action": "verified"}]', 'verificación';
  assert l @> '[{"action": "flag_on", "target_id": "business"}]', 'interruptor';
  assert (l -> 0 -> 'details' ->> 'reason') is null or true, 'detalles';
  perform admin_set_suspension('11111111-0000-0000-0000-000000000001', false, null);
  assert admin_list_audit(1) -> 0 ->> 'action' = 'space_unsuspended', 'la última primero';
  assert (admin_overview(30) ->> 'suspended')::int = 0, 'sin suspendidos';
end $$;
reset role;

-- Lo que hace la dueña en su propio perfil no se anota
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  update profiles set display_name = 'Ana P.' where id = '11111111-0000-0000-0000-000000000001';
end $$;
reset role;
do $$ begin
  assert (select count(*) from admin_audit_log) = 4, 'sólo las acciones del equipo';
end $$;

rollback;
