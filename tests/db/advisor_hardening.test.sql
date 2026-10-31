-- Lo que marca Supabase → Advisors (20261114000001_advisor_hardening): vistas sin SECURITY DEFINER, funciones con
-- search_path fijo, triggers y panel sin acceso anónimo, buckets de Business sin listado y auth.uid() una vez por consulta.
begin;

-- Una vista de Business "vieja" (definer) y la política amplia del bucket, como en producción; se vuelve a correr la
-- migración (también prueba que es idempotente; como confirma su transacción, al final se borra lo creado acá)
create table public.orders_demo (id int, restaurant_id uuid);
create view public.view_daily_finance as select * from public.orders_demo;
grant select on public.view_daily_finance to anon, authenticated;
create policy "Anyone can view restaurant assets" on storage.objects for select using (bucket_id = 'restaurant-assets');
\ir ../../supabase/migrations/20261114000001_advisor_hardening.sql
begin;

do $$ begin
  assert (select reloptions @> array['security_invoker=true'] from pg_class where relname = 'view_daily_finance'),
    'la vista lee con los permisos de quien consulta';
  assert not has_table_privilege('anon', 'public.view_daily_finance', 'select'), 'sin sesión no se lee la vista';
  assert not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'Anyone can view restaurant assets'),
    'el bucket ya no se puede listar entero';
  assert exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'business_media_owner_select'),
    'quien subió un archivo lo sigue viendo';
end $$;

do $$
declare bad text;
begin
  -- Ninguna política recalcula auth.uid() por fila
  select string_agg(tablename || '.' || policyname, ', ') into bad from pg_policies
  where schemaname = 'public' and (qual ~ '(?<!SELECT )auth\.uid\(\)' or with_check ~ '(?<!SELECT )auth\.uid\(\)');
  assert bad is null, 'políticas con auth.uid() sin select: ' || coalesce(bad, '');

  -- Todas las funciones propias tienen search_path fijo
  select string_agg(p.proname, ', ') into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e');
  assert bad is null, 'funciones sin search_path: ' || coalesce(bad, '');

  -- Triggers: nadie los llama por la API
  select string_agg(p.proname, ', ') into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prorettype = 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute');
  assert bad is null, 'triggers que se pueden llamar sin sesión: ' || coalesce(bad, '');

  -- Panel: sin sesión no; con sesión sí (adentro exige super-admin)
  select string_agg(p.proname, ', ') into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'admin\_%'
    and (has_function_privilege('anon', p.oid, 'execute') or not has_function_privilege('authenticated', p.oid, 'execute'));
  assert bad is null, 'funciones del panel con permisos de más o de menos: ' || coalesce(bad, '');

  -- Lo público sigue siendo público
  assert has_function_privilege('anon', 'public.get_public_profile(text)', 'execute'), 'la página pública sigue andando';
  assert has_function_privilege('anon', 'public.check_username(text)', 'execute'), '"Elegí tu nombre" sigue andando';
end $$;

-- La RLS reescrita da lo mismo: cada cuenta ve sólo lo suyo
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into public.restaurants (id, owner_id, slug, name, is_active) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'cafe-ana', 'Café de Ana', false);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from public.restaurants where slug = 'cafe-ana') = 0, 'otra cuenta no ve un negocio inactivo ajeno';
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert (select count(*) from public.restaurants where slug = 'cafe-ana') = 1, 'la dueña ve el suyo';
end $$;
reset role;
rollback;
drop view public.view_daily_finance;
drop table public.orders_demo;
