-- V1 · etapa 08: "Creá tu identidad". Una atribución por cuenta, sólo a perfiles publicados de otra persona.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'caro@x');
insert into public.profiles (id, user_id, username, display_name, status, purpose)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft', 'creator'),
       ('33333333-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003', 'caro', 'Caro', 'draft', 'personal');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;

-- Sin cuenta no se puede llamar
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  perform record_referral('ana', 'creator');
  raise exception 'anon no debería poder';
exception when insufficient_privilege then null;
end $$;

-- Beto (cuenta nueva) llegó desde el perfil de Ana
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert record_referral('nadie', null) = 'not_found';
  assert record_referral('caro', null) = 'not_found', 'Caro no publicó';
  assert record_referral('ANA', 'creator') = 'ok';
  assert record_referral('caro', null) = 'already', 'la primera atribución gana';
  assert (select referred_by from referrals) = '11111111-0000-0000-0000-000000000001';
  assert (select purpose from referrals) = 'creator';
end $$;

-- Nadie inserta directo; cada uno ve sólo la suya
do $$ begin
  insert into referrals (user_id, referred_by) values ('bbbbbbbb-0000-0000-0000-000000000002', null);
  raise exception 'insert directo no debería poder';
exception when insufficient_privilege then null;
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert (select count(*) from referrals) = 0, 'Ana no ve la fila de Beto';
  assert record_referral('ana', null) = 'self', 'no se refiere a sí misma';
end $$;

-- Un propósito con caracteres raros se descarta
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ begin
  assert record_referral('ana', 'x; drop') = 'ok';
  assert (select purpose from referrals) is null;
end $$;

rollback;
