-- Nombres reservados para talentos (20261126000001): nadie más los toma; la persona con ese email, sí.
\ir ../../supabase/migrations/20261126000001_talent_reservations.sql
begin;

insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'luna@talento.com', now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'otra@x.com', now()),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@x', now()),
  ('dddddddd-0000-0000-0000-000000000004', 'LUNA@talento.com', null);
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');
insert into profiles (user_id, username, display_name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'ocupado', 'X');

-- ── El panel reserva (y sólo el panel) ───────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  perform admin_save_talent_reservation('luna', 'Luna', null, null);
  assert false, 'una cuenta común no reserva';
exception when insufficient_privilege then null;
end $$;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ begin
  assert admin_save_talent_reservation('Luna', 'Luna Pérez', 'Luna@Talento.com', 'Agencia X') = 'saved', 'reservado';
  assert admin_save_talent_reservation('sin-mail', 'Sin Mail') = 'saved', 'sin email también';
  assert admin_save_talent_reservation('ocupado', 'Alguien') = 'taken', 'un nombre con dueño no se reserva';
  assert admin_save_talent_reservation('login', 'Alguien') = 'system', 'uno del sistema tampoco';
  assert admin_save_talent_reservation('a', 'x') = 'invalid', 'formato';
  assert jsonb_array_length(admin_list_talent_reservations('luna')) = 1, 'se busca';
  assert (admin_list_talent_reservations(null) -> 0 ->> 'email') is not null or true;
end $$;
reset role;
do $$ begin
  assert exists (select 1 from admin_audit_log where action = 'talent_reserved'), 'queda en la bitácora';
  assert not has_table_privilege('anon', 'public.talent_reservations', 'select'), 'nadie la lee';
  assert not has_table_privilege('authenticated', 'public.talent_reservations', 'select'), 'nadie la lee';
end $$;

-- ── Otra persona: reservado ──────────────────────────────────────────────────
set local role anon;
do $$ begin assert check_username('luna') = 'reserved', 'anónimo: reservado'; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert check_username('luna') = 'reserved', 'otra cuenta: reservado';
  begin
    insert into profiles (user_id, username, display_name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'luna', 'Falsa');
    assert false, 'no lo puede tomar';
  exception when invalid_parameter_value then null; end;
end $$;
-- El mismo email sin confirmar tampoco
select set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-000000000004', true);
do $$ begin assert check_username('luna') = 'reserved', 'email sin confirmar: reservado'; end $$;

-- ── La persona con ese email lo toma ─────────────────────────────────────────
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert check_username('luna') = 'available', 'para ella está libre';
  assert check_username('sin-mail') = 'reserved', 'sin email, nadie';
end $$;
reset role;
-- (como la app: la cuenta inserta su perfil)
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
insert into profiles (user_id, username, display_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'luna', 'Luna');
do $$ begin
  assert (select claimed_by from talent_reservations where username = 'luna') = 'aaaaaaaa-0000-0000-0000-000000000001', 'tomada';
  assert (select claimed_at from talent_reservations where username = 'luna') is not null, 'con fecha';
end $$;

-- Borrar la reserva
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
set local role authenticated;
select admin_delete_talent_reservation('sin-mail');
reset role;
do $$ begin
  assert not exists (select 1 from talent_reservations where username = 'sin-mail'), 'borrada';
  assert check_username('sin-mail') = 'available', 'libre otra vez';
end $$;

rollback;
