-- Fase 2: identidades, Spaces y permisos.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');

-- El alta de un negocio crea su perfil, y el perfil su identidad (riesgo R5)
insert into public.restaurants (owner_id, slug, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'cafe-luna', 'Café Luna');
do $$ begin
  assert (select count(*) from identities where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1, 'una identidad por dueño';
  assert (select i.primary_space_id = p.id from profiles p join identities i on i.id = p.identity_id where p.username = 'cafe-luna'),
    'el perfil principal queda marcado en la identidad';
end $$;

-- Un segundo negocio del mismo dueño reutiliza la identidad
insert into public.restaurants (owner_id, slug, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'luna-bar', 'Luna Bar');
do $$ begin
  assert (select count(distinct identity_id) from profiles where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1, 'misma identidad para sus Spaces';
end $$;

-- No se puede colgar un Space de una identidad ajena
insert into public.profiles (user_id, username, display_name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'beto', 'Beto');
do $$ begin
  begin
    update profiles set identity_id = (select id from identities where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') where username = 'beto';
    assert false, 'debería rechazar una identidad ajena';
  exception when insufficient_privilege then null; end;
end $$;

-- Permisos del dueño: lee su identidad, no puede crear otra ni escribir versiones
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert (select count(*) from identities) = 1, 'el dueño sólo ve su identidad';
  begin
    insert into identities (user_id) values ('aaaaaaaa-0000-0000-0000-000000000001');
    assert false, 'no debería poder crear identidades';
  exception when insufficient_privilege then null; end;
  begin
    insert into profile_versions (profile_id, version_number, snapshot)
    select id, 99, '{}' from profiles where username = 'cafe-luna';
    assert false, 'no debería poder escribir versiones';
  exception when insufficient_privilege then null; end;
  begin
    perform mycen_space_snapshot((select id from profiles where username = 'cafe-luna'));
    assert false, 'la función interna de snapshot no es pública';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- El visitante no lee ninguna tabla nueva
set local role anon;
do $$ begin
  begin perform 1 from identities;      assert false, 'anon lee identities';      exception when insufficient_privilege then null; end;
  begin perform 1 from profile_versions; assert false, 'anon lee profile_versions'; exception when insufficient_privilege then null; end;
  begin perform 1 from content_objects;  assert false, 'anon lee content_objects';  exception when insufficient_privilege then null; end;
end $$;
reset role;

rollback;
