-- Módulos de bio: "Suscribirse". El visitante se suma sólo por la RPC (con consentimiento); el dueño lee y borra; nadie más.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'caro@x'),
  ('dddddddd-0000-0000-0000-000000000004', 'dani@x');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft'),
       ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'beto', 'Beto', 'draft'),
       ('33333333-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003', 'caro', 'Caro', 'draft'),
       ('44444444-0000-0000-0000-000000000004', 'dddddddd-0000-0000-0000-000000000004', 'dani', 'Dani', 'draft');

-- Ana: "Suscribirse" con nombre, otro que ya terminó y un link. Caro y Dani: "Suscribirse" sin nombre. Beto: nada.
insert into public.profile_modules (id, profile_id, type, title, content, config, position) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'subscribe', 'Novedades',
   '{"ask_name": true}', '{}', 10),
  ('a0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'subscribe', 'Vencido',
   '{}', jsonb_build_object('show_until', (now() - interval '1 hour')::text), 20),
  ('a0000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'link', 'Web',
   '{"url": "https://ana.design"}', '{}', 30),
  ('c0000000-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 'subscribe', null, '{}', '{}', 10),
  ('d0000000-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000004', 'subscribe', null, '{}', '{}', 10);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin perform publish_space('22222222-0000-0000-0000-000000000002'); end $$;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ begin perform publish_space('33333333-0000-0000-0000-000000000003'); end $$;
-- Dani no publica: el módulo existe sólo en el borrador
reset role;

-- ── Visitante sin cuenta ─────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (iPhone)", "x-forwarded-for": "203.0.113.7"}', true);

do $$
declare m uuid := 'a0000000-0000-0000-0000-000000000001';
begin
  assert subscribe_profile('ana', m, 'Juan@Mail.com ', 'Juan', true, null, 5000, 'es') = 'ok', 'se suscribe';
  assert subscribe_profile('ana', m, 'juan@mail.com', 'Otro', true, null, 5000, 'en') = 'ok', 'repetido: ok sin error';
  assert subscribe_profile('ana', m, 'sofi@mail.com', null, false, null, 5000, 'es') = 'consent_required', 'sin consentimiento';
  assert subscribe_profile('ana', m, 'sofi@mail.com', null, null, null, 5000, 'es') = 'consent_required', 'consentimiento nulo';
  assert subscribe_profile('ana', m, 'no-es-email', null, true, null, 5000, 'es') = 'invalid', 'email inválido';
  assert subscribe_profile('ana', m, 'a b@mail.com', null, true, null, 5000, 'es') = 'invalid', 'con espacio';
  assert subscribe_profile('ana', m, repeat('a', 250) || '@x.com', null, true, null, 5000, 'es') = 'invalid', 'email largo';
  assert subscribe_profile('ana', m, 'sofi@mail.com', repeat('a', 81), true, null, 5000, 'es') = 'invalid', 'nombre largo';
  assert subscribe_profile('ana', 'a0000000-0000-0000-0000-000000000002', 'x@mail.com', null, true, null, 5000, null) = 'not_found', 'módulo fuera de horario';
  assert subscribe_profile('ana', 'a0000000-0000-0000-0000-000000000003', 'x@mail.com', null, true, null, 5000, null) = 'not_found', 'no es Suscribirse';
  assert subscribe_profile('ana', null, 'x@mail.com', null, true, null, 5000, null) = 'not_found', 'sin módulo';
  assert subscribe_profile('ana', 'c0000000-0000-0000-0000-000000000001', 'x@mail.com', null, true, null, 5000, null) = 'not_found', 'módulo de otro perfil';
  assert subscribe_profile('beto', m, 'x@mail.com', null, true, null, 5000, null) = 'not_found', 'perfil sin el módulo';
  assert subscribe_profile('dani', 'd0000000-0000-0000-0000-000000000001', 'x@mail.com', null, true, null, 5000, null) = 'not_found', 'no publicado';
  assert subscribe_profile('nadie', m, 'x@mail.com', null, true, null, 5000, null) = 'not_found';
  -- Bots: dicen "ok" pero no se guarda
  assert subscribe_profile('ana', m, 'bot1@mail.com', null, true, 'relleno', 5000, null) = 'ok', 'trampa';
  assert subscribe_profile('ana', m, 'bot2@mail.com', null, true, null, 800, null) = 'ok', 'demasiado rápido';
  -- Caro no pide nombre: no se guarda aunque llegue
  assert subscribe_profile('caro', 'c0000000-0000-0000-0000-000000000001', 'lu@mail.com', 'Lu', true, null, 5000, 'xx') = 'ok';
end $$;

-- 5 por visitante, perfil y día
do $$ begin
  for i in 2..5 loop
    assert subscribe_profile('ana', 'a0000000-0000-0000-0000-000000000001', 'p' || i || '@mail.com', null, true, null, 5000, 'es') = 'ok';
  end loop;
  assert subscribe_profile('ana', 'a0000000-0000-0000-0000-000000000001', 'p6@mail.com', null, true, null, 5000, 'es') = 'rate_limited', 'sexto del día';
end $$;

-- Otro visitante (otro hash) sí puede; un agente conocido recibe "ok" sin guardar
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (Android)", "x-forwarded-for": "198.51.100.9"}', true);
do $$ begin
  assert subscribe_profile('ana', 'a0000000-0000-0000-0000-000000000001', 'sofi@mail.com', 'Sofi', true, null, 5000, 'pt') = 'ok';
end $$;
select set_config('request.headers', '{"user-agent": "Googlebot/2.1"}', true);
do $$ begin
  assert subscribe_profile('ana', 'a0000000-0000-0000-0000-000000000001', 'g@mail.com', null, true, null, 5000, null) = 'ok', 'agente bot';
end $$;

-- El visitante no lee la tabla ni inserta directo
do $$ begin
  begin
    perform 1 from profile_subscribers limit 1;
    assert false, 'anon no lee';
  exception when insufficient_privilege then null; end;
  begin
    insert into profile_subscribers (profile_id, email, consent_at, sender_hash)
    values ('11111111-0000-0000-0000-000000000001', 'x@mail.com', now(), 'h');
    assert false, 'anon no inserta';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Lo guardado: email en minúsculas, nombre sólo si el módulo lo pide, idioma válido o nada
do $$ begin
  assert (select count(*) from profile_subscribers where profile_id = '11111111-0000-0000-0000-000000000001') = 6,
    'Ana: Juan, p2..p5 y Sofi (sin bots ni repetidos): ' || (select count(*) from profile_subscribers where profile_id = '11111111-0000-0000-0000-000000000001');
  assert (select name from profile_subscribers where email = 'juan@mail.com') = 'Juan', 'el repetido no pisa';
  assert (select locale from profile_subscribers where email = 'juan@mail.com') = 'es';
  assert (select consent_at is not null from profile_subscribers where email = 'juan@mail.com');
  assert (select module_id from profile_subscribers where email = 'juan@mail.com') = 'a0000000-0000-0000-0000-000000000001';
  assert (select name is null and locale is null from profile_subscribers where email = 'lu@mail.com'), 'Caro no pide nombre; idioma raro = null';
  assert not exists (select 1 from profile_subscribers where email like 'bot%' or email = 'g@mail.com'), 'bots no se guardan';
  assert not exists (select 1 from profile_subscribers where sender_hash ~ '203\.0\.113'), 'no guarda la IP';
end $$;

-- 500 por perfil y día (Caro), y tope de 50.000 por perfil (Caro, con altas viejas)
insert into profile_subscribers (profile_id, email, consent_at, sender_hash)
select '33333333-0000-0000-0000-000000000003', 'hoy' || i || '@mail.com', now(), 'h' || i from generate_series(1, 499) i;
set local role anon;
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (Mac)", "x-forwarded-for": "192.0.2.1"}', true);
do $$ begin
  assert subscribe_profile('caro', 'c0000000-0000-0000-0000-000000000001', 'cupo@mail.com', null, true, null, 5000, null) = 'rate_limited', '501 del día';
end $$;
reset role;
update profile_subscribers set created_at = now() - interval '2 days' where profile_id = '33333333-0000-0000-0000-000000000003';
insert into profile_subscribers (profile_id, email, consent_at, sender_hash, created_at)
select '33333333-0000-0000-0000-000000000003', 'viejo' || i || '@mail.com', now(), 'v', now() - interval '2 days'
from generate_series(1, 50000 - 500) i;
set local role anon;
do $$ begin
  assert subscribe_profile('caro', 'c0000000-0000-0000-0000-000000000001', 'tope@mail.com', null, true, null, 5000, null) = 'full', 'tope de 50.000';
  assert subscribe_profile('caro', 'c0000000-0000-0000-0000-000000000001', 'lu@mail.com', null, true, null, 5000, null) = 'ok', 'ya estaba: ok';
end $$;
reset role;
delete from profile_subscribers where profile_id = '33333333-0000-0000-0000-000000000003' and email <> 'lu@mail.com';

-- Suspendido: no recibe suscripciones
select set_config('mycen.moderating', 'on', true);
update profiles set suspended_at = now() where username = 'caro';
select set_config('mycen.moderating', '', true);
set local role anon;
do $$ begin
  assert subscribe_profile('caro', 'c0000000-0000-0000-0000-000000000001', 'nuevo@mail.com', null, true, null, 5000, null) = 'not_found', 'suspendido';
end $$;

-- ── Otro usuario no ve ni borra la lista de Ana ──────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from profile_subscribers) = 0, 'Beto no ve nada';
  delete from profile_subscribers;
  begin
    insert into profile_subscribers (profile_id, email, consent_at, sender_hash)
    values ('22222222-0000-0000-0000-000000000002', 'x@mail.com', now(), 'h');
    assert false, 'nadie inserta directo';
  exception when insufficient_privilege then null; end;
end $$;

-- ── La dueña: lee (sin el hash) y borra; no cambia nada ──────────────────────
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$
declare v_id uuid;
begin
  assert (select count(*) from profile_subscribers) = 6, 've sus 6 (Beto no pudo borrar): ' || (select count(*) from profile_subscribers);
  begin
    perform sender_hash from profile_subscribers limit 1;
    assert false, 'no lee el hash';
  exception when insufficient_privilege then null; end;
  begin
    update profile_subscribers set email = 'otro@mail.com';
    assert false, 'no cambia los datos';
  exception when insufficient_privilege then null; end;
  select id into v_id from profile_subscribers where email = 'sofi@mail.com';
  delete from profile_subscribers where id = v_id;
  assert (select count(*) from profile_subscribers) = 5, 'borra';
end $$;

rollback;
