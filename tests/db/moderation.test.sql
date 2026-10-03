-- Fase 8: denunciar, revisar y suspender.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@x');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');

insert into public.profiles (id, user_id, username, display_name, status, contact_card)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft',
        '{"enabled": true, "email": "ana@x"}');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;
reset role;

-- ── Denunciar sin cuenta ─────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{"user-agent": "Mozilla/5.0", "x-forwarded-for": "1.1.1.1"}', true);
do $$ begin
  assert report_profile('ana', 'scam', 'Pide plata por adelantado') = 'ok', 'la denuncia entra';
  assert report_profile('ana', 'spam') = 'duplicate', 'la misma persona no denuncia dos veces el mismo día';
  assert report_profile('ana', 'cualquiera') = 'invalid', 'motivo inválido';
  assert report_profile('nadie', 'spam') = 'not_found', 'perfil inexistente';
  begin
    perform 1 from profile_reports;
    assert false, 'el visitante no lee las denuncias';
  exception when insufficient_privilege then null; end;
end $$;
-- Otro visitante (otra IP) sí puede
select set_config('request.headers', '{"user-agent": "Mozilla/5.0", "x-forwarded-for": "2.2.2.2"}', true);
do $$ begin assert report_profile('ana', 'spam') = 'ok', 'otra persona denuncia'; end $$;
-- Los bots no dejan denuncias
select set_config('request.headers', '{"user-agent": "Googlebot", "x-forwarded-for": "3.3.3.3"}', true);
do $$ begin assert report_profile('ana', 'spam') = 'ok', 'al bot no se le avisa'; end $$;
reset role;
do $$ begin
  assert (select count(*) from profile_reports) = 2, 'quedan 2 denuncias (sin la del bot)';
  assert (select count(*) from profile_reports where reporter_hash is null) = 0, 'cada denuncia tiene hash anónimo';
end $$;

-- ── El dueño no se denuncia ni se quita una suspensión ───────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert report_profile('ana', 'spam') = 'own_profile', 'no se puede denunciar el propio perfil';
  begin
    perform admin_list_reports('open');
    assert false, 'el dueño no es admin';
  exception when insufficient_privilege then null; end;
  begin
    update profiles set suspended_at = now() where username = 'ana';
    assert false, 'el dueño no toca la suspensión';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ── El admin revisa y suspende ───────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ declare list jsonb; begin
  list := admin_list_reports('open');
  assert jsonb_array_length(list) = 2, 'el admin ve las denuncias abiertas';
  assert list -> 0 -> 'profile' ->> 'username' = 'ana', 'con el perfil denunciado';
  assert (list -> 0 -> 'profile' ->> 'open_reports')::int = 2, 'y cuántas tiene abiertas';

  perform admin_resolve_report((list -> 0 ->> 'id')::uuid, 'suspend', 'Estafa confirmada');
  assert jsonb_array_length(admin_list_reports('open')) = 0, 'no quedan abiertas';
  assert jsonb_array_length(admin_list_suspended()) = 1, 'aparece en suspendidos';
end $$;
reset role;
-- (el admin no lee filas ajenas de profiles por RLS: se verifica como superusuario)
do $$ begin
  assert (select suspended_at is not null from profiles where username = 'ana'), 'el perfil queda suspendido';
  assert (select suspension_reason from profiles where username = 'ana') = 'Estafa confirmada', 'con el motivo';
  assert (select revision from profiles where username = 'ana') = 0, 'suspender no sube la revisión';
  assert (select count(*) from profile_reports where status = 'actioned') = 2, 'se cierran todas sus denuncias abiertas';
end $$;

-- ── Suspendido: no lo ve nadie ───────────────────────────────────────────────
update profiles set username = 'ana-nueva' where username = 'ana';
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert get_public_profile('ana-nueva') ->> 'status' = 'unavailable', 'el visitante no lo ve';
  assert get_public_profile('ana') is null, 'el username viejo no redirige';
  assert get_profile_contact_card('11111111-0000-0000-0000-000000000001') is null, 'sin vCard';
  assert report_profile('ana-nueva', 'spam') = 'not_found', 'no se puede denunciar lo que no se ve';
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert get_public_profile('ana-nueva') ->> 'status' = 'unavailable', 'tampoco el dueño (Studio le avisa)';
  assert (select suspension_reason from profiles where username = 'ana-nueva') = 'Estafa confirmada', 'el dueño ve el motivo';
end $$;
reset role;

-- ── Levantar la suspensión ───────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ begin perform admin_set_suspension('11111111-0000-0000-0000-000000000001', false); end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert get_public_profile('ana-nueva') ->> 'display_name' = 'Ana', 'vuelve a verse';
  assert get_public_profile('ana') ->> 'redirect' = 'ana-nueva', 'y el username viejo redirige otra vez';
end $$;
reset role;

-- ── Descartar ────────────────────────────────────────────────────────────────
set local role anon;
select set_config('request.headers', '{"user-agent": "Mozilla/5.0", "x-forwarded-for": "4.4.4.4"}', true);
do $$ begin assert report_profile('ana-nueva', 'other', 'No me gusta') = 'ok', 'nueva denuncia'; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ declare id uuid; begin
  id := (admin_list_reports('open') -> 0 ->> 'id')::uuid;
  perform admin_resolve_report(id, 'dismiss', 'No infringe');
  assert jsonb_array_length(admin_list_reports('resolved')) = 3, 'las resueltas se pueden ver';
end $$;
reset role;
do $$ begin
  assert (select count(*) from profile_reports where status = 'dismissed') = 1, 'queda descartada';
  assert (select suspended_at is null from profiles where username = 'ana-nueva'), 'descartar no suspende';
end $$;

rollback;
