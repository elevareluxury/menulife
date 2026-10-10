-- Seguridad: super_admins y site_config sólo para administradores; las fotos no se listan entre cuentas.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@x');
insert into public.super_admins (user_id, email) values ('cccccccc-0000-0000-0000-000000000003', 'admin@x');
insert into storage.objects (bucket_id, name) values
  ('profile-media', 'aaaaaaaa-0000-0000-0000-000000000001/a.webp'),
  ('profile-media', 'cccccccc-0000-0000-0000-000000000003/c.webp');

-- ── Una cuenta común ─────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert (select count(*) from super_admins) = 0, 'una cuenta común no ve la lista de admins';
  begin
    insert into super_admins (user_id) values ('aaaaaaaa-0000-0000-0000-000000000001');
    assert false, 'nadie se agrega como admin desde la app';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from site_config) = 0, 'una cuenta común no lee site_config';
  update site_config set demo_link = 'https://malo.example';
  assert not found, 'una cuenta común no cambia site_config';
  begin
    insert into site_config (demo_link) values ('https://malo.example');
    assert false, 'una cuenta común no agrega site_config';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from storage.objects where bucket_id = 'profile-media') = 1, 'sólo lista sus fotos';
  assert (select name from storage.objects where bucket_id = 'profile-media') like 'aaaaaaaa-%', 'y son las suyas';
end $$;
reset role;

-- ── Sin cuenta ───────────────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  begin
    perform 1 from super_admins;
    assert false, 'el visitante no lee super_admins';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from storage.objects where bucket_id = 'profile-media') = 0, 'el visitante no lista fotos';
end $$;
reset role;

-- ── Un admin ─────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ begin
  assert (select count(*) from super_admins) = 1, 'el admin ve la lista';
  update site_config set demo_link = 'https://mycen.id/demo';
  assert found, 'el admin cambia site_config';
end $$;
reset role;

rollback;
