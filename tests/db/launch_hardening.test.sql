-- Blindaje de lanzamiento (20261117000001): el portal de clientes no entrega códigos, los archivos de Business sólo
-- los cambia quien los subió, las tablas de referencia tienen RLS, el dueño no se cambia el plan y hay índice de errores.
begin;

-- Lo que existe en producción y no en el entorno de pruebas
create function public.portal_request_magic_link(p_email text, p_restaurant_id uuid) returns json
  language sql security definer as $$ select json_build_object('dev_code', '123456') $$;
create function public.portal_verify_code(p_email text, p_code text, p_restaurant_id uuid) returns json
  language sql security definer as $$ select '{}'::json $$;
create table public.country_configs (code text primary key, tax numeric);
create table public.date_dimension (day date primary key);
insert into public.country_configs values ('AR', 21);
grant all on public.country_configs, public.date_dimension to anon, authenticated;
create policy "Restaurant logos are publicly readable" on storage.objects for select using (bucket_id = 'restaurant-logos');

\ir ../../supabase/migrations/20261117000001_launch_hardening.sql
begin;

do $$ begin
  assert not has_function_privilege('anon', 'public.portal_request_magic_link(text, uuid)', 'execute'), 'anon: portal';
  assert not has_function_privilege('authenticated', 'public.portal_verify_code(text, text, uuid)', 'execute'), 'auth: portal';
  assert not exists (select 1 from pg_policies where policyname = 'Restaurant logos are publicly readable'), 'sin listado';
  assert (select qual from pg_policies where policyname = 'Owners can update restaurant logos') like '%owner%', 'sólo quien subió';
  assert (select relrowsecurity from pg_class where relname = 'country_configs'), 'country_configs con RLS';
  assert not has_table_privilege('anon', 'public.country_configs', 'update'), 'anon no escribe';
  assert to_regclass('public.app_error_hits_hash_day_idx') is not null, 'índice de errores';
end $$;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'duena@x.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@mycen.id');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');
insert into public.restaurants (id, owner_id, slug, name, plan, subscription_status)
values ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'cafe', 'Café', 'free', 'trial');

-- La dueña cambia su negocio, pero no su plan
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  update restaurants set name = 'Café Luna' where id = 'dddddddd-0000-0000-0000-000000000001';
  begin
    update restaurants set plan = 'pro' where id = 'dddddddd-0000-0000-0000-000000000001';
    assert false, 'no se sube el plan sola';
  exception when insufficient_privilege then null; end;
  begin
    update restaurants set subscription_status = 'active' where id = 'dddddddd-0000-0000-0000-000000000001';
    assert false, 'ni la suscripción';
  exception when insufficient_privilege then null; end;
  begin perform 1 from country_configs; exception when others then assert false, 'todos leen'; end;
end $$;
reset role;

-- El equipo sí (el permiso de fila del panel no está en este entorno: se prueba sólo la regla del plan)
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
update restaurants set plan = 'pro' where id = 'dddddddd-0000-0000-0000-000000000001';
-- Y el servidor, sin sesión
select set_config('request.jwt.claim.sub', '', true);
update restaurants set subscription_status = 'active' where id = 'dddddddd-0000-0000-0000-000000000001';
do $$ begin
  assert (select plan from restaurants where id = 'dddddddd-0000-0000-0000-000000000001') = 'pro', 'plan del equipo';
  assert (select name from restaurants where id = 'dddddddd-0000-0000-0000-000000000001') = 'Café Luna', 'lo demás se edita';
end $$;

rollback;
