-- Topes por cuenta y por hora (20261205000001).
\ir ../../supabase/migrations/20261205000001_account_rate_limits.sql
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-6000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-6000-0000-0000-000000000002', 'beto@x');

set local role authenticated;
select set_config('request.jwt.claims', '{"aal":"aal1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-6000-0000-0000-000000000001', true);

-- ── Acción pesada: publish_space, 60 por hora ───────────────────────────────
select set_config('request.path', '/rpc/publish_space', true);
select set_config('request.method', 'POST', true);
do $$
declare i integer;
begin
  for i in 1..60 loop perform mycen_pre_request(); end loop;
  begin
    perform mycen_pre_request();
    assert false, 'la publicación 61 de la hora se frena';
  exception when others then
    assert sqlerrm = 'RATE_LIMITED' and sqlstate = 'PT429', format('responde 429 (%s %s)', sqlstate, sqlerrm);
  end;
end $$;

-- Otra cuenta no se ve afectada
select set_config('request.jwt.claim.sub', 'bbbbbbbb-6000-0000-0000-000000000002', true);
select mycen_pre_request();

-- Leer (GET) nunca cuenta, ni siquiera para la cuenta frenada
select set_config('request.jwt.claim.sub', 'aaaaaaaa-6000-0000-0000-000000000001', true);
select set_config('request.method', 'GET', true);
select set_config('request.path', '/profiles', true);
select mycen_pre_request();
reset role;

-- La hora siguiente vuelve a andar (el balde es por hora)
update mycen_rate_hits set window_start = window_start - interval '1 hour' where bucket like 'acct:%';
set local role authenticated;
select set_config('request.path', '/rpc/publish_space', true);
select set_config('request.method', 'POST', true);
select mycen_pre_request();

-- ── Escrituras en general: 6000 por hora ────────────────────────────────────
reset role;
insert into mycen_rate_hits (bucket, subject, window_start, hits)
select 'acct:writes', subject, window_start, 6000 from mycen_rate_hits
where bucket = 'acct:writes' and window_start = date_trunc('hour', now())
on conflict (bucket, subject, window_start) do update set hits = 6000;
set local role authenticated;
select set_config('request.path', '/life_brain_items', true);
select set_config('request.method', 'PATCH', true);
do $$ begin
  perform mycen_pre_request();
  assert false, 'la escritura 6001 de la hora se frena';
exception when others then
  assert sqlerrm = 'RATE_LIMITED', sqlerrm;
end $$;
-- Leer sigue andando
select set_config('request.method', 'GET', true);
select mycen_pre_request();
reset role;

-- Sin sesión no cuenta por cuenta (sigue el tope por IP de siempre)
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.path', '/rpc/get_public_profile', true);
select set_config('request.method', 'POST', true);
select mycen_pre_request();
reset role;

-- Nada guarda el id de la cuenta a la vista; nadie de la app lee ni llama a lo interno
do $$ begin
  assert not exists (select 1 from mycen_rate_hits where subject like '%aaaaaaaa-6000%'), 'sólo el hash';
  assert not has_function_privilege('authenticated', 'mycen_account_hit(text, uuid, integer)', 'execute'), 'interna';
  assert not has_function_privilege('anon', 'mycen_account_rate_limit_for(text)', 'execute'), 'interna';
end $$;

rollback;
