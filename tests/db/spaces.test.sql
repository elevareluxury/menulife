-- Fase 10: varios Spaces por cuenta (/ana y /ana/estudio), límite de 5, archivar y duplicar.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');

insert into public.profiles (id, user_id, username, display_name, status, contact_card)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft',
        '{"enabled": true, "email": "ana@x"}');
-- Beto sólo tiene un negocio (Space raíz con username propio, no principal)
insert into public.profiles (id, user_id, username, display_name, status, is_primary)
values ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'cafe-beto', 'Café', 'published', false);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;

-- ── Crear un Space dentro del principal ──────────────────────────────────────
insert into public.profiles (id, user_id, space_slug, display_name, status, contact_card)
values ('33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', ' Estudio ', 'Estudio Ana', 'draft',
        '{"enabled": true, "email": "estudio@x"}');
insert into public.profile_modules (profile_id, type, title, content, position)
values ('33333333-0000-0000-0000-000000000003', 'link', 'Portfolio', '{"url": "https://ana.design"}', 10);

do $$ begin
  assert (select space_slug from profiles where id = '33333333-0000-0000-0000-000000000003') = 'estudio', 'el slug se normaliza';
  assert (select not is_primary and username is null from profiles where id = '33333333-0000-0000-0000-000000000003'),
    'el Space secundario no es principal ni tiene username';
  assert (select identity_id from profiles where id = '33333333-0000-0000-0000-000000000003')
       = (select identity_id from profiles where id = '11111111-0000-0000-0000-000000000001'), 'misma identidad';

  begin
    insert into profiles (user_id, space_slug, display_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'estudio', 'Otro');
    assert false, 'slug repetido';
  exception when unique_violation then null; end;
  begin
    insert into profiles (user_id, space_slug, display_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'projects', 'X');
    assert false, 'slug reservado';
  exception when others then assert sqlerrm = 'SPACE_SLUG_RESERVED', sqlerrm; end;
  begin
    insert into profiles (user_id, space_slug, display_name) values ('aaaaaaaa-0000-0000-0000-000000000001', '-mal-', 'X');
    assert false, 'slug inválido';
  exception when others then assert sqlerrm = 'SPACE_SLUG_INVALID', sqlerrm; end;
  begin
    insert into profiles (user_id, username, space_slug, display_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana-dos', 'dos', 'X');
    assert false, 'no puede tener username y slug';
  exception when check_violation then null; end;
  begin
    update profiles set space_slug = 'raiz' where id = '11111111-0000-0000-0000-000000000001';
    assert false, 'el principal no pasa a secundario';
  exception when others then assert sqlerrm = 'SPACE_ADDRESS_LOCKED', sqlerrm; end;
  begin
    update profiles set status = 'archived' where id = '11111111-0000-0000-0000-000000000001';
    assert false, 'el principal no se archiva';
  exception when others then assert sqlerrm = 'PRIMARY_NOT_ARCHIVABLE', sqlerrm; end;
end $$;

-- ── Visitante: draft no se ve; publicado sí, en /ana/estudio ─────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert get_public_profile('ana/estudio') ->> 'status' = 'unavailable', 'en borrador no se ve';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ declare p jsonb; begin
  p := get_public_profile('ana/estudio');
  assert p ->> 'is_owner' = 'true' and p ->> 'handle' = 'ana/estudio', 'el dueño ve su borrador';
  perform publish_space('33333333-0000-0000-0000-000000000003');
end $$;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{"user-agent": "Mozilla/5.0", "x-forwarded-for": "1.1.1.1"}', true);
do $$ declare p jsonb; begin
  p := get_public_profile('Ana/Estudio');
  assert p ->> 'display_name' = 'Estudio Ana', 'se ve publicado';
  assert p ->> 'handle' = 'ana/estudio' and p ->> 'username' = 'ana' and p ->> 'space_slug' = 'estudio', 'con su dirección';
  assert jsonb_array_length(p -> 'modules') = 1, 'con sus módulos';
  assert get_public_profile('ana') ->> 'display_name' = 'Ana', 'el principal sigue igual';
  assert get_public_profile('ana') ->> 'handle' = 'ana', 'handle del principal';
  assert get_public_profile('ana/nada') is null, 'slug inexistente';
  assert get_public_profile('cafe-beto/estudio') is null, 'sólo el principal tiene Spaces adentro';
  assert get_public_profile('ana/estudio/x') is null, 'dirección inválida';
  assert get_profile_contact_card('33333333-0000-0000-0000-000000000003') ->> 'handle' = 'ana/estudio', 'vCard con su dirección';
  assert get_profile_contact_card('33333333-0000-0000-0000-000000000003') ->> 'email' = 'estudio@x', 'y sus datos';
  assert report_profile('ana/estudio', 'spam') = 'ok', 'se puede denunciar';
  -- Analítica propia
  perform track_profile_event('33333333-0000-0000-0000-000000000003', 'view');
end $$;
reset role;
do $$ begin
  assert (select count(*) from profile_events where profile_id = '33333333-0000-0000-0000-000000000003') = 1, 'la visita es del Space';
  assert (select count(*) from profile_events where profile_id = '11111111-0000-0000-0000-000000000001') = 0, 'no del principal';
  assert (select profile_id from profile_reports) = '33333333-0000-0000-0000-000000000003', 'la denuncia es del Space';
end $$;

-- ── Cambiar el username del principal: /ana/estudio redirige ─────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
update profiles set username = 'anita' where id = '11111111-0000-0000-0000-000000000001';
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert get_public_profile('ana/estudio') ->> 'redirect' = 'anita/estudio', 'redirige con el username nuevo';
  assert get_public_profile('ana/nada') is null, 'sin revelar slugs que no existen';
  assert get_public_profile('anita/estudio') ->> 'handle' = 'anita/estudio', 'la dirección nueva';
end $$;

-- ── Duplicar ─────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  begin
    perform duplicate_space('33333333-0000-0000-0000-000000000003', 'copia');
    assert false, 'no se duplica un Space ajeno';
  exception when insufficient_privilege then null; end;
  begin
    insert into profiles (user_id, space_slug, display_name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'algo', 'X');
    assert false, 'sin principal no hay Spaces adentro';
  exception when others then assert sqlerrm = 'NO_PRIMARY_SPACE', sqlerrm; end;
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ declare v_id uuid; begin
  v_id := duplicate_space('33333333-0000-0000-0000-000000000003', 'estudio-2', 'Copia');
  assert (select status from profiles where id = v_id) = 'draft', 'la copia nace en borrador';
  assert (select display_name || '|' || space_slug || '|' || onboarding_step from profiles where id = v_id) = 'Copia|estudio-2|5',
    'con nombre, dirección y sin onboarding';
  assert (select contact_card ->> 'email' from profiles where id = v_id) = 'estudio@x', 'copia los datos';
  assert (select count(*) from profile_modules where profile_id = v_id) = 1, 'copia los módulos';
  assert (select id from profile_modules where profile_id = v_id)
      <> (select id from profile_modules where profile_id = '33333333-0000-0000-0000-000000000003'), 'con ids nuevos';
  assert (select published_version_id is null from profiles where id = v_id), 'sin versiones';
  -- principal + estudio + estudio-2 = 3 → se pueden 2 más
  perform duplicate_space('11111111-0000-0000-0000-000000000001', 'tres');
  perform duplicate_space('11111111-0000-0000-0000-000000000001', 'cuatro');
  begin
    perform duplicate_space('11111111-0000-0000-0000-000000000001', 'cinco');
    assert false, 'tope de 5 Spaces';
  exception when others then assert sqlerrm = 'SPACE_LIMIT_REACHED', sqlerrm; end;

  -- Archivar libera un lugar; sacarlo del archivo con el tope lleno no se puede
  update profiles set status = 'archived' where space_slug = 'tres';
  perform duplicate_space('11111111-0000-0000-0000-000000000001', 'cinco');
  begin
    update profiles set status = 'draft' where space_slug = 'tres';
    assert false, 'restaurar respeta el tope';
  exception when others then assert sqlerrm = 'SPACE_LIMIT_REACHED', sqlerrm; end;
end $$;
reset role;

-- El alta de un negocio no se frena por el tope
insert into public.restaurants (owner_id, slug, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'bar-ana', 'Bar de Ana');
do $$ begin
  assert exists (select 1 from profiles where username = 'bar-ana'), 'el negocio tiene su Space aunque haya 5';
end $$;

-- ── Un principal suspendido oculta sus Spaces ────────────────────────────────
select set_config('mycen.moderating', 'on', true);
update profiles set suspended_at = now() where id = '11111111-0000-0000-0000-000000000001';
select set_config('mycen.moderating', '', true);
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert get_public_profile('anita/estudio') ->> 'status' = 'unavailable', 'el Space no se ve';
  assert get_profile_contact_card('33333333-0000-0000-0000-000000000003') is null, 'ni su vCard';
  assert report_profile('anita/estudio', 'spam') = 'not_found', 'ni se denuncia';
  assert get_public_profile('ana/estudio') is null, 'ni redirige';
end $$;
reset role;

rollback;
