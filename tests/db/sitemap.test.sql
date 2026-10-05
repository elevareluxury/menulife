-- Lanzamiento L2: el sitemap lista sólo lo público.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'caro@x');

insert into public.profiles (id, user_id, username, display_name, status, visibility) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft', 'public'),
  ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'beto', 'Beto', 'draft', 'unlisted'),
  ('33333333-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003', 'caro', 'Caro', 'draft', 'public');

-- Publicar como cada dueño
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
insert into public.profiles (id, user_id, space_slug, display_name, status) values
  ('44444444-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'estudio', 'Estudio', 'draft'),
  ('55555555-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'borrador', 'Borrador', 'draft');
do $$ begin
  perform publish_space('11111111-0000-0000-0000-000000000001');
  perform publish_space('44444444-0000-0000-0000-000000000004');
end $$;
insert into public.content_objects (id, identity_id, type, title, slug, visibility)
select '66666666-0000-0000-0000-000000000006', identity_id, 'project', 'Café Luna', 'cafe-luna', 'public'
from profiles where id = '11111111-0000-0000-0000-000000000001';
insert into public.content_objects (id, identity_id, type, title, slug, visibility)
select '77777777-0000-0000-0000-000000000007', identity_id, 'project', 'Secreto', 'secreto', 'unlisted'
from profiles where id = '11111111-0000-0000-0000-000000000001';
do $$ begin
  perform publish_project('66666666-0000-0000-0000-000000000006');
  perform publish_project('77777777-0000-0000-0000-000000000007');
end $$;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin perform publish_space('22222222-0000-0000-0000-000000000002'); end $$;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ begin perform publish_space('33333333-0000-0000-0000-000000000003'); end $$;
reset role;

-- Caro queda suspendida
select set_config('mycen.moderating', 'on', true);
update profiles set suspended_at = now() where username = 'caro';
select set_config('mycen.moderating', '', true);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare paths text[];
begin
  select array_agg(path order by path) into paths from public_sitemap();
  assert paths = array['/ana', '/ana/estudio', '/ana/projects/cafe-luna'], paths::text;
  assert (select count(*) from public_sitemap() where lastmod is null) = 0, 'todas con fecha';
  assert (select count(*) from public_sitemap(0, 1)) = 1, 'respeta el límite';
  assert (select count(*) from public_sitemap(2, 10)) = 1, 'respeta el desplazamiento';
  begin
    perform 1 from profiles;
    assert false, 'el visitante sigue sin leer tablas';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Si el principal se suspende, desaparecen también sus Spaces y proyectos
select set_config('mycen.moderating', 'on', true);
update profiles set suspended_at = now() where username = 'ana';
select set_config('mycen.moderating', '', true);
do $$ begin
  assert (select count(*) from public_sitemap()) = 0, 'nada de una identidad suspendida';
end $$;

rollback;
