-- Tiendas (App Store 1.2): en Studio → Mensajes, bloquear a quien escribe y reportar un mensaje al equipo.
-- Lo bloqueado no se guarda (al visitante se le dice "ok"); el reporte guarda una copia y bloquea; sólo el equipo lo ve.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@mycen.id');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft'),
       ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'beto', 'Beto', 'draft');

-- Ana publica con el formulario de contacto
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
insert into public.profile_modules (profile_id, type, title, content, position)
values ('11111111-0000-0000-0000-000000000001', 'contact_form', 'Escribime', '{}', 10);
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;

-- ── Clave del contacto ───────────────────────────────────────────────────────
do $$ begin
  assert mycen_contact_key(' Juan@Mail.com ') = 'juan@mail.com';
  assert mycen_contact_key('+54 9 11 5555-0000') = '5491155550000';
  assert mycen_contact_key('(54) 9115555 0000') = '5491155550000';
  assert mycen_contact_key('@juan') = '@juan';
end $$;

-- ── Visitantes escriben ──────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (iPhone)", "x-forwarded-for": "203.0.113.9"}', true);
do $$ begin
  assert submit_profile_message('ana', 'Juan', 'juan@mail.com', 'Hola', null, 5000) = 'ok';
  assert submit_profile_message('ana', 'Juan', 'juan@mail.com', 'Hola de nuevo', null, 5000) = 'ok';
  assert submit_profile_message('ana', 'Spam', '+54 9 11 5555-0000', 'Comprá ya', null, 5000) = 'ok';
  assert submit_profile_message('ana', 'Lu', 'lu@mail.com', 'Me encanta tu trabajo', null, 5000) = 'ok';
end $$;

-- Un visitante no puede bloquear ni reportar
do $$ begin
  begin perform block_message_sender(gen_random_uuid()); assert false, 'anon bloquea';
  exception when insufficient_privilege then null; end;
  begin perform report_profile_message(gen_random_uuid(), 'spam'); assert false, 'anon reporta';
  exception when insufficient_privilege then null; end;
end $$;

-- Los ids de los mensajes (Ana los ve por RLS)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
create temp table ids as select id, contact from public.profile_messages;

-- ── Otra persona no toca los mensajes de Ana ─────────────────────────────────
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ declare v uuid := (select id from ids where contact = 'juan@mail.com' limit 1);
begin
  begin perform block_message_sender(v); assert false, 'Beto bloquea un mensaje de Ana';
  exception when insufficient_privilege then null; end;
  begin perform report_profile_message(v, 'spam'); assert false, 'Beto reporta un mensaje de Ana';
  exception when insufficient_privilege then null; end;
  begin perform admin_list_message_reports('open'); assert false, 'Beto no es admin';
  exception when insufficient_privilege then null; end;
end $$;

-- ── Ana bloquea a Juan ───────────────────────────────────────────────────────
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ declare v uuid := (select id from ids where contact = 'juan@mail.com' limit 1);
begin
  assert block_message_sender(v) = 'ok';
  assert (select count(*) from profile_messages where contact = 'juan@mail.com') = 0, 'se borran todos sus mensajes';
  assert (select count(*) from profile_messages) = 2, 'los demás quedan';
  assert (select array_agg(contact_key) from profile_blocked_senders) = array['juan@mail.com'], 'Ana ve su bloqueado';
end $$;

-- ── Ana reporta el spam ──────────────────────────────────────────────────────
do $$ declare v uuid := (select id from ids where contact = '+54 9 11 5555-0000');
begin
  assert report_profile_message(v, 'otra cosa') = 'invalid', 'motivo fuera de la lista';
  assert report_profile_message(v, 'spam') = 'ok';
  assert (select count(*) from profile_messages) = 1, 'sólo queda el de Lu';
  assert (select count(*) from profile_blocked_senders) = 2;
  -- La copia no se lee directo
  begin perform 1 from profile_message_reports; assert false, 'lee los reportes';
  exception when insufficient_privilege then null; end;
end $$;

-- ── Lo bloqueado ya no llega (aunque esté escrito distinto) ──────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert submit_profile_message('ana', 'Juan', ' JUAN@mail.com ', 'Soy yo otra vez', null, 5000) = 'ok', 'se le dice ok';
  assert submit_profile_message('ana', 'Spam', '5491155550000', 'Otra oferta', null, 5000) = 'ok';
  assert submit_profile_message('ana', 'Mar', 'mar@mail.com', 'Hola Ana', null, 5000) = 'ok';
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert (select array_agg(contact order by contact) from profile_messages) = array['lu@mail.com', 'mar@mail.com'],
    'los bloqueados no se guardaron';
end $$;

-- Desbloquear: la persona dueña borra la fila
delete from public.profile_blocked_senders where contact_key = 'juan@mail.com';
do $$ begin assert (select count(*) from profile_blocked_senders) = 1; end $$;

-- ── El equipo revisa ─────────────────────────────────────────────────────────
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ declare r jsonb := admin_list_message_reports('open');
begin
  assert jsonb_array_length(r) = 1;
  assert r -> 0 ->> 'reason' = 'spam';
  assert r -> 0 ->> 'sender_contact' = '+54 9 11 5555-0000';
  assert r -> 0 ->> 'message' = 'Comprá ya';
  assert r -> 0 -> 'profile' ->> 'handle' = 'ana';
  perform admin_resolve_message_report((r -> 0 ->> 'id')::uuid, 'dismiss', 'Era spam, ya está bloqueado');
  assert jsonb_array_length(admin_list_message_reports('open')) = 0;
  assert admin_list_message_reports('resolved') -> 0 ->> 'status' = 'dismissed';
  begin perform admin_resolve_message_report((r -> 0 ->> 'id')::uuid, 'action'); assert false, 'ya resuelta';
  exception when no_data_found then null; end;
  begin perform admin_resolve_message_report((r -> 0 ->> 'id')::uuid, 'borrar'); assert false, 'acción rara';
  exception when invalid_parameter_value then null; end;
end $$;

-- /eliminar-cuenta es una página: nadie puede tomarla como username
reset role;
do $$ begin assert exists (select 1 from reserved_usernames where username = 'eliminar-cuenta'); end $$;

rollback;
