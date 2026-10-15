-- Analítica: toques por botón ("Lo que más tocan"). El visitante registra módulo + clave corta; sólo el dueño ve el
-- resumen; sin bots, sin el dueño y sin datos del visitante.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft'),
       ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'beto', 'Beto', 'draft');
insert into public.profile_modules (id, profile_id, type, title, content, config, position) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'link_group', 'Links',
   '{"items": [{"title": "Web", "url": "https://ana.design"}, {"title": "Shop", "url": "https://shop.ana.design"}]}', '{}', 10),
  ('a0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'listen_on', 'Disco',
   '{"links": [{"platform": "spotify", "url": "https://open.spotify.com/album/1"}]}', '{}', 20),
  ('b0000000-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'link', 'Beto web',
   '{"url": "https://beto.example"}', '{}', 10);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;
reset role;
-- Beto queda en borrador: no se registra nada

-- ── Visitante 1 ──────────────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (iPhone)", "x-forwarded-for": "203.0.113.7"}', true);
do $$ begin
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'view');
  -- Dos links distintos del mismo grupo cuentan los dos; el mismo dos veces, una (30 min)
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'module_click', 'a0000000-0000-0000-0000-000000000001', null, null, 'u:abc123');
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'module_click', 'a0000000-0000-0000-0000-000000000001', null, null, 'u:zzz999');
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'module_click', 'a0000000-0000-0000-0000-000000000001', null, null, 'u:abc123');
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'module_click', 'a0000000-0000-0000-0000-000000000002', null, null, 'spotify');
  -- Llamada vieja (5 parámetros) sigue andando
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'primary_action_click', null, null, null);
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'primary_action_click', null, null, null, 'reserve');
  -- Clave inválida: cuenta sin clave
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'vcard_download', null, null, null, 'con espacios y ñ');
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'module_click', 'a0000000-0000-0000-0000-000000000002', null, null, repeat('x', 65));
  -- Módulo de otro perfil: sin módulo
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'module_click', 'b0000000-0000-0000-0000-000000000001', null, null, 'otro');
  -- Perfil en borrador: nada
  perform track_profile_event('22222222-0000-0000-0000-000000000002', 'module_click', 'b0000000-0000-0000-0000-000000000001');
  begin
    perform profile_click_stats('11111111-0000-0000-0000-000000000001', 30);
    assert false, 'el visitante no ve el resumen';
  exception when insufficient_privilege then null; end;
  begin
    perform item_key from profile_events limit 1;
    assert false, 'el visitante no lee la tabla';
  exception when insufficient_privilege then null; end;
end $$;

-- ── Visitante 2 (otro hash) toca el mismo link ───────────────────────────────
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (Android)", "x-forwarded-for": "198.51.100.2"}', true);
do $$ begin
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'view');
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'module_click', 'a0000000-0000-0000-0000-000000000001', null, null, 'u:abc123');
end $$;

-- ── Bot: no cuenta ───────────────────────────────────────────────────────────
select set_config('request.headers', '{"user-agent": "Googlebot/2.1", "x-forwarded-for": "66.249.0.1"}', true);
do $$ begin
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'module_click', 'a0000000-0000-0000-0000-000000000001', null, null, 'u:abc123');
end $$;
reset role;

do $$ begin
  assert (select count(*) from profile_events where profile_id = '22222222-0000-0000-0000-000000000002') = 0, 'borrador: nada';
  assert (select count(*) from profile_events where item_key = 'u:abc123') = 2, 'dedup por visitante, sin el bot';
  assert (select count(*) from profile_events where item_key = 'u:zzz999') = 1, 'otro link del grupo cuenta';
  assert (select count(*) from profile_events where event_type = 'vcard_download' and item_key is null) = 1, 'clave inválida se descarta';
  assert (select count(*) from profile_events where event_type = 'module_click' and module_id is null and item_key = 'otro') = 1,
    'módulo ajeno queda sin módulo';
  begin
    insert into profile_events (profile_id, event_type, item_key) values ('11111111-0000-0000-0000-000000000001', 'module_click', 'mal valor');
    assert false, 'la tabla rechaza claves con otro formato';
  exception when check_violation then null; end;
end $$;

-- ── El dueño: no se cuenta y ve el resumen ───────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (Mac)", "x-forwarded-for": "192.0.2.9"}', true);
do $$ declare s jsonb; v_row jsonb; begin
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'module_click', 'a0000000-0000-0000-0000-000000000002', null, null, 'spotify');
  s := profile_click_stats('11111111-0000-0000-0000-000000000001', 30);
  assert (s ->> 'visits')::int = 2, 'dos visitas: ' || s::text;
  select x into v_row from jsonb_array_elements(s -> 'items') x where x ->> 'item_key' = 'u:abc123';
  assert (v_row ->> 'taps')::int = 2 and (v_row ->> 'visitors')::int = 2 and v_row ->> 'module_id' = 'a0000000-0000-0000-0000-000000000001',
    'link más tocado: ' || coalesce(v_row::text, 'null');
  assert (s -> 'items' -> 0 ->> 'item_key') = 'u:abc123', 'ordenado por toques';
  select x into v_row from jsonb_array_elements(s -> 'items') x where x ->> 'item_key' = 'spotify';
  assert (v_row ->> 'taps')::int = 1, 'el dueño no se cuenta';
  select x into v_row from jsonb_array_elements(s -> 'items') x where x ->> 'item_key' = 'reserve';
  assert v_row ->> 'event_type' = 'primary_action_click', 'reserva';
  assert not exists (select 1 from jsonb_array_elements(s -> 'items') x where x ? 'visitor_hash'), 'sin hash';
end $$;

-- ── Otra cuenta no ve el resumen ─────────────────────────────────────────────
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  begin
    perform profile_click_stats('11111111-0000-0000-0000-000000000001', 30);
    assert false, 'Beto no ve lo de Ana';
  exception when insufficient_privilege then null; end;
end $$;

rollback;
