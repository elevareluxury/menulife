-- Fase 5: proyectos, publicación propia, página pública y módulos project/portfolio.
-- Todo corre en una transacción que se descarta al final.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');

insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft');

-- ── El dueño crea un proyecto con bloques (como lo hace Studio) ──────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

insert into content_objects (id, identity_id, type, title, slug, summary)
select '33333333-0000-0000-0000-000000000001', identity_id, 'project', 'Café Luna', 'cafe-luna', 'Identidad 2025'
from profiles where username = 'ana';
insert into content_objects (id, identity_id, type, title, slug)
select '33333333-0000-0000-0000-000000000002', identity_id, 'project', 'Borrador', 'borrador'
from profiles where username = 'ana';
insert into content_blocks (content_object_id, type, position, data) values
  ('33333333-0000-0000-0000-000000000001', 'paragraph', 10, '{"text": "Una marca para un café."}'),
  ('33333333-0000-0000-0000-000000000001', 'heading',    5, '{"text": "El desafío"}');

insert into profile_modules (id, profile_id, type, title, content, position) values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'portfolio', 'Trabajos', '{}', 10),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'project', null,
   '{"project_id": "33333333-0000-0000-0000-000000000002"}', 20);

-- Studio no puede publicar escribiendo la tabla
do $$ begin
  begin
    update content_objects set status = 'published' where id = '33333333-0000-0000-0000-000000000001';
    assert false, 'publicar sin la RPC debería fallar';
  exception when insufficient_privilege or check_violation then null; end;
  begin
    update content_objects set published_snapshot = '{}' where id = '33333333-0000-0000-0000-000000000001';
    assert false, 'el snapshot publicado no se escribe directo';
  exception when insufficient_privilege then null; end;
  assert (project_publish_state('33333333-0000-0000-0000-000000000001') ->> 'dirty')::boolean, 'sin publicar = cambios pendientes';
end $$;

-- ── Publicar el proyecto ─────────────────────────────────────────────────────
do $$ declare r jsonb; s jsonb; begin
  r := publish_project('33333333-0000-0000-0000-000000000001');
  assert r ->> 'status' = 'published', 'queda publicado';
  select published_snapshot into s from content_objects where id = '33333333-0000-0000-0000-000000000001';
  assert s -> 'blocks' -> 0 -> 'data' ->> 'text' = 'El desafío', 'los bloques van en orden';
  assert not (project_publish_state('33333333-0000-0000-0000-000000000001') ->> 'dirty')::boolean, 'recién publicado no hay cambios';
  update content_objects set title = 'Café Luna (nuevo)' where id = '33333333-0000-0000-0000-000000000001';
  assert (project_publish_state('33333333-0000-0000-0000-000000000001') ->> 'dirty')::boolean, 'editar deja cambios sin publicar';
  perform publish_space('11111111-0000-0000-0000-000000000001');
end $$;
reset role;

-- ── El visitante ve lo publicado ─────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ declare p jsonb := get_public_project('ana', 'cafe-luna'); m jsonb; begin
  assert p ->> 'title' = 'Café Luna', 'el visitante ve el título publicado, no el borrador';
  assert jsonb_array_length(p -> 'blocks') = 2, 'con sus bloques';
  assert p -> 'space' ->> 'username' = 'ana', 'con los datos del Space';
  assert get_public_project('ana', 'borrador') ->> 'status' = 'unavailable', 'un proyecto sin publicar no se ve';
  assert get_public_project('ana', 'no-existe') is null, 'proyecto inexistente';

  m := get_public_profile('ana') -> 'modules';
  assert m -> 0 ->> 'type' = 'portfolio', 'el portfolio está';
  assert jsonb_array_length(m -> 0 -> 'projects') = 1, 'el portfolio muestra sólo los publicados';
  assert m -> 0 -> 'projects' -> 0 ->> 'path' = '/ana/projects/cafe-luna', 'con su URL';
  assert m -> 0 -> 'projects' -> 0 ->> 'title' = 'Café Luna', 'con los datos publicados';
  assert jsonb_array_length(m -> 1 -> 'projects') = 0, 'un módulo de proyecto sin publicar no muestra nada';
end $$;
reset role;

-- ── Publicar otro proyecto actualiza el portfolio sin volver a publicar el Space ─
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  -- el dueño ve su borrador en la página del proyecto
  assert get_public_project('ana', 'borrador') ->> 'title' = 'Borrador', 'el dueño ve su borrador';
  perform publish_project('33333333-0000-0000-0000-000000000002');
end $$;
reset role;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ declare m jsonb := get_public_profile('ana') -> 'modules'; begin
  assert jsonb_array_length(m -> 0 -> 'projects') = 2, 'el portfolio suma el proyecto publicado';
  assert m -> 1 -> 'projects' -> 0 ->> 'title' = 'Borrador', 'el proyecto destacado aparece';
end $$;
reset role;

-- ── Selección propia, no listados y privados ─────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
update content_objects set visibility = 'unlisted' where id = '33333333-0000-0000-0000-000000000002';
update profile_modules set content = '{"project_ids": ["33333333-0000-0000-0000-000000000002", "33333333-0000-0000-0000-000000000001", "33333333-0000-0000-0000-000000000002", "x"]}'
  where id = '22222222-0000-0000-0000-000000000001';
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;
reset role;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ declare m jsonb := get_public_profile('ana') -> 'modules'; begin
  assert jsonb_array_length(m -> 0 -> 'projects') = 2, 'selección sin repetidos ni ids inválidos';
  assert m -> 0 -> 'projects' -> 0 ->> 'slug' = 'borrador', 'respeta el orden elegido (y muestra el no listado elegido)';
  assert get_public_project('ana', 'borrador') ->> 'visibility' = 'unlisted', 'el no listado se ve con el link';
end $$;
reset role;

update content_objects set visibility = 'private' where id = '33333333-0000-0000-0000-000000000002';
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert jsonb_array_length(get_public_profile('ana') -> 'modules' -> 0 -> 'projects') = 1, 'el privado no aparece';
  assert get_public_project('ana', 'borrador') ->> 'status' = 'unavailable', 'el privado no se ve';
end $$;
reset role;

-- ── Despublicar y archivar, directo desde Studio ─────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
update content_objects set status = 'draft' where id = '33333333-0000-0000-0000-000000000001';
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert get_public_project('ana', 'cafe-luna') ->> 'status' = 'unavailable', 'despublicado no se ve';
  assert jsonb_array_length(get_public_profile('ana') -> 'modules' -> 0 -> 'projects') = 0, 'y sale del portfolio';
end $$;
reset role;

-- ── Otro usuario no puede ver ni publicar proyectos ajenos ───────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from content_objects) = 0, 'no ve proyectos ajenos';
  assert (select count(*) from content_blocks) = 0, 'no ve bloques ajenos';
  begin
    perform publish_project('33333333-0000-0000-0000-000000000001');
    assert false, 'otro usuario no debería poder publicar';
  exception when insufficient_privilege then null; end;
  begin
    perform project_publish_state('33333333-0000-0000-0000-000000000001');
    assert false, 'otro usuario no debería ver el estado';
  exception when insufficient_privilege then null; end;
  assert get_public_project('ana', 'cafe-luna') ->> 'status' = 'unavailable', 'tampoco ve el borrador ajeno';
end $$;
reset role;

-- ── El visitante no lee las tablas ni publica ────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  begin
    perform 1 from content_objects;
    assert false, 'anon no lee content_objects';
  exception when insufficient_privilege then null; end;
  begin
    perform publish_project('33333333-0000-0000-0000-000000000001');
    assert false, 'anon no publica';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ── Username anterior: redirige ──────────────────────────────────────────────
update profiles set username = 'ana-studio' where username = 'ana';
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert get_public_project('ana', 'cafe-luna') ->> 'redirect' = 'ana-studio', 'el username anterior redirige';
end $$;
reset role;

rollback;
