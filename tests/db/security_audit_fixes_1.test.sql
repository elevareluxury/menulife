-- Auditoría de seguridad, arreglos 1–3 (20261129000001): archivos de cuentas suspendidas o retenidas, sin oráculo de
-- retención y verificación en dos pasos exigida por la base.
\ir ../../supabase/migrations/20261129000001_security_audit_fixes_1.sql
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-1000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-1000-0000-0000-000000000002', 'beto@x'),
  ('dddddddd-1000-0000-0000-000000000004', 'dora@x'),
  ('cccccccc-1000-0000-0000-000000000003', 'admin@x');
insert into public.super_admins (user_id) values ('cccccccc-1000-0000-0000-000000000003');
insert into profiles (id, user_id, username, display_name, status, is_primary) values
  ('11111111-1000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 'ana-sec', 'Ana', 'published', true),
  ('22222222-1000-0000-0000-000000000002', 'bbbbbbbb-1000-0000-0000-000000000002', 'beto-sec', 'Beto', 'published', true),
  ('44444444-1000-0000-0000-000000000004', 'dddddddd-1000-0000-0000-000000000004', 'dora-sec', 'Dora', 'published', true);
insert into storage.objects (bucket_id, name, owner)
values ('profile-media', 'aaaaaaaa-1000-0000-0000-000000000001/foto.webp', 'aaaaaaaa-1000-0000-0000-000000000001');

-- ── 2. Sin oráculo: una cuenta común no pregunta por retenciones ──────────────
do $$ begin
  assert not has_function_privilege('authenticated', 'public.mycen_has_legal_hold(uuid)', 'execute'), 'has_legal_hold cerrado';
  assert not has_function_privilege('authenticated', 'public.mycen_folder_on_hold(text)', 'execute'), 'folder_on_hold cerrado';
  assert not has_function_privilege('anon', 'mycen_private.folder_on_hold(text)', 'execute'), 'anon no usa lo privado';
  assert not has_schema_privilege('anon', 'mycen_private', 'usage'), 'anon no entra al esquema privado';
  assert not has_function_privilege('authenticated', 'public.mycen_mfa_pending_rpc_allowed(text)', 'execute'), 'lista interna';
  assert exists (select 1 from storage.buckets where id = 'mycen-evidence' and not public), 'bucket de evidencia privado';
end $$;

-- ── 1. Suspendida: no sube ni cambia archivos (sí puede borrarlos) ─────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-1000-0000-0000-000000000003', true);
select admin_set_suspension('22222222-1000-0000-0000-000000000002', true, 'test');
select set_config('request.jwt.claim.sub', 'bbbbbbbb-1000-0000-0000-000000000002', true);
do $$ begin
  insert into storage.objects (bucket_id, name, owner)
  values ('profile-media', 'bbbbbbbb-1000-0000-0000-000000000002/nueva.webp', 'bbbbbbbb-1000-0000-0000-000000000002');
  assert false, 'una cuenta suspendida no sube';
exception when insufficient_privilege then null;
end $$;

-- Una cuenta común sí sube a su carpeta
select set_config('request.jwt.claim.sub', 'dddddddd-1000-0000-0000-000000000004', true);
insert into storage.objects (bucket_id, name, owner)
values ('profile-media', 'dddddddd-1000-0000-0000-000000000004/ok.webp', 'dddddddd-1000-0000-0000-000000000004');
reset role;

-- Retenida (abuso infantil): no sube, no cambia, no borra
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-1000-0000-0000-000000000003', true);
select admin_csam_action('11111111-1000-0000-0000-000000000001', null);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1000-0000-0000-000000000001', true);
do $$ begin
  insert into storage.objects (bucket_id, name, owner)
  values ('profile-files', 'aaaaaaaa-1000-0000-0000-000000000001/otro.pdf', 'aaaaaaaa-1000-0000-0000-000000000001');
  assert false, 'una cuenta retenida no sube';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  delete from storage.objects where name like 'aaaaaaaa-1000-0000-0000-000000000001/%';
  update storage.objects set metadata = '{"x":1}' where name like 'aaaaaaaa-1000-0000-0000-000000000001/%';
end $$;
-- Ni lee el bucket de evidencia
do $$ begin
  assert not exists (select 1 from storage.objects where bucket_id = 'mycen-evidence'), 'evidencia invisible';
end $$;
reset role;
do $$ begin
  assert exists (select 1 from storage.objects where name = 'aaaaaaaa-1000-0000-0000-000000000001/foto.webp' and metadata is null),
    'la foto retenida sigue igual';
end $$;

-- La bitácora del pase a evidencia: sólo el equipo y sólo con retención
set local role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-1000-0000-0000-000000000004', true);
do $$ begin
  perform admin_log_evidence_quarantine('aaaaaaaa-1000-0000-0000-000000000001', 1);
  assert false, 'sólo el equipo';
exception when insufficient_privilege then null;
end $$;
select set_config('request.jwt.claim.sub', 'cccccccc-1000-0000-0000-000000000003', true);
do $$ begin
  perform admin_log_evidence_quarantine('dddddddd-1000-0000-0000-000000000004', 1);
  assert false, 'sin retención no hay pase a evidencia';
exception when invalid_parameter_value then null;
end $$;
select admin_log_evidence_quarantine('aaaaaaaa-1000-0000-0000-000000000001', 1);
reset role;
do $$ begin
  assert exists (select 1 from admin_audit_log where action = 'evidence_quarantined'
                 and target_id = 'aaaaaaaa-1000-0000-0000-000000000001'), 'queda en la bitácora';
end $$;

-- ── 3. Dos pasos exigidos por la base ─────────────────────────────────────────
insert into auth.mfa_factors (user_id, status) values ('dddddddd-1000-0000-0000-000000000004', 'verified');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-1000-0000-0000-000000000004', true);
select set_config('request.jwt.claims', '{"aal":"aal1","role":"authenticated"}', true);
-- Tablas y RPC privadas: frenadas
select set_config('request.path', '/profiles', true);
do $$ begin
  perform mycen_pre_request();
  assert false, 'aal1 con factor no lee tablas';
exception when insufficient_privilege then null;
end $$;
select set_config('request.path', '/rpc/publish_space', true);
do $$ begin
  perform mycen_pre_request();
  assert false, 'aal1 con factor no publica';
exception when insufficient_privilege then null;
end $$;
-- RPC públicas: pasan (la página pública sigue andando)
select set_config('request.path', '/rpc/get_public_profile', true);
select mycen_pre_request();
-- Archivos: frenados
do $$ begin
  insert into storage.objects (bucket_id, name, owner)
  values ('profile-media', 'dddddddd-1000-0000-0000-000000000004/sin-codigo.webp', 'dddddddd-1000-0000-0000-000000000004');
  assert false, 'aal1 con factor no sube';
exception when insufficient_privilege then null;
end $$;

-- Con el código (aal2): todo pasa
select set_config('request.jwt.claims', '{"aal":"aal2","role":"authenticated"}', true);
select set_config('request.path', '/profiles', true);
select mycen_pre_request();
insert into storage.objects (bucket_id, name, owner)
values ('profile-media', 'dddddddd-1000-0000-0000-000000000004/con-codigo.webp', 'dddddddd-1000-0000-0000-000000000004');

-- Sin factor verificado, aal1 alcanza (dos pasos es opcional)
select set_config('request.jwt.claim.sub', 'bbbbbbbb-1000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"aal":"aal1","role":"authenticated"}', true);
select mycen_pre_request();
-- Un factor sin verificar no cuenta
reset role;
insert into auth.mfa_factors (user_id, status) values ('bbbbbbbb-1000-0000-0000-000000000002', 'unverified');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-1000-0000-0000-000000000002', true);
select mycen_pre_request();

-- Un visitante sin sesión no cambia
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.path', '/rpc/get_site_flags', true);
select mycen_pre_request();
reset role;

rollback;
