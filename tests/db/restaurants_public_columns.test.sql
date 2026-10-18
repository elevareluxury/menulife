-- restaurants (Mycen Business): el visitante sin cuenta lee sólo las columnas del menú público; email, teléfono,
-- dirección, dueño, plan, suscripción y notas quedan para las cuentas (dueños, equipo, super-admin).

-- Volver a aplicarla no cambia nada (idempotente)
\ir ../../supabase/migrations/20261108000001_restaurants_public_columns.sql

begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into public.restaurants (id, owner_id, slug, name, logo_url, email, phone, address, notes, plan, daily_sales_goal,
                                social_links, is_active) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'cafe-luna', 'Café Luna',
   'https://x/logo.webp', 'ana@cafe.example', '+54 9 11 5555', 'Calle 123', 'debe dos meses', 'os_full', 50000,
   '{"whatsapp": "+5491155550000"}', true),
  ('11111111-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'bar-cerrado', 'Bar Cerrado',
   null, 'beto@bar.example', null, null, null, 'hub_free', null, null, false);

-- Una tabla con lectura pública que, como products/menu_items en producción, mira el negocio por id y si está activo
create table public.menu_items_demo (id serial primary key, restaurant_id uuid not null);
alter table public.menu_items_demo enable row level security;
create policy menu_items_demo_read on public.menu_items_demo for select
  using (restaurant_id in (select id from public.restaurants where is_active));
grant select on public.menu_items_demo to anon, authenticated;
insert into public.menu_items_demo (restaurant_id) values
  ('11111111-0000-0000-0000-000000000001'), ('11111111-0000-0000-0000-000000000002');

-- ── Sin cuenta ───────────────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare v record; c text;
begin
  -- Lo que pide el menú público (PUBLIC_RESTAURANT_COLUMNS) sigue andando
  select id, slug, name, logo_url, social_links, is_active, business_type, default_language, default_currency,
         cover_image_url, description, city, menu_accent_color, reservations_enabled
    into v from restaurants where slug = 'cafe-luna' and is_active;
  assert v.name = 'Café Luna', 'el menú encuentra el negocio por su slug';
  assert v.social_links->>'whatsapp' = '+5491155550000', 'y lee sus redes';
  assert (select count(*) from restaurants) = 1, 'un negocio inactivo sigue oculto (las filas no cambian)';
  assert (select count(*) from menu_items_demo) = 1, 'las políticas públicas que miran id/is_active siguen andando';

  -- `select *` y cada columna privada: permission denied
  begin
    perform * from restaurants;
    assert false, 'select * sin cuenta tiene que fallar';
  exception when insufficient_privilege then null; end;
  foreach c in array array['email', 'phone', 'address', 'owner_id', 'plan', 'subscription_status', 'trial_ends_at',
                           'notes', 'daily_sales_goal', 'created_at', 'updated_at'] loop
    begin
      execute format('select %I from public.restaurants', c);
      assert false, 'el visitante lee restaurants.' || c;
    exception when insufficient_privilege then null; end;
  end loop;
  -- Ni filtrando por una columna privada (sería una forma de adivinarla)
  begin
    perform 1 from restaurants where email like 'ana%';
    assert false, 'el visitante filtra por email';
  exception when insufficient_privilege then null; end;

  -- Tampoco escribe
  begin
    update restaurants set name = 'Hackeado' where slug = 'cafe-luna';
    assert false, 'el visitante cambia un negocio';
  exception when insufficient_privilege then null; end;
  begin
    insert into restaurants (slug, name) values ('trucho', 'Trucho');
    assert false, 'el visitante crea un negocio';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ── La dueña ─────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$
declare v record;
begin
  select * into v from restaurants where id = '11111111-0000-0000-0000-000000000001';
  assert v.email = 'ana@cafe.example' and v.phone = '+54 9 11 5555' and v.notes = 'debe dos meses'
         and v.plan = 'os_full' and v.owner_id = 'aaaaaaaa-0000-0000-0000-000000000001', 'la dueña lee todo lo suyo';
  update restaurants set phone = '+54 9 11 6666', notes = null where id = '11111111-0000-0000-0000-000000000001';
  assert found, 'y lo edita';
  update restaurants set name = 'Mío' where id = '11111111-0000-0000-0000-000000000002';
  assert not found, 'el negocio de otra persona no lo edita';
end $$;
reset role;

-- ── Otra cuenta (visitante con sesión): el menú sigue andando ────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select name from restaurants where slug = 'cafe-luna' and is_active) = 'Café Luna', 'una cuenta ve el menú';
  assert (select count(*) from menu_items_demo) = 1, 'y sus productos';
end $$;
reset role;

-- ── Permisos que quedaron ────────────────────────────────────────────────────
do $$ begin
  assert has_table_privilege('authenticated', 'public.restaurants', 'select'), 'las cuentas leen la tabla';
  assert not has_table_privilege('anon', 'public.restaurants', 'select'), 'el visitante no tiene select de la tabla';
  assert has_column_privilege('anon', 'public.restaurants', 'slug', 'select'), 'sí de las columnas públicas';
  assert not has_column_privilege('anon', 'public.restaurants', 'email', 'select'), 'no del email';
end $$;

rollback;
