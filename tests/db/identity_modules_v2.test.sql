-- Identity · entrega 2: tipos nuevos, encuesta (votar y resultados anónimos, sin leer la tabla), segunda foto en el tema.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft'),
       ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'beto', 'Beto', 'draft');

insert into public.profile_modules (id, profile_id, type, title, content, config, position) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'poll', '¿Qué tema sigue?',
   '{"options": [{"id": "a1", "label": "Rock"}, {"id": "b2", "label": "Jazz"}]}', '{}', 10),
  ('a0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'coupon', 'Descuento',
   '{"code": "OLIVIA10"}', '{}', 20),
  ('a0000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'downloads', null, '{"items": []}', '{}', 30),
  ('a0000000-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'video_gallery', null, '{"items": []}', '{}', 40),
  ('a0000000-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'podcast', null, '{"feed": "https://ana.fm/rss"}', '{}', 50),
  ('b0000000-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'poll', 'Borrador',
   '{"options": [{"id": "a1", "label": "Sí"}]}', '{}', 10);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;
reset role;

-- Visitante sin cuenta
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (iPhone)", "x-forwarded-for": "203.0.113.7"}', true);
do $$
declare
  m uuid := 'a0000000-0000-0000-0000-000000000001';
  r jsonb;
begin
  r := vote_profile_poll('ana', m, 'a1');
  assert r ->> 'status' = 'ok', 'vota';
  assert (r -> 'results' ->> 'total')::int = 1, 'un voto';
  -- El mismo visitante cambia de opinión: sigue siendo un voto
  r := vote_profile_poll('ana', m, 'b2');
  assert (r -> 'results' ->> 'total')::int = 1 and (r -> 'results' -> 'counts' ->> 'b2')::int = 1, 'cambia el voto';
  assert vote_profile_poll('ana', m, 'zz') ->> 'status' = 'invalid', 'opción que no existe';
  assert vote_profile_poll('ana', m, null) ->> 'status' = 'invalid', 'sin opción';
  assert vote_profile_poll('ana', 'a0000000-0000-0000-0000-000000000002', 'a1') ->> 'status' = 'not_found', 'no es encuesta';
  assert vote_profile_poll('beto', 'b0000000-0000-0000-0000-000000000001', 'a1') ->> 'status' = 'not_found', 'no publicada';
  assert vote_profile_poll('beto', m, 'a1') ->> 'status' = 'not_found', 'encuesta de otro perfil';
  assert (get_poll_results('ana', m) ->> 'total')::int = 1, 'resultados';
  assert get_poll_results('beto', 'b0000000-0000-0000-0000-000000000001') is null, 'sin resultados de un borrador';
  -- Nadie lee los votos directo
  begin perform 1 from profile_poll_votes; assert false, 'anon no lee votos';
  exception when insufficient_privilege then null; end;
  -- La función interna no se llama desde afuera
  begin perform mycen_published_poll('ana', m); assert false, 'mycen_* cerrada';
  exception when insufficient_privilege then null; end;
end $$;

-- Otro visitante suma
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (Android)", "x-forwarded-for": "198.51.100.9"}', true);
do $$
declare r jsonb := vote_profile_poll('ana', 'a0000000-0000-0000-0000-000000000001', 'a1');
begin
  assert (r -> 'results' ->> 'total')::int = 2, 'dos votos';
  assert (r -> 'results' -> 'counts' ->> 'a1')::int = 1, 'uno por opción';
end $$;

-- Un bot no suma
select set_config('request.headers', '{"user-agent": "Googlebot/2.1", "x-forwarded-for": "66.249.66.1"}', true);
do $$ begin
  assert (vote_profile_poll('ana', 'a0000000-0000-0000-0000-000000000001', 'a1') -> 'results' ->> 'total')::int = 2, 'bot no vota';
end $$;
reset role;

-- La dueña: segunda foto válida en el tema; una inválida se rechaza
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert mycen_valid_profile_look('{"avatar_alt": {"url": "https://x.supabase.co/a.webp", "when": "noche"}}'::jsonb), 'foto de noche';
  assert not mycen_valid_profile_look('{"avatar_alt": {"url": "http://x/a.webp", "when": "noche"}}'::jsonb), 'sin https';
  assert not mycen_valid_profile_look('{"avatar_alt": {"url": "https://x/a.webp", "when": "siempre"}}'::jsonb), 'momento inválido';
  assert mycen_valid_profile_look('{"avatar_alt": null}'::jsonb), 'sin segunda foto';
end $$;
reset role;

rollback;
