-- =============================================================================
-- Seguridad (auditoría de producción, 18/10/2026): `restaurants` (Mycen Business) se leía entera sin cuenta.
--
-- Con la clave pública, `GET /rest/v1/restaurants?select=*` devolvía todas las filas con email, teléfono, dirección,
-- owner_id, plan, suscripción, prueba, notas, meta de ventas… La política de lectura pública filtra FILAS (el menú
-- tiene que encontrar el negocio por su slug), pero no columnas.
--
-- Arreglo: el visitante (`anon`) pierde el SELECT sobre la tabla y recupera SELECT sólo sobre las columnas que usan
-- las pantallas públicas (menú `/r/:slug`, reservas, catálogo, seguimiento del pedido, presupuesto, logins de
-- mozo/delivery/cocina y la landing de referidos). La lista es `PUBLIC_RESTAURANT_COLUMNS` en
-- `src/modules/public/lib/publicRestaurant.ts` (un test verifica que sean iguales).
--
--   · No toca políticas: las filas que ve cada uno no cambian. Dueños, equipo y super-admin usan `authenticated`
--     (SELECT completo, se reafirma abajo) y `service_role` sigue igual.
--   · Pedir `*` o una columna privada sin sesión devuelve "permission denied" (42501): la app ya pide columnas.
--   · `anon` tampoco escribe la tabla (ninguna pantalla sin sesión lo hace; RLS ya lo frenaba).
--   · Antes de cambiar nada, revisa que ninguna política para visitantes de OTRA tabla lea una columna privada de
--     `restaurants` (por ejemplo `select id from restaurants where owner_id = auth.uid()` en una política sin
--     `to authenticated`): esa consulta pasaría a fallar para el visitante. Si hay una, aborta sin aplicar nada.
--   · Ojo: un `grant all on all tables in schema public to anon` posterior lo deshace.
--
-- Idempotente (sólo da permisos sobre columnas que existen). Vuelta atrás: docs/v1/sql/restaurants_columnas_rollback.sql
-- =============================================================================

begin;

do $$
declare
  v_public constant text[] := array[
    'id', 'slug', 'name', 'is_active', 'business_type',
    'logo_url', 'cover_image_url', 'description', 'city', 'hub_category', 'social_links',
    'default_language', 'allow_language_switch', 'default_currency',
    'schedule', 'business_hours',
    'menu_accent_color', 'menu_card_style', 'show_prices', 'show_descriptions', 'show_calories',
    'delivery_enabled', 'delivery_time_estimate', 'delivery_min_order', 'delivery_fee_type', 'delivery_fee_value',
    'delivery_zones',
    'takeaway_enabled', 'takeaway_time_estimate',
    'reservations_enabled', 'reservations_collect_guests', 'reservations_advance_days', 'reservations_min_hours',
    'reservations_max_party', 'reservations_time_slots', 'reservations_message',
    -- Hub viejo: las políticas públicas de hub_config, hub_analytics y hub_contact_submissions lo consultan
    'hub_enabled'];
  r record;
  v_bad text;
  v_col text;
begin
  if to_regclass('public.restaurants') is null then
    raise exception 'public.restaurants no existe. No se aplicó nada: avisale a Claude.';
  end if;

  -- 1. Chequeo previo: políticas que aplican al visitante y leen columnas privadas de restaurants
  for r in
    select p.schemaname, p.tablename, p.policyname, coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') as expr
    from pg_policies p
    where p.roles && array['anon', 'public']::name[]
      and not (p.schemaname = 'public' and p.tablename = 'restaurants')
      and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~* '\mrestaurants\M'
  loop
    select string_agg(c.column_name, ', ' order by c.column_name) into v_bad
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = 'restaurants'
      and c.column_name <> all (v_public)
      and r.expr ~* ('\m' || c.column_name || '\M');
    if v_bad is not null then
      raise exception 'La política "%" de %.% deja a los visitantes leer restaurants (%). No se aplicó nada: avisale a Claude.',
        r.policyname, r.schemaname, r.tablename, v_bad;
    end if;
  end loop;

  -- 2. Fuera el SELECT de la tabla entera (y cualquier permiso por columna que hubiera) para anon y PUBLIC
  revoke select, insert, update, delete, truncate, references, trigger on public.restaurants from anon;
  revoke select on public.restaurants from public;
  for v_col in
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'restaurants'
  loop
    execute format('revoke select (%1$I), insert (%1$I), update (%1$I), references (%1$I) on public.restaurants from anon, public', v_col);
  end loop;

  -- 3. SELECT sólo de las columnas públicas que existen
  for v_col in
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'restaurants' and column_name = any (v_public)
  loop
    execute format('grant select (%I) on public.restaurants to anon', v_col);
  end loop;

  -- 4. Las cuentas (dueños, equipo, super-admin) y el servidor siguen leyendo todo; las políticas deciden las filas
  grant select on public.restaurants to authenticated;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.restaurants to service_role;
  end if;

  -- 5. Verificación
  if has_column_privilege('anon', 'public.restaurants', 'id', 'select') is not true then
    raise exception 'anon no puede leer restaurants.id: algo salió mal.';
  end if;
  foreach v_col in array array['email', 'phone', 'address', 'owner_id', 'plan', 'subscription_status', 'notes'] loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'restaurants' and column_name = v_col)
       and has_column_privilege('anon', 'public.restaurants', v_col, 'select') then
      raise exception 'anon todavía lee restaurants.%: algo salió mal.', v_col;
    end if;
  end loop;
end $$;

commit;
