-- Interruptores de emergencia, verificación en dos pasos del equipo y retención de evidencia (20261124000001).
\ir ../../supabase/migrations/20261124000001_emergency_switches_mfa_csam.sql
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@x');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');

-- ── 1. Interruptores: prendidos de entrada, los lee cualquiera ───────────────
set local role anon;
do $$
declare f jsonb := get_site_flags();
begin
  assert (f ->> 'signups')::boolean and (f ->> 'messages')::boolean and (f ->> 'subscriptions')::boolean
     and (f ->> 'polls')::boolean, 'todo prendido de entrada';
  assert not (f ->> 'business')::boolean, 'Business sigue apagado';
end $$;
reset role;

-- El equipo (con el segundo paso) apaga los mensajes: la RPC responde 503 en el gancho previo
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ begin
  assert not (admin_set_site_flag('messages', false) ->> 'messages')::boolean, 'mensajes apagados';
end $$;
reset role;

select set_config('request.path', '/rpc/submit_profile_message', true);
select set_config('request.headers', '{"cf-connecting-ip":"203.0.113.50"}', true);
do $$ begin
  perform mycen_pre_request();
  assert false, 'con mensajes apagados no pasa';
exception when sqlstate 'PT503' then null;
end $$;
select set_config('request.path', '/rpc/submit_profile_collab', true);
do $$ begin
  perform mycen_pre_request();
  assert false, 'colaboraciones también';
exception when sqlstate 'PT503' then null;
end $$;
-- Lo demás sigue andando
select set_config('request.path', '/rpc/subscribe_profile', true);
do $$ begin perform mycen_pre_request(); end $$;
select set_config('request.path', '/rpc/get_public_profile', true);
do $$ begin perform mycen_pre_request(); end $$;

-- Registros apagados: no se crea ninguna cuenta
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
select admin_set_site_flag('signups', false);
reset role;
do $$ begin
  insert into auth.users (id, email) values ('dddddddd-0000-0000-0000-000000000004', 'nuevo@x');
  assert false, 'registros en pausa';
exception when insufficient_privilege then null;
end $$;
set local role authenticated;
select admin_set_site_flag('signups', true);
reset role;
insert into auth.users (id, email) values ('dddddddd-0000-0000-0000-000000000004', 'nuevo@x');

-- ── 2. El equipo necesita el segundo paso ─────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"aal":"aal1","sub":"cccccccc-0000-0000-0000-000000000003"}', true);
do $$ begin
  assert not mycen_is_admin(), 'con contraseña sola no es admin';
  begin
    perform admin_set_site_flag('polls', false);
    assert false, 'el panel no responde sin el segundo paso';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims', '{"aal":"aal2","sub":"cccccccc-0000-0000-0000-000000000003"}', true);
do $$ begin
  assert mycen_is_admin(), 'con el segundo paso, sí';
end $$;
-- Una cuenta común con aal2 sigue sin ser admin
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert not mycen_is_admin(), 'aal2 no hace admin a nadie';
end $$;
reset role;
do $$ begin
  assert not has_table_privilege('authenticated', 'public.mycen_security_settings', 'select'), 'nadie lee el ajuste';
end $$;

-- ── 3. Retención de evidencia ────────────────────────────────────────────────
insert into profiles (id, user_id, username, display_name, status, is_primary)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'published', true);
insert into profile_reports (id, profile_id, reason, status)
values ('99999999-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000001', 'sexual', 'open');
insert into storage.objects (bucket_id, name, owner)
values ('profile-media', 'aaaaaaaa-0000-0000-0000-000000000001/foto.webp', 'aaaaaaaa-0000-0000-0000-000000000001');

-- Una cuenta común no puede usarla
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  perform admin_csam_action('11111111-0000-0000-0000-000000000001', null);
  assert false, 'sólo el equipo';
exception when insufficient_privilege then null;
end $$;

select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
select admin_csam_action('11111111-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000009');
do $$ begin
  assert (admin_get_legal_hold('aaaaaaaa-0000-0000-0000-000000000001') ->> 'reason') = 'csam', 'en retención';
  -- Ni el equipo borra los archivos mientras dure
  delete from storage.objects where name like 'aaaaaaaa-0000-0000-0000-000000000001/%';
end $$;
reset role;
do $$ begin
  assert (select suspended_at from profiles where id = '11111111-0000-0000-0000-000000000001') is not null, 'suspendido';
  assert (select suspension_reason from profiles where id = '11111111-0000-0000-0000-000000000001') not ilike '%csam%',
    'el motivo que ve la persona no lo dice';
  assert (select status from profile_reports where id = '99999999-0000-0000-0000-000000000009') = 'actioned', 'denuncia cerrada';
  assert exists (select 1 from storage.objects where name like 'aaaaaaaa-0000-0000-0000-000000000001/%'), 'la evidencia queda';
  assert exists (select 1 from admin_audit_log where action = 'csam_hold'), 'queda en la bitácora';
  begin
    delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
    assert false, 'la cuenta no se borra con retención';
  exception when insufficient_privilege then null; end;
end $$;

-- La dueña tampoco borra sus fotos
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  delete from storage.objects where name like 'aaaaaaaa-0000-0000-0000-000000000001/%';
  assert (select count(*) from storage.objects) >= 0;
end $$;
reset role;
do $$ begin
  assert exists (select 1 from storage.objects where name like 'aaaaaaaa-0000-0000-0000-000000000001/%'), 'sigue la foto';
end $$;

-- Al levantar la retención, se puede borrar
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
select admin_release_legal_hold('aaaaaaaa-0000-0000-0000-000000000001');
reset role;
do $$ begin
  assert not mycen_has_legal_hold('aaaaaaaa-0000-0000-0000-000000000001'), 'retención levantada';
  assert exists (select 1 from admin_audit_log where action = 'legal_hold_released'), 'anotado';
end $$;

rollback;
