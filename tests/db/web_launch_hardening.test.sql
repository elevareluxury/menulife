-- Blindaje para la salida web (20261123000001): Business cerrado, usernames que suplantan, tilde que sigue al nombre,
-- suspensión que no se evade, límite diario por IP en las RPC públicas y sitemap sin Spaces recién creados.
begin;

-- Lo que existe en producción y no en el entorno de pruebas: una tabla de Business con lectura abierta y su PIN
create table public.orders (id uuid primary key default gen_random_uuid(), restaurant_id uuid, customer_phone text);
alter table public.orders enable row level security;
create policy "Anyone can read orders by session" on public.orders for select using (true);
create policy "Anyone can create orders" on public.orders for insert with check (true);
grant all on public.orders to anon, authenticated;
insert into public.orders (customer_phone) values ('+5493415550000');
create function public.verify_staff_pin(p_id uuid, p_pin text) returns boolean language sql security definer as $$ select true $$;
grant execute on function public.verify_staff_pin(uuid, text) to anon;
insert into storage.buckets (id, name, public) values ('restaurant-assets', 'restaurant-assets', true) on conflict do nothing;
create policy "Auth can upload restaurant assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'restaurant-assets');

\ir ../../supabase/migrations/20261123000001_web_launch_hardening.sql
begin;

-- ── 1. Business cerrado ──────────────────────────────────────────────────────
do $$ begin
  assert not has_table_privilege('anon', 'public.orders', 'select'), 'anon no lee pedidos';
  assert not has_table_privilege('anon', 'public.orders', 'insert'), 'anon no crea pedidos';
  assert not exists (select 1 from pg_policies where tablename = 'orders' and qual = 'true'), 'sin lectura para todos';
  assert not exists (select 1 from pg_policies where tablename = 'orders' and with_check = 'true'), 'sin alta para todos';
  assert not has_function_privilege('anon', 'public.verify_staff_pin(uuid, text)', 'execute'), 'anon sin PIN';
  assert not exists (select 1 from pg_policies where policyname = 'Auth can upload restaurant assets'), 'nadie sube a Business';
  assert (select file_size_limit from storage.buckets where id = 'restaurant-assets') = 5242880, 'tope de 5 MB';
  assert not exists (select 1 from storage.buckets where id = 'restaurant-assets' and 'image/svg+xml' = any (allowed_mime_types)), 'sin SVG';
  -- restaurants mantiene su lectura pública de columnas
  assert has_column_privilege('anon', 'public.restaurants', 'name', 'select'), 'restaurants público intacto';
end $$;

-- authenticated tampoco lee los pedidos de otros (la política "para todos" ya no está)
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@x');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from orders) = 0, 'una cuenta común no ve pedidos';
end $$;
reset role;

-- ── 2. Usernames que suplantan ────────────────────────────────────────────────
do $$ begin
  assert mycen_username_impersonates('santander-ayuda'), 'banco';
  assert mycen_username_impersonates('pay-pal-soporte'), 'con guiones';
  assert mycen_username_impersonates('mi-banco-online'), 'banco';
  assert not mycen_username_impersonates('ana-garcia'), 'un nombre común pasa';
  assert check_username('binance-oficial') = 'reserved', 'check_username lo marca';
  assert check_username('lucia-diseno') = 'available', 'libre';
end $$;
do $$ begin
  insert into profiles (user_id, username, display_name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'whatsapp-soporte', 'X');
  assert false, 'no se crea con un username que suplanta';
exception when invalid_parameter_value then null;
end $$;

-- ── 3. El tilde sigue al nombre ───────────────────────────────────────────────
insert into profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'published');
select set_config('mycen.verifying', 'on', true);
update identities set verified_at = now() where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select set_config('mycen.verifying', '', true);
do $$ begin
  -- Cambiar la bio no toca el tilde
  update profiles set bio = 'Diseñadora' where id = '11111111-0000-0000-0000-000000000001';
  assert (select verified_at from identities where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') is not null, 'sigue verificada';
  -- Un Space secundario con el mismo nombre lo conserva
  insert into profiles (user_id, display_name, space_slug, is_primary, identity_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'estudio', false, id from identities where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  assert (select verified_at from identities where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') is not null, 'mismo nombre: sigue';
  -- Pasar a llamarse "Banco X" le saca el tilde
  update profiles set display_name = 'Banco X' where id = '11111111-0000-0000-0000-000000000001';
  assert (select verified_at from identities where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') is null, 'cambia el nombre: a revisión';
end $$;

-- ── 4. Una suspensión no se evade ─────────────────────────────────────────────
insert into profiles (id, user_id, username, display_name, status)
values ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'beto', 'Beto', 'published');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
select admin_set_suspension('22222222-0000-0000-0000-000000000002', true, 'Estafa');
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  begin
    delete from profiles where id = '22222222-0000-0000-0000-000000000002';
    assert false, 'no se borra un perfil suspendido';
  exception when insufficient_privilege then null; end;
  begin
    insert into profiles (user_id, username, display_name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'beto-nuevo', 'Beto');
    assert false, 'una cuenta suspendida no crea perfiles';
  exception when insufficient_privilege then null; end;
end $$;
-- Al borrar la cuenta entera sí se va, y su username queda reservado
do $$ begin
  perform delete_my_account();
end $$;
reset role;
do $$ begin
  assert not exists (select 1 from profiles where id = '22222222-0000-0000-0000-000000000002'), 'se borró con la cuenta';
  assert check_username('beto') = 'reserved', 'el username suspendido no vuelve a estar libre';
end $$;

-- ── 5. Límite diario por IP ───────────────────────────────────────────────────
select set_config('request.path', '/rpc/report_profile', true);
select set_config('request.headers', '{"cf-connecting-ip":"203.0.113.9","x-forwarded-for":"1.1.1.1, 2.2.2.2"}', true);
do $$
declare i int;
begin
  assert mycen_client_ip() = '203.0.113.9', 'usa la IP de Cloudflare';
  for i in 1..30 loop perform mycen_pre_request(); end loop;
  begin
    perform mycen_pre_request();
    assert false, 'el pedido 31 del día se frena';
  exception when sqlstate 'PT429' then null; end;
  assert not exists (select 1 from mycen_rate_hits where subject like '%203.0.113.9%'), 'la IP no se guarda en claro';
end $$;
-- Otra IP no comparte el contador; lo que no está en la lista no se cuenta
select set_config('request.headers', '{"x-forwarded-for":"198.51.100.4, 10.0.0.1"}', true);
do $$ begin
  assert mycen_client_ip() = '198.51.100.4', 'sin Cloudflare, la primera de x-forwarded-for';
  perform mycen_pre_request();
end $$;
select set_config('request.path', '/rpc/get_public_profile', true);
do $$ declare n int; begin
  select count(*) into n from mycen_rate_hits;
  perform mycen_pre_request();
  assert (select count(*) from mycen_rate_hits) = n, 'get_public_profile no se cuenta';
end $$;
-- Sin encabezados (SQL Editor, cron) deja pasar
select set_config('request.headers', '', true);
select set_config('request.path', '/rpc/report_profile', true);
do $$ begin perform mycen_pre_request(); end $$;
do $$ begin
  assert not has_table_privilege('anon', 'public.mycen_rate_hits', 'select'), 'nadie lee los contadores';
end $$;

-- ── 6. Sitemap sin Spaces recién creados ──────────────────────────────────────
insert into profiles (id, user_id, username, display_name, status, created_at)
values ('33333333-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003', 'carla', 'Carla', 'published',
        now() - interval '30 days');
do $$ begin
  assert exists (select 1 from public_sitemap() where path = '/carla'), 'el viejo está';
  assert not exists (select 1 from public_sitemap() where path = '/ana'), 'el nuevo todavía no';
end $$;

rollback;
