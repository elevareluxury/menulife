-- V1 · etapa 04: el tipo de módulo 'media' (video y música) se puede guardar; un tipo desconocido no.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

insert into public.profile_modules (profile_id, type, title, content, position)
values ('11111111-0000-0000-0000-000000000001', 'media', 'Mi tema',
        '{"url": "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", "provider": "spotify", "kind": "music"}', 10);

do $$ begin
  begin
    insert into public.profile_modules (profile_id, type, content, position)
    values ('11111111-0000-0000-0000-000000000001', 'iframe', '{}', 20);
    assert false, 'un tipo desconocido se rechaza';
  exception when check_violation then null; end;
end $$;

do $$ begin perform publish_space('11111111-0000-0000-0000-000000000001'); end $$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare p jsonb := get_public_profile('ana');
begin
  assert jsonb_array_length(p -> 'modules') = 1, 'el módulo se publica';
  assert p -> 'modules' -> 0 ->> 'type' = 'media';
  assert p -> 'modules' -> 0 -> 'content' ->> 'url' = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC';
end $$;

rollback;
