-- Fase 3: guardar ≠ publicar, versiones, restaurar, concurrencia y privacidad.
-- Todo corre en una transacción que se descarta al final.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');

insert into public.profiles (id, user_id, username, display_name, status, contact_card)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft',
        '{"enabled": false}');
insert into public.profile_modules (id, profile_id, type, title, content, position)
values ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'link', 'Portfolio',
        '{"url": "https://ana.design"}', 10);

-- La identidad se creó sola
do $$ begin
  assert (select identity_id is not null from profiles where username = 'ana'), 'el perfil nuevo no tiene identidad';
end $$;

-- ── Borrador: el visitante no lo ve, el dueño sí ─────────────────────────────
set local role anon;
do $$ begin
  assert get_public_profile('ana') ->> 'status' = 'unavailable', 'el borrador no debería ser visible';
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert get_public_profile('ana') ->> 'display_name' = 'Ana', 'el dueño debería ver su borrador';
  assert (space_publish_state('11111111-0000-0000-0000-000000000001') ->> 'dirty')::boolean, 'sin publicar = cambios pendientes';
end $$;

-- ── Publicar → versión 1 ─────────────────────────────────────────────────────
do $$ declare r jsonb; begin
  r := publish_space('11111111-0000-0000-0000-000000000001');
  assert (r ->> 'version_number')::int = 1, 'la primera publicación es la versión 1';
  assert not (space_publish_state('11111111-0000-0000-0000-000000000001') ->> 'dirty')::boolean, 'recién publicado no hay cambios';
end $$;

-- ── Editar no cambia lo público ──────────────────────────────────────────────
do $$ declare rev_before int; begin
  select revision into rev_before from profiles where username = 'ana';
  update profiles set display_name = 'Ana Estudio' where username = 'ana';
  update profile_modules set title = 'Trabajos' where id = '22222222-0000-0000-0000-000000000001';
  assert (select revision from profiles where username = 'ana') = rev_before + 1, 'editar sube la revisión';
  assert (space_publish_state('11111111-0000-0000-0000-000000000001') ->> 'dirty')::boolean, 'debería haber cambios sin publicar';
end $$;
reset role;

set local role anon;
do $$ declare p jsonb := get_public_profile('ana'); begin
  assert p ->> 'display_name' = 'Ana', 'el visitante debe seguir viendo la versión publicada';
  assert p -> 'modules' -> 0 ->> 'title' = 'Portfolio', 'los módulos públicos no cambian hasta publicar';
  assert not (p ? 'contact_card'), 'la tarjeta de contacto nunca va en la respuesta pública';
end $$;
reset role;

-- ── Publicar los cambios → versión 2; publicar sin cambios no crea otra ──────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ declare rev_before int; r jsonb; begin
  select revision into rev_before from profiles where username = 'ana';
  r := publish_space('11111111-0000-0000-0000-000000000001', 'Nuevo nombre');
  assert (r ->> 'version_number')::int = 2, 'segunda publicación = versión 2';
  assert (select revision from profiles where username = 'ana') = rev_before, 'publicar no sube la revisión';
  r := publish_space('11111111-0000-0000-0000-000000000001');
  assert (r ->> 'version_number')::int = 2, 'publicar sin cambios no crea una versión repetida';
end $$;
reset role;

set local role anon;
do $$ begin
  assert get_public_profile('ana') ->> 'display_name' = 'Ana Estudio', 'después de publicar se ve lo nuevo';
end $$;
reset role;

-- ── Restaurar la versión 1 → versión 3, Studio vuelve a ese estado ───────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
insert into profile_modules (id, profile_id, type, title, content, position)
values ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'text', 'Agregado después', '{"text": "x"}', 20);
do $$ declare v1 uuid; r jsonb; begin
  select id into v1 from profile_versions where version_number = 1
    and profile_id = '11111111-0000-0000-0000-000000000001';
  r := restore_space_version(v1);
  assert (r ->> 'version_number')::int = 3, 'restaurar crea la versión 3';
  assert (select restored_from from profile_versions where id = (r ->> 'version_id')::uuid) = v1, 'queda registrado de dónde viene';
  assert (select display_name from profiles where username = 'ana') = 'Ana', 'Studio vuelve al nombre de la versión 1';
  assert (select title from profile_modules where id = '22222222-0000-0000-0000-000000000001') = 'Portfolio', 'el módulo vuelve a su título';
  assert (select visibility from profile_modules where id = '22222222-0000-0000-0000-000000000002') = 'hidden', 'lo agregado después queda oculto';
  assert (select deleted_at is null from profile_modules where id = '22222222-0000-0000-0000-000000000002'), 'restaurar no borra módulos';
  assert (select count(*) from profile_versions where profile_id = '11111111-0000-0000-0000-000000000001') = 3, 'el historial se conserva';
  assert not (space_publish_state('11111111-0000-0000-0000-000000000001') ->> 'dirty')::boolean, 'después de restaurar no hay cambios pendientes';
end $$;
reset role;

set local role anon;
do $$ declare p jsonb := get_public_profile('ana'); begin
  assert p ->> 'display_name' = 'Ana', 'el visitante ve lo restaurado';
  assert jsonb_array_length(p -> 'modules') = 1, 'el módulo oculto no se publica';
end $$;
reset role;

-- ── Otro usuario no puede publicar, restaurar ni ver el estado ───────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  begin
    perform publish_space('11111111-0000-0000-0000-000000000001');
    assert false, 'otro usuario no debería poder publicar';
  exception when insufficient_privilege then null; end;
  begin
    perform space_publish_state('11111111-0000-0000-0000-000000000001');
    assert false, 'otro usuario no debería ver el estado';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from profile_versions) = 0, 'otro usuario no ve versiones ajenas';
end $$;
reset role;

-- ── El visitante no puede publicar ni escribir versiones ─────────────────────
set local role anon;
do $$ begin
  begin
    perform publish_space('11111111-0000-0000-0000-000000000001');
    assert false, 'anon no debería poder publicar';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ── vCard: sale de lo publicado ──────────────────────────────────────────────
update profiles set contact_card = '{"enabled": true, "email": "ana@x"}' where username = 'ana';
set local role anon;
do $$ begin
  assert get_profile_contact_card('11111111-0000-0000-0000-000000000001') is null, 'la vCard habilitada sin publicar no sale';
end $$;
reset role;

-- ── Username nuevo: la URL pública responde con el vigente ───────────────────
update profiles set username = 'ana-studio' where username = 'ana';
set local role anon;
do $$ begin
  assert get_public_profile('ana-studio') ->> 'username' = 'ana-studio', 'responde con el username vigente';
  assert get_public_profile('ana') ->> 'redirect' = 'ana-studio', 'el username anterior redirige';
end $$;
reset role;

-- ── Privado: nadie más lo ve; no redirige ────────────────────────────────────
update profiles set visibility = 'private' where username = 'ana-studio';
set local role anon;
do $$ begin
  assert get_public_profile('ana-studio') ->> 'status' = 'unavailable', 'un Space privado no se muestra';
  assert get_public_profile('ana') is null, 'un Space privado no recibe redirecciones';
end $$;
reset role;

rollback;
