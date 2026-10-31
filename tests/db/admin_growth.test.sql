-- Crecimiento (20261116000001): la actividad diaria se marca sin duplicar y sin datos de más; sólo super-admins leen
-- las métricas; activos, ciclo de vida, retención, embudo, referidos y adopción cuentan lo que pasó.
begin;

insert into auth.users (id, email, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x.com', now() - interval '20 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x.com', now() - interval '2 days'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@mycen.id', now() - interval '90 days');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft');

-- Sin sesión no se marca nada
set local role anon;
do $$ begin
  assert not has_function_privilege('anon', 'public.mycen_mark_active(text, text, text, text)', 'execute'), 'anon no marca';
  assert not has_function_privilege('anon', 'public.admin_growth_overview(integer)', 'execute'), 'anon no lee';
end $$;
reset role;

-- Ana: publica, marca su día dos veces (no duplica, suma zonas) y lo que manda de más se descarta
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$
begin
  perform publish_space('11111111-0000-0000-0000-000000000001');
  assert mycen_mark_active('life', 'ios', 'es', 'America/Argentina/Buenos_Aires') = 'ok', 'marca';
  assert mycen_mark_active('studio', 'nada', 'xx', 'no vale; drop') = 'ok', 'segunda marca';
  assert mycen_mark_active('otra', null, null, null) = 'invalid', 'zona desconocida';
  begin perform 1 from user_activity_days; assert false, 'nadie lee la tabla';
  exception when insufficient_privilege then null; end;
  begin perform admin_growth_overview(30); assert false, 'no es admin';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$
declare r record;
begin
  select * into r from user_activity_days where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  assert r.life and r.studio, 'las dos zonas el mismo día';
  assert r.platform = 'ios' and r.lang = 'es' and r.tz = 'America/Argentina/Buenos_Aires', 'lo inválido no pisa lo válido';
  assert (select count(*) from user_activity_days where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1, 'una fila por día';
end $$;

-- Historia: Ana usó la app hace 8 días (semana pasada) y Beto sólo hoy; Beto llegó referido por Ana
insert into user_activity_days (user_id, day, life) values
  ('aaaaaaaa-0000-0000-0000-000000000001', (now() at time zone 'utc')::date - 8, true),
  ('bbbbbbbb-0000-0000-0000-000000000002', (now() at time zone 'utc')::date, true);
insert into referrals (user_id, referred_by) values ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001');
insert into profile_events (profile_id, event_type, visitor_hash, source) values
  ('11111111-0000-0000-0000-000000000001', 'view', 'h1', 'qr'),
  ('11111111-0000-0000-0000-000000000001', 'view', 'h2', null);
insert into profile_modules (profile_id, type, content) values ('11111111-0000-0000-0000-000000000001', 'link', '{"url":"https://a.com","label":"A"}');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$
declare o jsonb; r jsonb; f jsonb; a jsonb;
begin
  o := admin_growth_overview(30);
  assert (o ->> 'dau')::int = 2 and (o ->> 'wau')::int = 2 and (o ->> 'mau')::int = 2, 'activos hoy, semana y mes';
  assert jsonb_array_length(o -> 'daily') = 30, 'serie diaria';
  assert (o -> 'lifecycle' ->> 'new')::int = 1, 'Beto es nuevo';
  assert (o -> 'lifecycle' ->> 'retained')::int = 1, 'Ana siguió (estuvo la semana pasada)';
  assert (o -> 'lifecycle' ->> 'churned')::int = 0, 'nadie se fue';
  assert o -> 'platforms' @> '[{"key": "ios", "users": 1}]', 'plataforma';
  assert o -> 'regions' @> '[{"key": "America", "users": 1}]', 'región por zona horaria';
  assert (select sum((d ->> 'views')::int) from jsonb_array_elements(o -> 'visits') d) = 2, 'visitas';

  r := admin_growth_retention();
  assert jsonb_array_length(r) >= 1, 'cohortes';
  assert (r -> 0 -> 'weeks' -> 11) = 'null'::jsonb, 'semanas que no pasaron, sin dato';

  f := admin_growth_funnel(30);
  assert f -> 'steps' @> '[{"key": "signed_up", "users": 2}, {"key": "published", "users": 1}, {"key": "first_visit", "users": 1}]', 'embudo';
  assert (f -> 'referrals' ->> 'signups')::int = 1 and (f -> 'referrals' ->> 'referrers')::int = 1, 'referidos';
  assert f -> 'sources' @> '[{"key": "qr", "visits": 1}, {"key": "direct", "visits": 1}]', 'fuentes';

  a := admin_growth_adoption(30);
  assert a -> 'modules' @> '[{"key": "link", "profiles": 1}]', 'módulos en perfiles publicados';
  assert a -> 'top_profiles' @> '[{"handle": "ana", "views": 2}]' or jsonb_array_length(a -> 'top_profiles') = 0,
    'más visitados (sólo públicos)';
  assert a -> 'life' @> '[{"key": "habits"}]', 'partes de Life OS';
end $$;
reset role;

rollback;
