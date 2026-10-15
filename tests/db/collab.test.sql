-- V1.1 · Colaboraciones: una marca propone por submit_profile_collab; llega a profile_messages con kind 'collab'.
-- Sólo con un módulo 'collab' publicado; mismos controles y límites que los mensajes (cuentan juntos).
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft'),
       ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'beto', 'Beto', 'draft');

-- Ana publica con colaboraciones y formulario de contacto; Beto, sólo con el formulario de contacto
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
insert into public.profile_modules (profile_id, type, title, content, position)
values ('11111111-0000-0000-0000-000000000001', 'collab', 'Colaboraciones', '{"rates": "Tarifas desde USD 300"}', 10),
       ('11111111-0000-0000-0000-000000000001', 'contact_form', 'Escribime', '{}', 20);
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
insert into public.profile_modules (profile_id, type, title, content, position)
values ('22222222-0000-0000-0000-000000000002', 'contact_form', 'Escribime', '{}', 10);
do $$ begin perform publish_space('22222222-0000-0000-0000-000000000002'); end $$;

-- ── Validación de los detalles (función pura) ────────────────────────────────
do $$ begin
  assert mycen_valid_collab_details('{"company": "Café Luna", "deliverable": "post"}');
  assert mycen_valid_collab_details('{"company": "Café Luna", "deliverable": "ugc", "website": "https://cafeluna.com/marca?x=1", "budget": "USD 500", "deadline": "2030-02-28"}');
  assert not mycen_valid_collab_details(null);
  assert not mycen_valid_collab_details('[]');
  assert not mycen_valid_collab_details('{"deliverable": "post"}'), 'sin empresa';
  assert not mycen_valid_collab_details('{"company": " ", "deliverable": "post"}'), 'empresa en blanco';
  assert not mycen_valid_collab_details(jsonb_build_object('company', repeat('a', 121), 'deliverable', 'post')), 'empresa larga';
  assert not mycen_valid_collab_details('{"company": "X", "deliverable": "podcast"}'), 'formato fuera de la lista';
  assert not mycen_valid_collab_details('{"company": "X"}'), 'sin formato';
  assert not mycen_valid_collab_details('{"company": "X", "deliverable": "post", "website": "http://x.com"}'), 'web sin https';
  assert not mycen_valid_collab_details('{"company": "X", "deliverable": "post", "website": "javascript:alert(1)"}');
  assert not mycen_valid_collab_details('{"company": "X", "deliverable": "post", "website": "https://localhost"}'), 'web sin dominio';
  assert not mycen_valid_collab_details(jsonb_build_object('company', 'X', 'deliverable', 'post', 'website', 'https://x.com/' || repeat('a', 300))), 'web larga';
  assert not mycen_valid_collab_details(jsonb_build_object('company', 'X', 'deliverable', 'post', 'budget', repeat('a', 61))), 'presupuesto largo';
  assert not mycen_valid_collab_details('{"company": "X", "deliverable": "post", "budget": 500}'), 'presupuesto no es texto';
  assert not mycen_valid_collab_details('{"company": "X", "deliverable": "post", "deadline": "2030-02-30"}'), 'fecha inexistente';
  assert not mycen_valid_collab_details('{"company": "X", "deliverable": "post", "deadline": "30/01/2030"}'), 'formato de fecha';
  assert not mycen_valid_collab_details('{"company": "X", "deliverable": "post", "extra": "x"}'), 'clave desconocida';
end $$;

-- ── Visitante sin cuenta ─────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (iPhone)", "x-forwarded-for": "203.0.113.7"}', true);

do $$
declare v_future text := to_char(current_date + 30, 'YYYY-MM-DD');
begin
  assert submit_profile_collab('ana', 'Sofía', 'sofi@cafeluna.com', 'Café Luna', 'https://cafeluna.com', 'video', 'USD 500', v_future,
    'Queremos un reel para el lanzamiento.', null, 5000) = 'ok', 'envía con todo';
  assert submit_profile_collab('ana', 'Sofía', 'sofi@cafeluna.com', 'Café Luna', '', 'post', '', '', 'Sólo lo obligatorio', null, 5000) = 'ok',
    'opcionales vacíos';
  assert submit_profile_collab('beto', 'Sofía', 'sofi@cafeluna.com', 'Café Luna', null, 'post', null, null, 'Hola', null, 5000) = 'not_found',
    'sin módulo de colaboraciones';
  assert submit_profile_collab('nadie', 'Sofía', 'sofi@cafeluna.com', 'Café Luna', null, 'post', null, null, 'Hola', null, 5000) = 'not_found';
  assert submit_profile_collab('ana', '', 'sofi@cafeluna.com', 'Café Luna', null, 'post', null, null, 'Hola', null, 5000) = 'invalid', 'sin nombre';
  assert submit_profile_collab('ana', 'Sofía', '+54 9 11 5555 0000', 'Café Luna', null, 'post', null, null, 'Hola', null, 5000) = 'invalid', 'el contacto es un email';
  assert submit_profile_collab('ana', 'Sofía', 'sofi@cafeluna.com', '', null, 'post', null, null, 'Hola', null, 5000) = 'invalid', 'sin empresa';
  assert submit_profile_collab('ana', 'Sofía', 'sofi@cafeluna.com', 'Café Luna', null, 'tweet', null, null, 'Hola', null, 5000) = 'invalid', 'formato';
  assert submit_profile_collab('ana', 'Sofía', 'sofi@cafeluna.com', 'Café Luna', 'cafeluna.com', 'post', null, null, 'Hola', null, 5000) = 'invalid', 'web sin https';
  assert submit_profile_collab('ana', 'Sofía', 'sofi@cafeluna.com', 'Café Luna', null, 'post', null, '2020-01-01', 'Hola', null, 5000) = 'invalid', 'fecha pasada';
  assert submit_profile_collab('ana', 'Sofía', 'sofi@cafeluna.com', 'Café Luna', null, 'post', null, 'mañana', 'Hola', null, 5000) = 'invalid', 'fecha rara';
  assert submit_profile_collab('ana', 'Sofía', 'sofi@cafeluna.com', 'Café Luna', null, 'post', null, null, '', null, 5000) = 'invalid', 'sin mensaje';
  assert submit_profile_collab('ana', 'Sofía', 'sofi@cafeluna.com', 'Café Luna', null, 'post', null, null,
    'https://a.com https://b.com www.c.com http://d.com', null, 5000) = 'too_many_links';
  -- Bots: dicen "ok" pero no se guarda
  assert submit_profile_collab('ana', 'Bot', 'bot@spam.com', 'Spam', null, 'post', null, null, 'spam', 'relleno', 5000) = 'ok', 'trampa';
  assert submit_profile_collab('ana', 'Bot', 'bot@spam.com', 'Spam', null, 'post', null, null, 'spam', null, 800) = 'ok', 'demasiado rápido';
  -- El formulario de contacto sigue funcionando en el mismo perfil y cuenta para el mismo límite
  assert submit_profile_message('ana', 'Juan', 'juan@mail.com', 'Hola', null, 5000) = 'ok', 'contact_form sigue';
  assert submit_profile_message('ana', 'Juan', 'juan@mail.com', 'Hola 2', null, 5000) = 'ok';
  assert submit_profile_collab('ana', 'Sofía', 'sofi@cafeluna.com', 'Café Luna', null, 'story', null, null, 'Quinto', null, 5000) = 'ok', 'quinto del día';
  assert submit_profile_collab('ana', 'Sofía', 'sofi@cafeluna.com', 'Café Luna', null, 'story', null, null, 'Sexto', null, 5000) = 'rate_limited',
    'mensajes y propuestas cuentan juntos';
  assert submit_profile_message('ana', 'Juan', 'juan@mail.com', 'Sexto', null, 5000) = 'rate_limited';
end $$;

select set_config('request.headers', '{"user-agent": "Googlebot/2.1"}', true);
do $$ begin
  assert submit_profile_collab('ana', 'G', 'g@mail.com', 'G', null, 'post', null, null, 'x', null, 5000) = 'ok', 'agente bot';
end $$;

-- El visitante no lee ni inserta directo
do $$ begin
  begin
    perform 1 from profile_messages limit 1;
    assert false, 'anon no lee';
  exception when insufficient_privilege then null; end;
  begin
    insert into profile_messages (profile_id, kind, name, contact, message, details, sender_hash)
    values ('11111111-0000-0000-0000-000000000001', 'collab', 'x', 'x@x.com', 'x', '{"company": "X", "deliverable": "post"}', 'h');
    assert false, 'anon no inserta';
  exception when insufficient_privilege then null; end;
end $$;

-- ── Otro usuario no ve las propuestas de Ana ─────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from profile_messages) = 0, 'Beto no ve nada';
end $$;

-- ── La dueña ve mensajes y propuestas separados; no cambia el tipo ni los detalles ──
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$
declare v_id uuid;
begin
  assert (select count(*) from profile_messages) = 5, 'mensajes y propuestas: ' || (select count(*) from profile_messages);
  assert (select count(*) from profile_messages where kind = 'collab') = 3, 'tres propuestas';
  assert (select count(*) from profile_messages where kind = 'message' and details is null) = 2, 'dos mensajes sin detalles';
  select id into v_id from profile_messages where kind = 'collab' and details ? 'website';
  assert (select contact from profile_messages where id = v_id) = 'sofi@cafeluna.com';
  assert (select details from profile_messages where id = v_id) = jsonb_build_object(
    'company', 'Café Luna', 'website', 'https://cafeluna.com', 'deliverable', 'video', 'budget', 'USD 500',
    'deadline', to_char(current_date + 30, 'YYYY-MM-DD')), 'detalles guardados';
  assert (select details from profile_messages where kind = 'collab' and message = 'Sólo lo obligatorio')
    = '{"company": "Café Luna", "deliverable": "post"}'::jsonb, 'sin opcionales vacíos';
  update profile_messages set read_at = now() where id = v_id;
  assert (select read_at is not null from profile_messages where id = v_id), 'marca como leído';
  begin
    update profile_messages set kind = 'message' where id = v_id;
    assert false, 'no cambia el tipo';
  exception when insufficient_privilege then null; end;
  begin
    update profile_messages set details = '{}' where id = v_id;
    assert false, 'no cambia los detalles';
  exception when insufficient_privilege then null; end;
  delete from profile_messages where id = v_id;
  assert (select count(*) from profile_messages) = 4, 'borra';
end $$;

-- La tabla no acepta propuestas sin detalles válidos ni mensajes con detalles (aunque escriba el sistema)
reset role;
do $$ begin
  begin
    insert into profile_messages (profile_id, kind, name, contact, message, sender_hash)
    values ('11111111-0000-0000-0000-000000000001', 'collab', 'x', 'x@x.com', 'x', 'h');
    assert false, 'collab sin detalles';
  exception when check_violation then null; end;
  begin
    insert into profile_messages (profile_id, kind, name, contact, message, details, sender_hash)
    values ('11111111-0000-0000-0000-000000000001', 'message', 'x', 'x@x.com', 'x', '{"company": "X", "deliverable": "post"}', 'h');
    assert false, 'mensaje con detalles';
  exception when check_violation then null; end;
  begin
    insert into profile_messages (profile_id, kind, name, contact, message, sender_hash)
    values ('11111111-0000-0000-0000-000000000001', 'otro', 'x', 'x@x.com', 'x', 'h');
    assert false, 'tipo desconocido';
  exception when check_violation then null; end;
end $$;

rollback;
