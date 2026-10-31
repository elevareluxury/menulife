-- Estado del sistema y autochequeo de seguridad (20261115000001): sólo super-admins; el autochequeo encuentra lo que
-- rompe las reglas (se crean a propósito una tabla sin RLS, una función sin search_path, una del panel abierta al
-- visitante y una política con auth.uid() por fila); los ajustes validan y quedan en el registro del equipo.
begin;

insert into auth.users (id, email, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x.com', now() - interval '2 days'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@mycen.id', now() - interval '90 days');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft');
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
insert into storage.objects (bucket_id, name, metadata) values
  ('media', 'a/1.webp', '{"size": 1000}'), ('media', 'a/2.webp', '{"size": 500}');
insert into public.product_events (event, props) values ('signup_started', '{}'), ('signup_started', '{}'), ('signup_completed', '{}');

-- Ana publica y no puede usar nada del panel
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$
begin
  perform publish_space('11111111-0000-0000-0000-000000000001');
  begin perform admin_system_status(); assert false, 'estado: no es admin';
  exception when insufficient_privilege then null; end;
  begin perform admin_security_selfcheck(); assert false, 'autochequeo: no es admin';
  exception when insufficient_privilege then null; end;
  begin perform admin_set_status_setting('db_limit_mb', '8000'); assert false, 'ajustes: no es admin';
  exception when insufficient_privilege then null; end;
  begin perform 1 from mycen_admin_settings; assert false, 'nadie lee los ajustes directo';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Sin sesión ni siquiera se pueden llamar
do $$ begin
  assert not has_function_privilege('anon', 'public.admin_system_status()', 'execute'), 'anon: estado';
  assert not has_function_privilege('anon', 'public.admin_security_selfcheck()', 'execute'), 'anon: autochequeo';
  assert not has_function_privilege('anon', 'public.admin_set_status_setting(text, text)', 'execute'), 'anon: ajustes';
end $$;

-- Lo que rompe las reglas, a propósito
create table public.zz_sin_rls (id int);
create function public.zz_sin_path() returns int language sql as $$ select 1 $$;
create function public.admin_zz_abierta() returns int language sql security definer set search_path = public as $$ select 1 $$;
grant execute on function public.admin_zz_abierta() to anon;
create table public.zz_con_rls (user_id uuid);
alter table public.zz_con_rls enable row level security;
create policy zz_por_fila on public.zz_con_rls for select using (user_id = auth.uid());

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$
declare s jsonb; f jsonb; cfg jsonb;
begin
  s := admin_system_status();
  assert (s -> 'db' ->> 'bytes')::bigint > 0, 'tamaño de la base';
  assert (s -> 'db' ->> 'max_connections')::int > 0, 'conexiones máximas';
  assert jsonb_array_length(s -> 'tables') between 1 and 10, 'tablas más grandes';
  assert s -> 'storage' @> '[{"bucket": "media", "files": 2, "bytes": 1500}]', 'almacenamiento por bucket';
  assert s -> 'cron' = 'null'::jsonb, 'sin pg_cron no falla';
  assert jsonb_array_length(s -> 'errors_by_day') = 14, 'errores: 14 días';
  assert (s -> 'signups' ->> 'started_24h')::int = 2 and (s -> 'signups' ->> 'completed_24h')::int = 1, 'registros';
  assert s ->> 'probe_username' = 'ana', 'perfil de prueba: el primero publicado y público';
  assert (s ->> 'sitemap_paths')::int >= 1, 'direcciones del sitemap';

  f := admin_security_selfcheck() -> 'findings';
  assert f @> '[{"rule": "a", "level": "red", "object": "zz_sin_rls"}]', 'tabla sin RLS';
  assert f @> '[{"rule": "c", "level": "red", "object": "zz_sin_path()"}]', 'función sin search_path';
  assert f @> '[{"rule": "d", "level": "red", "object": "admin_zz_abierta()"}]', 'función del panel abierta';
  assert f @> '[{"rule": "h", "level": "yellow", "object": "zz_con_rls · zz_por_fila"}]', 'auth.uid() por fila';
  assert not f @> '[{"rule": "a", "object": "mycen_admin_settings"}]', 'lo nuevo tiene RLS';
  assert not f @> '[{"rule": "d", "object": "admin_system_status()"}]', 'el panel no queda abierto';

  -- Ajustes: validan, se guardan y quedan anotados
  cfg := admin_set_status_setting('probe_username', 'Ana');
  assert cfg ->> 'probe_username' = 'ana', 'usuario en minúsculas';
  begin perform admin_set_status_setting('probe_username', 'no vale!'); assert false, 'usuario inválido';
  exception when sqlstate '22023' then null; end;
  begin perform admin_set_status_setting('db_limit_mb', '-3'); assert false, 'límite inválido';
  exception when sqlstate '22023' then null; end;
  begin perform admin_set_status_setting('otra_cosa', '1'); assert false, 'clave desconocida';
  exception when sqlstate '22023' then null; end;
  cfg := admin_set_status_setting('backup_checked_at', 'now');
  assert (cfg ->> 'backup_checked_at')::timestamptz > now() - interval '1 minute', 'la fecha la pone la base';
  cfg := admin_set_status_setting('db_limit_mb', '8192');
  assert cfg ->> 'db_limit_mb' = '8192', 'límite de la base';
  cfg := admin_set_status_setting('db_limit_mb', '');
  assert not cfg ? 'db_limit_mb', 'vacío = vuelve al de siempre';
  assert admin_system_status() -> 'settings' ->> 'probe_username' = 'ana', 'el estado devuelve los ajustes';
  assert (select count(*) from jsonb_array_elements(admin_list_audit(50)) a where a ->> 'action' = 'status_setting') = 4, 'cada cambio anotado';

  -- El resumen sigue igual con la serie en una pasada
  s := admin_overview(30);
  assert jsonb_array_length(s -> 'series') = 30, 'serie: 30 días';
  assert (select sum((d ->> 'published')::int) from jsonb_array_elements(s -> 'series') d) = 1, 'publicados por día';
  assert (select sum((d ->> 'signups')::int) from jsonb_array_elements(s -> 'series') d) = 1, 'registros por día (el admin es de hace 90 días)';
end $$;
reset role;

rollback;
