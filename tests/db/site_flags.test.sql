-- Interruptores del sitio: cualquiera los lee con la RPC, sólo un super-admin los cambia.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@x');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');

-- ── Anónimo: lee con la RPC, nunca la tabla ──────────────────────────────────
set local role anon;
do $$
begin
  assert (get_site_flags() ->> 'business')::boolean = false, 'Business arranca apagado';
  begin
    perform 1 from mycen_site_flags;
    assert false, 'anónimo no lee la tabla';
  exception when insufficient_privilege then null; end;
  begin
    perform admin_set_site_flag('business', true);
    assert false, 'anónimo no cambia nada';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ── Una cuenta común tampoco ─────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$
begin
  begin
    perform admin_set_site_flag('business', true);
    assert false, 'no es admin';
  exception when insufficient_privilege then null; end;
  begin
    update mycen_site_flags set enabled = true;
    assert false, 'no escribe la tabla';
  exception when insufficient_privilege then null; end;
  assert (get_site_flags() ->> 'business')::boolean = false, 'sigue apagado';
end $$;
reset role;

-- ── El super-admin lo prende y lo apaga ──────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$
begin
  assert (admin_set_site_flag('business', true) ->> 'business')::boolean, 'prendido';
  assert (get_site_flags() ->> 'business')::boolean, 'se lee prendido';
  begin
    perform admin_set_site_flag('otra', true);
    assert false, 'clave desconocida';
  exception when invalid_parameter_value then null; end;
  assert not (admin_set_site_flag('business', false) ->> 'business')::boolean, 'apagado otra vez';
end $$;
reset role;

rollback;
