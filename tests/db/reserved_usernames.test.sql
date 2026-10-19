-- Nombres reservados del lanzamiento (20261110000001): nadie registra marcas, equipo/soporte ni insultos, y quien ya
-- tenía uno de esos nombres lo conserva.

-- Se puede volver a correr (en el SQL Editor se aplica a mano): no falla ni duplica nada
\i supabase/migrations/20261110000001_reserved_usernames_expand.sql

begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');

-- ── Las tres listas están en la tabla ────────────────────────────────────────
do $$ begin
  assert (select reason from reserved_usernames where username = 'mycen-support') = 'staff';
  assert (select reason from reserved_usernames where username = 'paypal') = 'brand';
  assert (select reason from reserved_usernames where username = 'mercadopago') = 'brand';
  assert (select reason from reserved_usernames where username = 'hitler') = 'blocked';
  -- Lo que ya estaba conserva su motivo
  assert (select reason from reserved_usernames where username = 'mycen') = 'brand';
  assert (select reason from reserved_usernames where username = 'eliminar-cuenta') = 'route';
end $$;

-- ── Ana ya tenía "apple" de antes (se simula con la importación legada) ──────
select set_config('mycen.legacy_import', 'on', true);
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'apple', 'Ana', 'published');
select set_config('mycen.legacy_import', 'off', true);

-- Lo sigue editando sin cambiar el nombre
update public.profiles set display_name = 'Ana B.' where id = '11111111-0000-0000-0000-000000000001';
do $$ begin
  assert (select username from profiles where id = '11111111-0000-0000-0000-000000000001') = 'apple';
end $$;

-- ── Nadie más puede elegirlos ───────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert check_username('apple') = 'reserved';
  assert check_username('PayPal') = 'reserved';
  assert check_username('mycenid') = 'reserved';
  assert check_username('verificado') = 'reserved';
  assert check_username('pelotudo') = 'reserved';
  assert check_username('beto-tienda') = 'available';
end $$;
reset role;

do $$ begin
  insert into public.profiles (user_id, username, display_name)
  values ('bbbbbbbb-0000-0000-0000-000000000002', 'openai', 'Beto');
  assert false, 'openai debería estar reservado';
exception when others then assert sqlerrm = 'USERNAME_RESERVED', sqlerrm; end $$;

insert into public.profiles (id, user_id, username, display_name)
values ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'beto', 'Beto');
do $$ begin
  update public.profiles set username = 'soporte-mycen' where id = '22222222-0000-0000-0000-000000000002';
  assert false, 'soporte-mycen debería estar reservado';
exception when others then assert sqlerrm = 'USERNAME_RESERVED', sqlerrm; end $$;

rollback;
