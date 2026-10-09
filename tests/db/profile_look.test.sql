-- V1 · etapa 03: estructura, tema, acento, huella y perfil vivo (estado y "Disponible").
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');

insert into public.profiles (id, user_id, username, display_name, status, theme)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft',
        '{"layout": "credencial", "mode": "amanecer", "accent": "ion", "huella_variant": "hilos"}');

-- ── Acento más cercano y conversión de perfiles de antes ─────────────────────
do $$ begin
  assert mycen_nearest_accent('#F4705A') = 'plasma', 'coral → plasma';
  assert mycen_nearest_accent('#3B82F6') = 'ion', 'azul → ion';
  assert mycen_nearest_accent('#A78BFA') = 'nebulosa', 'violeta → nebulosa';
  assert mycen_nearest_accent('#22C55E') = 'aurora', 'verde → aurora';
  assert mycen_nearest_accent('#0F7C6E') = 'aurora', 'el acento Amanecer también cuenta';
  assert mycen_nearest_accent('rojo') = 'plasma', 'un valor raro → plasma';
  assert mycen_nearest_accent(null) = 'plasma';

  assert mycen_upgrade_theme('{}') @> '{"layout": "clasica", "mode": "universo", "accent": "plasma"}';
  assert mycen_upgrade_theme(null) @> '{"layout": "clasica", "mode": "universo", "accent": "plasma"}';
  assert mycen_upgrade_theme('{"mode": "light", "accent": "#3B82F6", "corners": "round"}')
      @> '{"layout": "clasica", "mode": "amanecer", "accent": "ion", "corners": "round"}', 'claro → amanecer, conserva el resto';
  assert mycen_upgrade_theme('{"mode": "auto"}') ->> 'mode' = 'universo';
  assert mycen_upgrade_theme('{"layout": "bento", "mode": "universo", "accent": "aurora"}')
       = '{"layout": "bento", "mode": "universo", "accent": "aurora"}', 'lo nuevo no cambia';
end $$;

-- ── Validación en la base ────────────────────────────────────────────────────
do $$
declare bad jsonb;
begin
  foreach bad in array array[
    '{"layout": "grilla"}', '{"mode": "noche"}', '{"accent": "rojo"}', '{"accent": "#FFF"}',
    '{"huella_variant": "espiral"}', '{"cover": {"type": "video"}}', '{"cover": "imagen"}',
    '{"cover": {"type": "imagen", "url": "javascript:alert(1)"}}', '{"cover": {"type": "imagen", "url": "http://x.com/a.jpg"}}'
  ]::jsonb[] loop
    begin
      update profiles set theme = bad where id = '11111111-0000-0000-0000-000000000001';
      assert false, 'debería rechazar ' || bad::text;
    exception when check_violation then null; end;
  end loop;

  -- Válidos: los nuevos y, hasta la etapa 06, los de antes
  update profiles set theme = '{"layout": "portada", "mode": "universo", "accent": "nebulosa", "huella_variant": "pulso",
                                "cover": {"type": "imagen", "url": "https://x.supabase.co/storage/v1/a.webp"}}'
  where id = '11111111-0000-0000-0000-000000000001';
  update profiles set theme = '{"mode": "dark", "accent": "#F4705A", "corners": "soft"}' where id = '11111111-0000-0000-0000-000000000001';
  update profiles set theme = '{"layout": "credencial", "mode": "amanecer", "accent": "ion", "cover": {"type": "huella"}}'
  where id = '11111111-0000-0000-0000-000000000001';

  begin
    update profiles set status_text = repeat('a', 61) where id = '11111111-0000-0000-0000-000000000001';
    assert false, 'estado de más de 60';
  exception when check_violation then null; end;
  begin
    update profiles set huella_salt = 'a b<script>' where id = '11111111-0000-0000-0000-000000000001';
    assert false, 'sal con caracteres raros';
  exception when check_violation then null; end;

  update profiles set status_text = '   ' where id = '11111111-0000-0000-0000-000000000001';
  assert (select status_text from profiles where id = '11111111-0000-0000-0000-000000000001') is null, 'vacío = sin estado';
  assert (select not available from profiles where id = '11111111-0000-0000-0000-000000000001'), 'Disponible arranca apagado';
end $$;

-- ── Publicar: la huella va con la versión; el estado se ve al instante ───────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
update profiles set huella_salt = 'k1', status_text = 'Grabando el disco', available = true
where id = '11111111-0000-0000-0000-000000000001';
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;

-- Después de publicar: cambia la huella (sin publicar) y el estado
update profiles set huella_salt = 'k2', status_text = 'De gira', available = false
where id = '11111111-0000-0000-0000-000000000001';

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare p jsonb := get_public_profile('ana');
begin
  assert p ->> 'huella_salt' = 'k1', 'la huella publicada es la de la versión: ' || coalesce(p ->> 'huella_salt', 'null');
  assert p ->> 'status_text' = 'De gira', 'el estado es el de ahora';
  assert (p ->> 'available')::boolean = false, '"Disponible" es el de ahora';
  assert p -> 'theme' @> '{"layout": "credencial", "mode": "amanecer", "accent": "ion"}', 'tema de la versión';
  assert not (p ? 'contact_card'), 'la tarjeta de contacto no viaja en la página';
end $$;

-- Un visitante no lee la tabla ni escribe el estado de nadie
do $$ begin
  begin
    perform 1 from profiles limit 1;
    assert false, 'anon no lee profiles';
  exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
update profiles set status_text = 'hackeado', available = true where id = '11111111-0000-0000-0000-000000000001';
reset role;
do $$ begin
  assert (select status_text from profiles where id = '11111111-0000-0000-0000-000000000001') = 'De gira', 'otro usuario no cambia el estado';
end $$;

-- ── Restaurar la versión trae su huella ──────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  perform restore_space_version((select id from profile_versions where profile_id = '11111111-0000-0000-0000-000000000001' order by version_number limit 1));
end $$;
reset role;
do $$ begin
  assert (select huella_salt from profiles where id = '11111111-0000-0000-0000-000000000001') = 'k1', 'restaurar trae la huella';
end $$;

rollback;
