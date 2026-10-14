-- Verificación de cuenta: pedirla, revisarla y el tilde en la página pública.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@x');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft');

-- ── La dueña pide la verificación ────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$
declare v_id uuid;
begin
  perform publish_space('11111111-0000-0000-0000-000000000001');
  assert request_verification('hola') = 'invalid', 'mensaje muy corto';
  assert request_verification('Soy Ana, diseñadora', 'http://ana.com') = 'invalid', 'el link tiene que ser https';
  assert request_verification('Soy Ana, diseñadora en Rosario', 'https://instagram.com/ana') = 'ok', 'pide';
  assert request_verification('Soy Ana, otra vez', null) = 'pending', 'una pendiente por vez';
  assert (select count(*) from verification_requests) = 1, 've su pedido';
  -- No puede ponerse el tilde sola
  begin
    update identities set verified_at = now() where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
    assert false, 'la dueña no se verifica sola';
  exception when insufficient_privilege then null; end;
  begin
    insert into verification_requests (user_id, identity_id, message)
    select user_id, id, 'insertado directo' from identities where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
    assert false, 'nadie inserta directo';
  exception when insufficient_privilege then null; end;
  begin
    perform admin_list_verifications('pending');
    assert false, 'no es admin';
  exception when insufficient_privilege then null; end;
  assert not (get_public_profile('ana') ->> 'verified')::boolean, 'todavía sin tilde';
end $$;
reset role;

-- ── Otra cuenta no ve pedidos ajenos ─────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from verification_requests) = 0, 'no ve pedidos ajenos';
end $$;
reset role;

-- ── El admin aprueba ─────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$
declare v jsonb;
begin
  v := admin_list_verifications('pending');
  assert jsonb_array_length(v) = 1, 'un pedido pendiente';
  assert v -> 0 -> 'profile' ->> 'username' = 'ana', 'con su perfil';
  perform admin_resolve_verification((v -> 0 ->> 'id')::uuid, true, 'Ok');
  assert jsonb_array_length(admin_list_verifications('pending')) = 0, 'ya no está pendiente';
end $$;
reset role;

-- ── Visitante: ve el tilde ───────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert (get_public_profile('ana') ->> 'verified')::boolean, 'el perfil muestra el tilde';
end $$;
reset role;

-- ── Ya verificada, no vuelve a pedir; el admin puede quitarlo ────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert request_verification('Quiero verificar de nuevo', null) = 'verified', 'ya está verificada';
end $$;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ begin
  perform admin_set_verified('aaaaaaaa-0000-0000-0000-000000000001', false);
  assert not (get_public_profile('ana') ->> 'verified')::boolean, 'sin tilde otra vez';
end $$;
reset role;

rollback;
