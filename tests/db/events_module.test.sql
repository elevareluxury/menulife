-- Módulo "Eventos": el tipo se acepta, se publica con el Space y la página pública lo recibe; un tipo desconocido no.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'prod@x');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'productora', 'Productora', 'draft');

insert into public.profile_modules (id, profile_id, type, title, content, config, position) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'events', 'Próximas fechas',
   '{"items": [{"id": "ev1abc", "title": "Noche Universo", "date": "2099-11-14", "time": "23:30", "venue": "Niceto", "url": "https://tickets.example.com/u"}]}',
   '{}', 10);

do $$
begin
  insert into public.profile_modules (profile_id, type, content, config, position)
  values ('11111111-0000-0000-0000-000000000001', 'eventos', '{}', '{}', 20);
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
declare v jsonb;
begin
  v := get_public_profile('productora');
  if not exists (
    select 1 from jsonb_array_elements(v -> 'modules') m
    where m ->> 'type' = 'events' and m -> 'content' -> 'items' -> 0 ->> 'id' = 'ev1abc'
  ) then
    raise exception 'el módulo de eventos no llegó a la página pública: %', v -> 'modules';
  end if;
end $$;
reset role;

rollback;
