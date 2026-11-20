-- Portfolio profesional: los 6 tipos se aceptan, se publican con el Space y llegan a la página; uno oculto no llega.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'luna@x');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'lunamodelo', 'Luna', 'draft');

insert into public.profile_modules (id, profile_id, type, title, content, config, position, visibility) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'measurements', null, '{"height": "178", "waist": "61"}', '{}', 10, 'active'),
  ('a0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'audience', null,
   '{"as_of": "2026-11-01", "items": [{"platform": "instagram", "followers": 120000}]}', '{}', 20, 'hidden'),
  ('a0000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'brands', null, '{"items": [{"name": "Marca"}]}', '{}', 30, 'active'),
  ('a0000000-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'press', null, '{"items": [{"quote": "Brilla", "outlet": "Diario"}]}', '{}', 40, 'active'),
  ('a0000000-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'credits', null, '{"items": [{"title": "Campaña"}]}', '{}', 50, 'active'),
  ('a0000000-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', 'representation', null,
   '{"items": [{"role": "agency", "name": "Agencia Sur", "email": "booking@sur.com"}]}', '{}', 60, 'active');

do $$
begin
  insert into public.profile_modules (profile_id, type, content, config, position)
  values ('11111111-0000-0000-0000-000000000001', 'medidas', '{}', '{}', 70);
  raise exception 'un tipo desconocido no debería entrar';
exception when check_violation then null;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;
reset role;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare v jsonb; types text[];
begin
  v := get_public_profile('lunamodelo');
  select array_agg(m ->> 'type' order by m ->> 'type') into types from jsonb_array_elements(v -> 'modules') m;
  if types is distinct from array['brands','credits','measurements','press','representation'] then
    raise exception 'tipos publicados inesperados: %', types;
  end if;
end $$;
reset role;

-- Tipos de talento del onboarding
update public.profiles set purpose = 'model' where id = '11111111-0000-0000-0000-000000000001';
do $$
begin
  update public.profiles set purpose = 'modelo' where id = '11111111-0000-0000-0000-000000000001';
  raise exception 'un propósito desconocido no debería entrar';
exception when check_violation then null;
end $$;

rollback;
