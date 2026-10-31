-- Auditoría de lanzamiento: lo que marcan Supabase → Advisors (seguridad y rendimiento), sin cambiar lo que hace la app.
-- Idempotente: se puede correr de nuevo. Todo es condicional (las vistas y tablas de Business pueden no existir).
--
-- 1. Vistas de Business con SECURITY DEFINER (ERROR del Security Advisor): leían con los permisos de quien las creó,
--    salteando la RLS. Pasan a security_invoker (cada persona ve sólo lo de su negocio) y el visitante sin sesión
--    no las puede leer.
-- 2. Funciones sin search_path fijo: se fija public, extensions, pg_temp (las de extensiones no se tocan).
-- 3. Funciones de triggers y del panel (admin_*) que se podían llamar por /rest/v1/rpc sin sesión: sin EXECUTE para
--    anon (las del panel siguen para authenticated y adentro exigen ser super-admin).
-- 4. Fotos de Business en buckets públicos con una política de lectura amplia que permitía listar todos los archivos:
--    los links públicos siguen funcionando (no pasan por la RLS); listar queda sólo para quien subió el archivo.
-- 5. Políticas de RLS que recalculaban auth.uid() por cada fila (Performance Advisor): se reescriben a
--    (select auth.uid()), que Postgres calcula una vez por consulta. Mismo resultado.
-- 6. Índices duplicados de Business (se borra el repetido) e índices para las claves foráneas de Mycen.

begin;

-- ─── 1. Vistas con SECURITY DEFINER ──────────────────────────────────────────
do $$
declare v text;
begin
  foreach v in array array[
    'view_daily_finance', 'view_payment_conciliation', 'view_sales_by_day', 'view_top_products', 'view_sales_by_waiter',
    'view_orders_by_hour', 'view_ticket_by_table', 'view_order_tracking', 'view_active_tables', 'view_delivery_orders',
    'view_delivery_stats', 'view_driver_stats', 'view_reservations_with_crm', 'view_daily_stats', 'view_hourly_stats',
    'view_top_items', 'view_cash_register_summary', 'view_inventory_summary', 'view_product_ranking',
    'view_waiter_daily_summary'
  ] loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'public' and c.relname = v and c.relkind = 'v') then
      execute format('alter view public.%I set (security_invoker = true)', v);
      execute format('revoke all on public.%I from anon', v);
    end if;
  end loop;
end $$;

-- ─── 2. search_path fijo en las funciones propias ───────────────────────────
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
      -- Las funciones de extensiones (pg_trgm, etc.) no son nuestras
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
  loop
    begin
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    exception when insufficient_privilege then
      raise notice 'sin permiso para %', f.sig;
    end;
  end loop;
end $$;

-- ─── 3. Sin EXECUTE para el visitante sin sesión ─────────────────────────────
do $$
declare f record;
begin
  -- Funciones de triggers: nunca se llaman por la API (al dispararse el trigger no se mira EXECUTE)
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
  -- Panel del equipo: sólo con sesión (y adentro, sólo super-admins)
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%' and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;

-- ─── 4. Buckets públicos de Business sin listado ─────────────────────────────
do $$
declare
  b record;
begin
  if to_regclass('storage.objects') is null then return; end if;
  for b in
    select * from (values
      ('hub-assets', 'Public read hub-assets'), ('hub-assets', 'hub_assets_public_read'),
      ('menu-items', 'Anyone can view menu item images'), ('menu-videos', 'Anyone can view menu item videos'),
      ('restaurant-assets', 'Anyone can view restaurant assets'), ('restaurant-assets', 'Public read restaurant assets'),
      ('restaurant-logos', 'Anyone can view restaurant logos'), ('service-resources', 'Resource images are public')
    ) as t(bucket, policy)
  loop
    execute format('drop policy if exists %I on storage.objects', b.policy);
  end loop;
  -- Quien subió un archivo lo sigue viendo (para listarlo, cambiarlo o borrarlo desde la app)
  drop policy if exists "business_media_owner_select" on storage.objects;
  create policy "business_media_owner_select" on storage.objects
    for select to authenticated
    using (bucket_id in ('hub-assets', 'menu-items', 'menu-videos', 'restaurant-assets', 'restaurant-logos', 'service-resources')
           and owner = (select auth.uid()));
end $$;

-- ─── 5. auth.uid() una vez por consulta en las políticas ────────────────────
do $$
declare
  p record;
  new_qual text;
  new_check text;
  pattern constant text := '(?<!SELECT )auth\.(uid|jwt|role)\(\)';
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public' and (qual ~ pattern or with_check ~ pattern)
  loop
    new_qual := regexp_replace(p.qual, pattern, '(select auth.\1())', 'g');
    new_check := regexp_replace(p.with_check, pattern, '(select auth.\1())', 'g');
    if p.qual is not null and p.with_check is not null then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)', p.policyname, p.schemaname, p.tablename, new_qual, new_check);
    elsif p.qual is not null then
      execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, new_qual);
    else
      execute format('alter policy %I on %I.%I with check (%s)', p.policyname, p.schemaname, p.tablename, new_check);
    end if;
  end loop;
end $$;

-- ─── 6. Índices ─────────────────────────────────────────────────────────────
do $$
declare
  d record;
  i record;
begin
  -- Duplicados: se borra el primero sólo si el otro existe (nunca queda la tabla sin índice)
  for d in
    select * from (values
      ('idx_hub_analytics_event_type', 'idx_hub_analytics_restaurant_event'),
      ('idx_order_items_menu_item', 'idx_order_items_menu_item_id'),
      ('idx_order_items_order', 'idx_order_items_order_id'),
      ('idx_orders_restaurant', 'idx_orders_restaurant_id'),
      ('idx_tables_restaurant', 'idx_tables_restaurant_id'),
      ('idx_waiters_restaurant', 'idx_waiters_restaurant_id'),
      ('idx_waiters_pin', 'idx_waiters_restaurant_pin')
    ) as t(drop_me, keep)
  loop
    if to_regclass('public.' || d.keep) is not null and to_regclass('public.' || d.drop_me) is not null then
      execute format('drop index public.%I', d.drop_me);
    end if;
  end loop;

  -- Claves foráneas de Mycen sin índice (borrar o cambiar la fila apuntada no recorre toda la tabla)
  for i in
    select * from (values
      ('profile_events', 'module_id'), ('profile_username_history', 'profile_id'), ('profiles', 'published_version_id'),
      ('profile_versions', 'created_by'), ('profile_versions', 'restored_from'), ('profile_modules', 'content_object_id'),
      ('profile_reports', 'content_object_id'), ('profile_reports', 'reporter_user_id'), ('profile_reports', 'resolved_by'),
      ('profile_message_reports', 'profile_id'), ('profile_message_reports', 'reporter_user_id'),
      ('profile_message_reports', 'resolved_by'), ('identities', 'primary_space'), ('verification_requests', 'identity_id'),
      ('life_brain_items', 'next_occurrence_id'), ('life_installment_plans', 'goal_id'),
      ('life_recurring_transactions', 'goal_id'), ('life_tasks', 'goal_id')
    ) as t(tbl, col)
  loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = i.tbl and column_name = i.col) then
      execute format('create index if not exists %I on public.%I (%I)', i.tbl || '_' || i.col || '_fk_idx', i.tbl, i.col);
    end if;
  end loop;
end $$;

commit;
