-- Auditoría de seguridad, hallazgos medios restantes (20261130000001): negocios y productos sin lectura cruzada, nadie
-- crea negocios desde la app, el tilde sigue al nombre, versiones con tope y tarjetas de proyectos con tope.
begin;

-- Productos como en producción: una política "para cualquiera" (activos) y la del dueño
create table public.products (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null, name text, cost numeric,
  is_active boolean not null default true);
alter table public.products enable row level security;
create policy "Anyone can read products" on public.products for select using (is_active = true);
create policy "Owners manage products" on public.products for all to authenticated
  using (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));
grant select, insert, update, delete on public.products to authenticated;

-- La migración corre adentro de la transacción (también prueba que se puede aplicar dos veces)
\ir ../../supabase/migrations/20261130000001_security_audit_fixes_2.sql

insert into auth.users (id, email) values
  ('aaaaaaaa-2000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-2000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-2000-0000-0000-000000000003', 'admin@x'),
  ('eeeeeeee-2000-0000-0000-000000000005', 'eva@x');
insert into public.super_admins (user_id) values ('cccccccc-2000-0000-0000-000000000003');
insert into public.restaurants (id, owner_id, slug, name, email, notes, plan, is_active) values
  ('55555555-2000-0000-0000-000000000001', 'aaaaaaaa-2000-0000-0000-000000000001', 'cafe-sec', 'Café', 'ana@cafe.x',
   'nota privada', 'os_full', true);
insert into public.products (restaurant_id, name, cost) values ('55555555-2000-0000-0000-000000000001', 'Café', 37);

-- ── C7. La política "para cualquiera" ya no está; la del dueño sí ─────────────
do $$ begin
  assert not exists (select 1 from pg_policies where tablename = 'products' and policyname = 'Anyone can read products'),
    'sin lectura para cualquiera';
  assert exists (select 1 from pg_policies where tablename = 'products' and policyname = 'Owners manage products'),
    'queda la del dueño';
end $$;

-- ── C2 / C4 / C7 como otra cuenta ─────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-2000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from restaurants) = 0, 'otra cuenta no ve negocios ajenos (ni sus columnas privadas)';
  assert (select count(*) from products) = 0, 'otra cuenta no ve productos ajenos';
  begin
    insert into restaurants (owner_id, slug, name) values ('bbbbbbbb-2000-0000-0000-000000000002', 'paypal-soporte', 'X');
    assert false, 'nadie crea negocios desde la app';
  exception when insufficient_privilege then null; end;
end $$;

-- La dueña ve el suyo y sus productos
select set_config('request.jwt.claim.sub', 'aaaaaaaa-2000-0000-0000-000000000001', true);
do $$ begin
  assert (select notes from restaurants where slug = 'cafe-sec') = 'nota privada', 'la dueña lee su negocio';
  assert (select count(*) from products) = 1, 'y sus productos';
end $$;

-- El equipo (aal2) ve todos
select set_config('request.jwt.claim.sub', 'cccccccc-2000-0000-0000-000000000003', true);
do $$ begin
  assert (select count(*) from restaurants) = 1, 'el equipo ve los negocios';
end $$;
reset role;

-- ── C3. El tilde sigue al nombre en todos los casos ───────────────────────────
insert into profiles (id, user_id, username, display_name, status, is_primary)
values ('11111111-2000-0000-0000-000000000001', 'eeeeeeee-2000-0000-0000-000000000005', 'eva-sec2', 'Eva', 'published', true);

create function pg_temp.verify_eva() returns void language plpgsql as $$
begin
  perform set_config('mycen.verifying', 'on', true);
  update identities set verified_at = now() where user_id = 'eeeeeeee-2000-0000-0000-000000000005';
  perform set_config('mycen.verifying', '', true);
end $$;
create function pg_temp.eva_verified() returns boolean language sql as $$
  select verified_at is not null from identities where user_id = 'eeeeeeee-2000-0000-0000-000000000005';
$$;

select pg_temp.verify_eva();
do $$ begin
  -- Un Space secundario con slug y el mismo nombre lo conserva
  insert into profiles (id, user_id, display_name, space_slug, is_primary, identity_id)
  select '11111111-2000-0000-0000-000000000002', 'eeeeeeee-2000-0000-0000-000000000005', 'Eva', 'estudio', false, id
  from identities where user_id = 'eeeeeeee-2000-0000-0000-000000000005';
  assert pg_temp.eva_verified(), 'secundario con el mismo nombre: sigue';
end $$;

-- Borrar el principal y crear otro con otro nombre: a revisión
do $$ begin
  delete from profiles where id = '11111111-2000-0000-0000-000000000001';
  assert not pg_temp.eva_verified(), 'borrar el principal saca el tilde';
end $$;
select pg_temp.verify_eva();
do $$ begin
  insert into profiles (id, user_id, username, display_name, status, is_primary, identity_id)
  select '11111111-2000-0000-0000-000000000003', 'eeeeeeee-2000-0000-0000-000000000005', 'eva-nueva-sec', 'Otra Persona',
         'published', true, id from identities where user_id = 'eeeeeeee-2000-0000-0000-000000000005';
  assert not pg_temp.eva_verified(), 'un principal nuevo se revisa de nuevo';
end $$;

-- Cambiar cuál es el principal: a revisión
select pg_temp.verify_eva();
do $$ begin
  update profiles set is_primary = false where id = '11111111-2000-0000-0000-000000000003';
  assert not pg_temp.eva_verified(), 'cambiar el principal saca el tilde';
end $$;

-- Un Space no principal con dirección propia (sin slug): a revisión
select pg_temp.verify_eva();
do $$ begin
  insert into profiles (user_id, username, display_name, status, is_primary, identity_id)
  select 'eeeeeeee-2000-0000-0000-000000000005', 'otra-raiz-sec', 'Eva', 'draft', false, id
  from identities where user_id = 'eeeeeeee-2000-0000-0000-000000000005';
  assert not pg_temp.eva_verified(), 'un Space con dirección propia se revisa';
exception when check_violation or unique_violation or raise_exception then
  -- Si las reglas de Spaces no dejan crearlo, tampoco hay riesgo
  null;
end $$;

-- ── C8. Versiones con tope ────────────────────────────────────────────────────
insert into auth.users (id, email) values ('dddddddd-2000-0000-0000-000000000004', 'dora@x');
insert into profiles (id, user_id, username, display_name, status)
values ('44444444-2000-0000-0000-000000000004', 'dddddddd-2000-0000-0000-000000000004', 'dora-sec2', 'Dora', 'draft');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-2000-0000-0000-000000000004', true);
do $$
declare v_first uuid; v_n integer; i integer;
begin
  v_first := (publish_space('44444444-2000-0000-0000-000000000004') ->> 'version_id')::uuid;
  -- Restaurar lo que ya está publicado no crea versiones
  for i in 1..5 loop perform restore_space_version(v_first); end loop;
  select count(*) into v_n from profile_versions where profile_id = '44444444-2000-0000-0000-000000000004';
  assert v_n = 1, format('restaurar lo publicado no suma versiones (hay %s)', v_n);
end $$;
reset role;
do $$
declare v_n integer; i integer;
begin
  -- 60 publicaciones con cambios: quedan las últimas 50
  perform set_config('request.jwt.claim.sub', 'dddddddd-2000-0000-0000-000000000004', true);
  for i in 1..60 loop
    update profiles set bio = 'v' || i where id = '44444444-2000-0000-0000-000000000004';
    perform publish_space('44444444-2000-0000-0000-000000000004');
  end loop;
  select count(*) into v_n from profile_versions where profile_id = '44444444-2000-0000-0000-000000000004';
  assert v_n = 50, format('se guardan 50 versiones (hay %s)', v_n);
  assert exists (select 1 from profiles p join profile_versions v on v.id = p.published_version_id
                 where p.id = '44444444-2000-0000-0000-000000000004'), 'la publicada sigue';
end $$;

-- ── C11. Tarjetas de proyectos con tope ───────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-2000-0000-0000-000000000004', true);
insert into content_objects (identity_id, type, title, slug, summary)
select p.identity_id, 'project', 'Proyecto ' || g, 'proyecto-' || g, repeat('x', 280)
from profiles p, generate_series(1, 30) g where p.id = '44444444-2000-0000-0000-000000000004';
do $$
declare r record;
begin
  for r in select id from content_objects where slug like 'proyecto-%' loop perform publish_project(r.id); end loop;
end $$;
insert into profile_modules (profile_id, type, title, content, position)
select '44444444-2000-0000-0000-000000000004', 'portfolio', 'P' || g, '{}', g from generate_series(1, 15) g;
select publish_space('44444444-2000-0000-0000-000000000004');
reset role;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare v jsonb; mods jsonb; n_cards integer;
begin
  v := get_public_profile('dora-sec2');
  select jsonb_agg(m order by (m ->> 'position')::int) into mods
  from jsonb_array_elements(v -> 'modules') m where m ->> 'type' = 'portfolio';
  assert jsonb_array_length(mods) = 15, 'los 15 módulos siguen';
  assert jsonb_array_length(mods -> 0 -> 'projects') = 24, format('hasta 24 tarjetas (hay %s)', jsonb_array_length(mods -> 0 -> 'projects'));
  assert length(mods -> 0 -> 'projects' -> 0 ->> 'summary') <= 400, 'resumen recortado';
  assert jsonb_array_length(mods -> 12 -> 'projects') = 0, 'del módulo 13 en adelante, sin tarjetas';
  select sum(jsonb_array_length(m -> 'projects')) into n_cards from jsonb_array_elements(mods) m;
  assert n_cards = 12 * 24, format('tope total de tarjetas (%s)', n_cards);
end $$;
reset role;

-- Tope de 100 módulos también al recuperar uno borrado
insert into profile_modules (profile_id, type, title, content, position)
select '44444444-2000-0000-0000-000000000004', 'text', 't' || g, '{"text": "x"}', 100 + g from generate_series(1, 85) g;
update profile_modules set deleted_at = now()
where id = (select id from profile_modules where profile_id = '44444444-2000-0000-0000-000000000004' and title = 't1');
insert into profile_modules (profile_id, type, title, content, position)
values ('44444444-2000-0000-0000-000000000004', 'text', 'nuevo', '{"text": "x"}', 999);
do $$ begin
  update profile_modules set deleted_at = null
  where profile_id = '44444444-2000-0000-0000-000000000004' and title = 't1';
  assert false, 'recuperar uno pasa el tope de 100';
exception when program_limit_exceeded then null;
end $$;

rollback;
