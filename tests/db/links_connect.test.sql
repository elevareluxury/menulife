-- Fase 7: módulos programados, grupo de links y fuentes de tráfico.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft');

insert into profile_modules (id, profile_id, type, title, content, config, position) values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'link', 'Siempre',
   '{"url": "https://ana.design"}', '{}', 10),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'link', 'Lanzamiento',
   '{"url": "https://ana.design/nuevo"}', jsonb_build_object('show_from', (now() + interval '1 day')::text), 20),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'link', 'Promo vencida',
   '{"url": "https://ana.design/promo"}', jsonb_build_object('show_until', (now() - interval '1 hour')::text), 30),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'link', 'En curso',
   '{"url": "https://ana.design/hoy"}', jsonb_build_object('show_from', (now() - interval '1 hour')::text,
                                                          'show_until', (now() + interval '1 hour')::text), 40),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'link', 'Fecha rota',
   '{"url": "https://ana.design/x"}', '{"show_from": "no es fecha"}', 50),
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', 'link_group', 'Tiendas',
   '{"items": [{"title": "Etsy", "url": "https://etsy.com/ana"}]}', '{}', 60);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;
reset role;

-- ── El visitante sólo ve lo que está en su horario ───────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ declare titles text[]; begin
  select array_agg(m ->> 'title' order by o) into titles
  from jsonb_array_elements(get_public_profile('ana') -> 'modules') with ordinality as t(m, o);
  assert titles = array['Siempre', 'En curso', 'Fecha rota', 'Tiendas'], format('módulos visibles: %s', titles);
end $$;
reset role;

-- La versión publicada guarda todo: al llegar la fecha aparece sin volver a publicar
do $$ declare snap jsonb; begin
  select v.snapshot into snap from profile_versions v join profiles p on p.published_version_id = v.id where p.username = 'ana';
  assert jsonb_array_length(snap -> 'modules') = 6, 'el snapshot conserva los módulos programados';
end $$;
update profile_versions set snapshot = jsonb_set(snapshot, '{modules,1,config,show_from}', to_jsonb((now() - interval '1 minute')::text))
where id = (select published_version_id from profiles where username = 'ana');
set local role anon;
do $$ begin
  assert get_public_profile('ana') -> 'modules' @> '[{"title": "Lanzamiento"}]', 'llegada la fecha, el módulo aparece';
end $$;
reset role;

-- ── Fuentes de tráfico: sólo el dueño ────────────────────────────────────────
insert into profile_events (profile_id, event_type, visitor_hash, source, referrer_host, created_at) values
  ('11111111-0000-0000-0000-000000000001', 'view', 'v1', 'qr', null, now()),
  ('11111111-0000-0000-0000-000000000001', 'view', 'v2', 'qr', null, now()),
  ('11111111-0000-0000-0000-000000000001', 'view', 'v2', 'qr', null, now() - interval '2 hours'),
  ('11111111-0000-0000-0000-000000000001', 'view', 'v3', null, 'l.instagram.com', now()),
  ('11111111-0000-0000-0000-000000000001', 'view', 'v4', null, null, now() - interval '40 days'),
  ('11111111-0000-0000-0000-000000000001', 'module_click', 'v1', 'qr', null, now());

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ declare r jsonb := profile_traffic_sources('11111111-0000-0000-0000-000000000001', 30); begin
  assert jsonb_array_length(r) = 2, format('dos grupos en 30 días: %s', r);
  assert r -> 0 ->> 'source' = 'qr' and (r -> 0 ->> 'visits')::int = 3 and (r -> 0 ->> 'visitors')::int = 2, 'QR: 3 visitas, 2 personas';
  assert r -> 1 ->> 'referrer_host' = 'l.instagram.com', 'Instagram por el sitio de origen';
  assert jsonb_array_length(profile_traffic_sources('11111111-0000-0000-0000-000000000001', 90)) = 3, 'en 90 días suma la visita directa';
end $$;

select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  begin
    perform profile_traffic_sources('11111111-0000-0000-0000-000000000001', 30);
    assert false, 'otro usuario no debería ver las fuentes';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  begin
    perform profile_traffic_sources('11111111-0000-0000-0000-000000000001', 30);
    assert false, 'anon no debería ver las fuentes';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

rollback;
