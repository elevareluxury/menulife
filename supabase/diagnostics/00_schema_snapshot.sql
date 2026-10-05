-- =============================================================================
-- MYCEN · Fase 0 · Paso 1 — Diagnóstico del esquema real (SOLO LECTURA)
-- =============================================================================
-- No modifica nada. Pegar en Supabase → SQL Editor → Run.
-- Devuelve UNA celda con un JSON: copiarla entera y pasársela a Claude.
-- Sirve para versionar en el repo las tablas que hoy faltan (restaurants,
-- hub_links, hub_config, hub_analytics) y detectar problemas de seguridad.
-- =============================================================================

with
hub_tables as (
  select c.relname as t
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'v', 'm')
    and (c.relname in ('restaurants', 'profiles', 'profile_modules', 'site_config', 'super_admins', 'user_roles')
         or c.relname like 'hub\_%')
)
select jsonb_pretty(jsonb_build_object(
  'pg_version', version(),

  -- Columnas reales de cada tabla relevante
  'columns', (
    select jsonb_object_agg(table_name, cols)
    from (
      select table_name,
             jsonb_agg(column_name || ' ' || data_type
                       || case when is_nullable = 'NO' then ' NOT NULL' else '' end
                       || coalesce(' DEFAULT ' || column_default, '')
                       order by ordinal_position) as cols
      from information_schema.columns
      where table_schema = 'public' and table_name in (select t from hub_tables)
      group by table_name
    ) x
  ),

  -- Row Level Security activado por tabla
  'rls_enabled', (
    select jsonb_object_agg(c.relname, c.relrowsecurity)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname in (select t from hub_tables)
  ),

  -- Políticas RLS
  'policies', (
    select jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', policyname, 'cmd', cmd,
      'roles', roles, 'using', qual, 'check', with_check) order by tablename, policyname)
    from pg_policies
    where schemaname = 'public' and tablename in (select t from hub_tables)
  ),

  -- Índices / unicidad
  'indexes', (
    select jsonb_agg(indexdef order by tablename)
    from pg_indexes
    where schemaname = 'public' and tablename in (select t from hub_tables)
  ),

  -- Triggers sobre restaurants
  'restaurant_triggers', (
    select jsonb_agg(tgname)
    from pg_trigger
    where tgrelid = 'public.restaurants'::regclass and not tgisinternal
  ),

  -- Funciones del esquema public
  'functions', (
    select jsonb_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ),

  -- Cantidad de filas por tabla
  'row_counts', (
    select jsonb_object_agg(t,
      (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t), false, true, '')))[1]::text::bigint)
    from hub_tables
    where exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relname = t and c.relkind = 'r')
  ),

  -- SEGURIDAD: columnas de restaurants que un visitante anónimo puede leer
  'anon_readable_restaurant_columns', (
    select jsonb_agg(column_name order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'restaurants'
      and has_column_privilege('anon', format('public.%I', table_name), column_name, 'SELECT')
  ),

  -- SEGURIDAD: cuántos negocios tienen token de MercadoPago cargado
  'restaurants_with_mp_token', (
    select count(*) from public.restaurants r
    where coalesce(to_jsonb(r) ->> 'mercadopago_access_token', '') <> ''
  ),

  -- Slugs que chocan con rutas del sistema o tienen formato inválido
  'slug_problems', (
    select jsonb_agg(slug order by slug)
    from public.restaurants
    where slug !~ '^[a-z0-9][a-z0-9_-]{0,62}$'
       or lower(slug) in ('dashboard','login','register','auth','life','portal','q','r','kitchen','mozo',
                          'waiter','delivery','super-admin','superadmin','catalogo','onboarding','studio',
                          'forgot-password','reset-password','solicitar-acceso')
  ),

  -- Slugs duplicados ignorando mayúsculas
  'duplicate_slugs_ci', (
    select jsonb_agg(s) from (
      select lower(slug) as s from public.restaurants group by lower(slug) having count(*) > 1
    ) d
  ),

  -- Dueños con más de un negocio (afecta "perfil principal")
  'owners_with_multiple_restaurants', (
    select count(*) from (
      select coalesce(to_jsonb(r) ->> 'owner_id', to_jsonb(r) ->> 'user_id') as o
      from public.restaurants r group by 1 having count(*) > 1
    ) m
  ),

  -- Buckets de storage
  'storage_buckets', (
    select jsonb_agg(jsonb_build_object('id', id, 'public', public)) from storage.buckets
  )
)) as mycen_snapshot;
