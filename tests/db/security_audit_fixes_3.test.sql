-- Auditoría de seguridad, hallazgos bajos (20261201000001): usernames de un perfil suspendido, "publicado" sólo con
-- versión y revisión de links sin huecos.
\ir ../../supabase/migrations/20261201000001_security_audit_fixes_3.sql
begin;

-- Tipos de recurso como en producción (20260612000002): "FOR ALL" con las filas del sistema incluidas
create table public.service_resource_types (id uuid primary key default gen_random_uuid(), restaurant_id uuid,
  name text not null, is_system boolean not null default false);
alter table public.service_resource_types enable row level security;
create policy owner_all on public.service_resource_types for all using (is_system = true
  or restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));
grant select, insert, update, delete on public.service_resource_types to authenticated;
insert into public.service_resource_types (name, is_system) values ('Persona', true);
\ir ../../supabase/migrations/20261201000001_security_audit_fixes_3.sql

insert into auth.users (id, email) values
  ('aaaaaaaa-3000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-3000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-3000-0000-0000-000000000003', 'admin@x');
insert into public.super_admins (user_id) values ('cccccccc-3000-0000-0000-000000000003');
insert into profiles (id, user_id, username, display_name, status, is_primary) values
  ('11111111-3000-0000-0000-000000000001', 'aaaaaaaa-3000-0000-0000-000000000001', 'ana-vieja-sec3', 'Ana', 'draft', true),
  ('22222222-3000-0000-0000-000000000002', 'bbbbbbbb-3000-0000-0000-000000000002', 'beto-sec3', 'Beto', 'draft', true);

-- ── L3. El username anterior de un perfil suspendido queda reservado ─────────
-- Cambia de username (queda en el historial) y después la suspenden
update profiles set username = 'ana-nueva-sec3' where id = '11111111-3000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-3000-0000-0000-000000000003', true);
select admin_set_suspension('11111111-3000-0000-0000-000000000001', true, 'test');

-- Suspendida no puede cambiar su dirección
select set_config('request.jwt.claim.sub', 'aaaaaaaa-3000-0000-0000-000000000001', true);
do $$ begin
  update profiles set username = 'ana-escape-sec3' where id = '11111111-3000-0000-0000-000000000001';
  assert false, 'un perfil suspendido no cambia su username';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Al borrar la cuenta, los dos usernames quedan reservados
do $$ begin
  perform set_config('mycen.deleting_account', 'on', true);
  delete from auth.users where id = 'aaaaaaaa-3000-0000-0000-000000000001';
  perform set_config('mycen.deleting_account', '', true);
  assert exists (select 1 from reserved_usernames where username = 'ana-nueva-sec3'), 'el último queda reservado';
  assert exists (select 1 from reserved_usernames where username = 'ana-vieja-sec3'), 'el anterior también';
  assert check_username('ana-vieja-sec3') <> 'available', 'nadie vuelve a tomar el anterior';
end $$;

-- ── L4. "Publicado" sólo con versión ──────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-3000-0000-0000-000000000002', true);
do $$ begin
  update profiles set status = 'published' where id = '22222222-3000-0000-0000-000000000002';
  assert false, 'la app no publica sin publish_space';
exception when insufficient_privilege then null;
end $$;
do $$
declare v jsonb;
begin
  perform publish_space('22222222-3000-0000-0000-000000000002');
  assert (select status from profiles where id = '22222222-3000-0000-0000-000000000002') = 'published', 'publish_space sí';
end $$;
reset role;

-- Un publicado viejo sin versión recibe la versión 1 al aplicar la migración
insert into auth.users (id, email) values ('dddddddd-3000-0000-0000-000000000004', 'dora@x');
insert into profiles (id, user_id, username, display_name, status, is_primary)
values ('44444444-3000-0000-0000-000000000004', 'dddddddd-3000-0000-0000-000000000004', 'dora-sec3', 'Dora', 'published', true);
\ir ../../supabase/migrations/20261201000001_security_audit_fixes_3.sql
do $$ begin
  assert (select published_version_id from profiles where id = '44444444-3000-0000-0000-000000000004') is not null,
    'el publicado sin versión recibió una';
end $$;

-- ── L6/L10. Revisión de links ─────────────────────────────────────────────────
do $$
declare k text; n integer; got text[];
begin
  k := mycen_set_cron_key();
  update profiles set bio = null where id = '22222222-3000-0000-0000-000000000002';
  insert into profile_modules (profile_id, type, title, content, position) values
    ('22222222-3000-0000-0000-000000000002', 'link', 'Banco', '{"url": "evil.example/login"}', 1),
    ('22222222-3000-0000-0000-000000000002', 'link', 'Otro', '{"url": "\"comillas.example\""}', 2),
    ('22222222-3000-0000-0000-000000000002', 'text', 'Hola', '{"text": "Hola, soy Beto y me gusta el mate"}', 3);
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-3000-0000-0000-000000000002', true);
  perform publish_space('22222222-3000-0000-0000-000000000002');
  perform set_config('request.jwt.claim.sub', '', true);

  select array_agg(url) into got from cron_recent_links(k, now());
  assert 'evil.example/login' = any(got), format('el link sin https también se revisa (%s)', got);
  assert '"comillas.example"' = any(got), 'y el que tiene comillas';
  assert not ('Hola, soy Beto y me gusta el mate' = any(got)), 'un texto común no';

  -- Lo revisado no vuelve; lo que falta, sí (aunque la pasada anterior haya sido hace rato)
  n := cron_mark_links_scanned(k, array['evil.example/login']);
  assert n = 1, 'anota lo revisado';
  select array_agg(url) into got from cron_recent_links(k, now());
  assert not ('evil.example/login' = any(got)), 'lo revisado no vuelve';
  assert '"comillas.example"' = any(got), 'lo que faltaba sigue para la próxima pasada';

  begin
    perform cron_mark_links_scanned('mala', array['x']);
    assert false, 'sin la llave no anota nada';
  exception when insufficient_privilege then null; end;
  assert not has_table_privilege('anon', 'public.mycen_link_scans', 'select'), 'nadie lee lo revisado';
end $$;

-- ── N13. Las filas del sistema no se escriben desde la app ──────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-3000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from service_resource_types where is_system) = 1, 'se siguen viendo';
  update service_resource_types set name = 'Hackeado' where is_system;
  delete from service_resource_types where is_system;
  begin
    insert into service_resource_types (name, is_system) values ('Falso', true);
    assert false, 'nadie crea filas del sistema';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  assert (select name from service_resource_types where is_system) = 'Persona', 'la fila del sistema sigue igual';
end $$;

rollback;
