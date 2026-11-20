-- Avisos al equipo, revisión de links y escala de la analítica (20261125000001).
\ir ../../supabase/migrations/20261125000001_alerts_links_events_scale.sql
begin;

insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x');
insert into profiles (id, user_id, username, display_name, status, is_primary)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'published', true);
insert into profile_versions (id, profile_id, version_number, snapshot)
values ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 1,
  '{"modules":[{"type":"link","content":{"url":"https://phish.example/login","title":"Banco"}},
               {"type":"text","content":{"body":"Mi web: no es un link suelto https://x.example con espacio"}},
               {"type":"social","content":{"items":[{"url":"http://ig.example/ana"}]}}]}');
update profiles set published_version_id = '22222222-0000-0000-0000-000000000002' where id = '11111111-0000-0000-0000-000000000001';

-- ── 1. La llave: sólo desde el SQL Editor; sin ella, nada responde ─────────────
do $$
declare k text;
begin
  assert not has_function_privilege('anon', 'public.mycen_set_cron_key()', 'execute'), 'anon no crea llaves';
  assert not has_function_privilege('authenticated', 'public.mycen_set_cron_key()', 'execute'), 'una cuenta tampoco';
  assert not has_table_privilege('anon', 'public.mycen_cron_keys', 'select'), 'nadie lee las llaves';
  k := mycen_set_cron_key();
  assert char_length(k) = 64, 'llave de 64';
  assert (select key_hash from mycen_cron_keys) <> k, 'se guarda el hash, no la llave';
  perform set_config('test.key', k, true);
end $$;

set local role anon;
do $$ begin
  perform cron_alert_digest('una-llave-cualquiera-que-no-es-la-correcta-0000', now());
  assert false, 'sin la llave correcta, nada';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform cron_recent_links(null, now());
  assert false, 'sin llave, nada';
exception when insufficient_privilege then null;
end $$;

-- ── 2. Resumen para los avisos ───────────────────────────────────────────────
do $$
declare d jsonb := cron_alert_digest(current_setting('test.key'), now() - interval '1 hour');
begin
  assert d ? 'new_errors' and d ? 'signups_hour' and d ? 'reports' and d ? 'flags', 'trae lo que usa el aviso';
  assert (d -> 'flags' ->> 'messages')::boolean, 'con los interruptores';
end $$;

-- ── 3. Links de lo publicado y denuncia una sola vez ──────────────────────────
do $$
declare n int;
begin
  select count(*) into n from cron_recent_links(current_setting('test.key'), now() - interval '1 hour');
  assert n = 2, 'dos links (el de un texto con espacios no cuenta): ' || n;
  assert exists (select 1 from cron_recent_links(current_setting('test.key'), now() - interval '1 hour')
                 where url = 'https://phish.example/login' and handle = 'ana'), 'con su perfil';
  assert cron_flag_link(current_setting('test.key'), '11111111-0000-0000-0000-000000000001', 'https://phish.example/login', 'SOCIAL_ENGINEERING') = 'flagged', 'marcado';
  assert cron_flag_link(current_setting('test.key'), '11111111-0000-0000-0000-000000000001', 'https://phish.example/login', 'SOCIAL_ENGINEERING') = 'duplicate', 'una sola vez';
end $$;
reset role;
do $$ begin
  assert (select count(*) from profile_reports where reason = 'scam' and reporter_hash = 'system:web-risk') = 1, 'una denuncia para el equipo';
  assert (select suspended_at from profiles where id = '11111111-0000-0000-0000-000000000001') is null, 'el perfil no se suspende solo';
  assert not has_table_privilege('anon', 'public.mycen_link_flags', 'select'), 'nadie lee las marcas';
end $$;

-- ── 4. Retención de las visitas ──────────────────────────────────────────────
insert into profile_events (profile_id, event_type, created_at) values
  ('11111111-0000-0000-0000-000000000001', 'view', now() - interval '14 months'),
  ('11111111-0000-0000-0000-000000000001', 'view', now() - interval '2 months');
do $$
declare r jsonb := mycen_purge_expired();
begin
  assert (r ->> 'profile_events')::int = 1, 'se borra sólo la de más de 13 meses';
  assert (select count(*) from profile_events) = 1, 'queda la reciente';
  assert exists (select 1 from pg_indexes where indexname = 'profile_events_views_time_idx'), 'índice de visitas por fecha';
end $$;

rollback;
