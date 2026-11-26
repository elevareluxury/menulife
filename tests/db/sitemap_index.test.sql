-- Sitemap en partes (20261206000001): índice + partes leídas por id, sin el corte de "Max rows".
\ir ../../supabase/migrations/20261206000001_sitemap_index.sql
begin;

-- Partes de 2 para probar el corte sin miles de perfiles
create or replace function public.mycen_sitemap_chunk()
returns integer language sql immutable set search_path = public, extensions, pg_temp as $$ select 2 $$;

insert into auth.users (id, email) values
  ('aaaaaaaa-7000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-7000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-7000-0000-0000-000000000003', 'caro@x'),
  ('dddddddd-7000-0000-0000-000000000004', 'dora@x'),
  ('eeeeeeee-7000-0000-0000-000000000005', 'eva@x');
insert into public.profiles (id, user_id, username, display_name, status, visibility, is_primary) values
  ('11111111-7000-0000-0000-000000000001', 'aaaaaaaa-7000-0000-0000-000000000001', 'ana-sm', 'Ana', 'draft', 'public', true),
  ('22222222-7000-0000-0000-000000000002', 'bbbbbbbb-7000-0000-0000-000000000002', 'beto-sm', 'Beto', 'draft', 'unlisted', true),
  ('33333333-7000-0000-0000-000000000003', 'cccccccc-7000-0000-0000-000000000003', 'caro-sm', 'Caro', 'draft', 'public', true),
  ('44444444-7000-0000-0000-000000000004', 'dddddddd-7000-0000-0000-000000000004', 'dora-sm', 'Dora', 'draft', 'public', true),
  ('55555555-7000-0000-0000-000000000005', 'eeeeeeee-7000-0000-0000-000000000005', 'eva-sm', 'Eva', 'draft', 'public', true);

set local role authenticated;
do $$
declare u text;
begin
  foreach u in array array['aaaaaaaa', 'bbbbbbbb', 'cccccccc', 'dddddddd', 'eeeeeeee'] loop
    perform set_config('request.jwt.claim.sub', u || '-7000-0000-0000-00000000000' ||
      (array_position(array['aaaaaaaa', 'bbbbbbbb', 'cccccccc', 'dddddddd', 'eeeeeeee'], u))::text, true);
    perform publish_space((select id from profiles where user_id::text = current_setting('request.jwt.claim.sub')));
  end loop;
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-7000-0000-0000-000000000001', true);
insert into public.content_objects (id, identity_id, type, title, slug, visibility)
select '66666666-7000-0000-0000-000000000006', identity_id, 'project', 'Café Luna', 'cafe-luna', 'public'
from profiles where id = '11111111-7000-0000-0000-000000000001';
do $$ begin perform publish_project('66666666-7000-0000-0000-000000000006'); end $$;
reset role;

-- Caro suspendida; todos creados hace un mes
select set_config('mycen.moderating', 'on', true);
update profiles set suspended_at = now() where username = 'caro-sm';
select set_config('mycen.moderating', '', true);
update profiles set created_at = now() - interval '30 days';

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare idx jsonb; part jsonb; paths text[] := '{}'; i integer;
begin
  idx := public_sitemap_index();
  -- Spaces públicos: ana, dora, eva (beto no listado, caro suspendida) → 2 partes de 2; 1 proyecto → 1 parte
  assert jsonb_array_length(idx) = 3, format('3 partes (%s)', idx);
  assert idx -> 0 ->> 'kind' = 'p' and idx -> 1 ->> 'kind' = 'p' and idx -> 2 ->> 'kind' = 'j', 'Spaces primero';
  assert (idx -> 0 ->> 'from')::uuid = '11111111-7000-0000-0000-000000000001', 'la primera parte empieza en el id más chico';
  assert (idx -> 1 ->> 'from')::uuid = '55555555-7000-0000-0000-000000000005', 'la segunda, en el tercer id';
  assert idx -> 0 ->> 'lastmod' is not null, 'con fecha';

  -- Recorrer las partes da todo, sin repetir ni saltear
  for i in 0 .. jsonb_array_length(idx) - 1 loop
    part := public_sitemap_page(idx -> i ->> 'kind', (idx -> i ->> 'from')::uuid);
    assert jsonb_array_length(part) <= 2, 'cada parte respeta el tamaño';
    paths := paths || array(select x ->> 'path' from jsonb_array_elements(part) x);
  end loop;
  assert paths = array['/ana-sm', '/dora-sm', '/eva-sm', '/ana-sm/projects/cafe-luna'], paths::text;

  -- Entradas raras
  assert public_sitemap_page('x', '11111111-7000-0000-0000-000000000001') = '[]'::jsonb, 'tipo desconocido = nada';
  assert public_sitemap_page('p', null) = '[]'::jsonb, 'sin inicio = nada';

  -- El visitante sigue sin leer tablas
  begin
    perform 1 from profiles;
    assert false, 'anon no lee profiles';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Spaces nuevos (menos de 7 días) no entran
update profiles set created_at = now() where username = 'eva-sm';
do $$ begin
  assert not exists (select 1 from jsonb_array_elements(public_sitemap_page('p', '00000000-0000-0000-0000-000000000000')) x
                     where x ->> 'path' = '/eva-sm'), 'eva todavía no';
  assert mycen_mfa_pending_rpc_allowed('public_sitemap_index') and mycen_mfa_pending_rpc_allowed('public_sitemap_page'),
    'son públicas también para una sesión sin el segundo paso';
end $$;

rollback;
