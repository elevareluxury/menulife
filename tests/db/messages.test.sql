-- V1 · etapa 05: formulario de contacto. El visitante envía sólo por la RPC; el dueño lee, marca y borra; nadie más.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft'),
       ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'beto', 'Beto', 'draft');

-- Ana publica con el formulario; Beto publica sin formulario
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
insert into public.profile_modules (profile_id, type, title, content, position)
values ('11111111-0000-0000-0000-000000000001', 'contact_form', 'Escribime', '{}', 10);
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin perform publish_space('22222222-0000-0000-0000-000000000002'); end $$;

-- ── Visitante sin cuenta ─────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (iPhone)", "x-forwarded-for": "203.0.113.7"}', true);

do $$ begin
  assert submit_profile_message('ana', 'Juan', 'juan@mail.com', 'Hola, ¿hacés logos?', null, 5000) = 'ok', 'envía';
  assert submit_profile_message('beto', 'Juan', 'juan@mail.com', 'Hola', null, 5000) = 'not_found', 'sin formulario publicado';
  assert submit_profile_message('nadie', 'Juan', 'juan@mail.com', 'Hola', null, 5000) = 'not_found';
  assert submit_profile_message('ana', '', 'juan@mail.com', 'Hola', null, 5000) = 'invalid', 'sin nombre';
  assert submit_profile_message('ana', repeat('a', 81), 'juan@mail.com', 'Hola', null, 5000) = 'invalid', 'nombre largo';
  assert submit_profile_message('ana', 'Juan', 'ab', 'Hola', null, 5000) = 'invalid', 'contacto corto';
  assert submit_profile_message('ana', 'Juan', repeat('a', 121), 'Hola', null, 5000) = 'invalid', 'contacto largo';
  assert submit_profile_message('ana', 'Juan', 'juan@mail.com', repeat('a', 2001), null, 5000) = 'invalid', 'mensaje largo';
  assert submit_profile_message('ana', 'Juan', 'juan@mail.com', 'https://a.com https://b.com www.c.com http://d.com', null, 5000) = 'too_many_links';
  -- Bots: dicen "ok" pero no se guarda
  assert submit_profile_message('ana', 'Bot', 'bot@mail.com', 'spam', 'relleno', 5000) = 'ok', 'trampa';
  assert submit_profile_message('ana', 'Bot', 'bot@mail.com', 'spam', null, 800) = 'ok', 'demasiado rápido';
end $$;

-- 5 por visitante y por día
do $$ begin
  for i in 2..5 loop
    assert submit_profile_message('ana', 'Juan', 'juan@mail.com', 'Mensaje ' || i, null, 5000) = 'ok';
  end loop;
  assert submit_profile_message('ana', 'Juan', 'juan@mail.com', 'Otro', null, 5000) = 'rate_limited', 'sexto del día';
end $$;

-- Otro visitante (otro hash) sí puede
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (Android)", "x-forwarded-for": "198.51.100.9"}', true);
do $$ begin
  assert submit_profile_message('ana', 'Sofi', '+54 9 11 5555 0000', 'Consulta', null, 5000) = 'ok';
end $$;
select set_config('request.headers', '{"user-agent": "Googlebot/2.1"}', true);
do $$ begin
  assert submit_profile_message('ana', 'G', 'g@mail.com', 'x', null, 5000) = 'ok', 'agente bot';
end $$;

-- El visitante no lee la tabla ni inserta directo
do $$ begin
  begin
    perform 1 from profile_messages limit 1;
    assert false, 'anon no lee';
  exception when insufficient_privilege then null; end;
  begin
    insert into profile_messages (profile_id, name, contact, message, sender_hash)
    values ('11111111-0000-0000-0000-000000000001', 'x', 'xxx', 'x', 'h');
    assert false, 'anon no inserta';
  exception when insufficient_privilege then null; end;
end $$;

-- ── Otro usuario no ve los mensajes de Ana ───────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from profile_messages) = 0, 'Beto no ve nada';
  update profile_messages set read_at = now();
  delete from profile_messages;
  begin
    insert into profile_messages (profile_id, name, contact, message, sender_hash)
    values ('11111111-0000-0000-0000-000000000001', 'x', 'xxx', 'x', 'h');
    assert false, 'nadie inserta directo';
  exception when insufficient_privilege then null; end;
end $$;

-- ── La dueña: lee, marca como leído y borra; no cambia el contenido ──────────
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$
declare v_id uuid;
begin
  assert (select count(*) from profile_messages) = 6, 've sus 6 mensajes (los bots no se guardaron): ' || (select count(*) from profile_messages);
  assert (select count(*) from profile_messages where read_at is null) = 6, 'Beto no pudo marcarlos';
  select id into v_id from profile_messages where name = 'Sofi';
  update profile_messages set read_at = now() where id = v_id;
  assert (select read_at is not null from profile_messages where id = v_id), 'marca como leído';
  begin
    update profile_messages set message = 'otro' where id = v_id;
    assert false, 'no cambia el mensaje';
  exception when insufficient_privilege then null; end;
  delete from profile_messages where id = v_id;
  assert (select count(*) from profile_messages) = 5, 'borra';
  assert not exists (select 1 from profile_messages where sender_hash ~ '203\.0\.113'), 'no guarda la IP';
end $$;

rollback;
