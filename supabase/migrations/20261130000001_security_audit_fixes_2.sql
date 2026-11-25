-- Auditoría de seguridad (24/11/2026), hallazgos medios restantes:
--   C2. Crear un negocio (restaurants) desde la app armaba un perfil publicado saltándose los usernames reservados,
--       las marcas/bancos y los nombres reservados para talentos. Business está cerrado: nadie crea negocios desde la
--       app (sólo el equipo, por SQL).
--   C4. Cualquier cuenta leía las columnas privadas (email, teléfono, dirección, notas, plan, dueño) de todos los
--       negocios activos. Con sesión, cada cuenta ve sólo su negocio (y el equipo con aal2, todos).
--   C7. Cualquier cuenta leía los productos de todos los negocios (costo, margen, SKU, stock). Se borran las políticas
--       de lectura "para cualquiera" de las tablas de Business (quedan las del dueño).
--   C3. El tilde de verificado sobrevivía a borrar el Space principal y crear otro con otro nombre, a cambiar cuál es
--       el principal o a sumar un Space con dirección propia. Ahora vuelve a revisión en todos esos casos.
--   C8. "Restaurar" una versión creaba una copia completa en cada llamada, sin tope. Restaurar lo que ya está
--       publicado no crea nada y cada Space guarda sus últimas 50 versiones (más la publicada).
--   C11. La página pública armaba una tarjeta por cada proyecto en cada módulo de portfolio, sin tope (una respuesta
--       de 150 MB). Ahora: hasta 24 tarjetas por módulo, sólo los primeros 12 módulos de proyectos y tarjetas livianas.
--       El tope de 100 módulos por Space vale también al recuperar uno borrado o moverlo de Space.
-- Idempotente. Se aplica en Supabase → SQL Editor. Tests: tests/db/security_audit_fixes_2.test.sql.

-- ─── C2. Nadie crea negocios desde la app ─────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.restaurants') is not null then
    execute 'drop policy if exists "restaurants_insert_self" on public.restaurants';
    execute 'revoke insert on public.restaurants from anon, authenticated';
  end if;
end $$;

-- ─── C4. Con sesión, cada cuenta ve sólo su negocio ──────────────────────────────────────────────────
-- Restrictiva: se suma a las políticas que haya (incluida la lectura pública del menú) y deja sólo la fila propia o al
-- equipo. Los visitantes sin sesión siguen leyendo sólo las columnas públicas (20261108000001).
do $$
begin
  if to_regclass('public.restaurants') is not null then
    execute 'drop policy if exists mycen_restaurants_own_only on public.restaurants';
    execute $p$create policy mycen_restaurants_own_only on public.restaurants as restrictive for select to authenticated
      using (owner_id = (select auth.uid()) or public.mycen_is_admin())$p$;
  end if;
end $$;

-- ─── C7. Sin lecturas "para cualquiera" en las tablas de Business ────────────────────────────────────
-- Misma lista que 20261123000001. Se borran las políticas de lectura que no miran quién pregunta (por ejemplo
-- `is_active = true`); las del dueño (auth.uid / owner) y las del equipo quedan.
do $$
declare
  t record;
  p record;
begin
  for t in
    select c.oid, c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and c.relname not in ('restaurants', 'access_requests', 'testimonials', 'site_config', 'super_admins', 'superadmins')
      and (
        c.relname = any (array[
          'orders', 'order_items', 'bills', 'bill_items', 'waiters', 'waiter_calls', 'tables', 'menu_items',
          'menu_sections', 'payments', 'delivery_drivers', 'plan_changes', 'crm_contacts', 'cash_movements',
          'cash_registers', 'expenses', 'financial_transactions', 'inventory_alerts', 'inventory_movements',
          'products', 'product_categories', 'refunds', 'tickets', 'restaurant_secrets', 'organizations',
          'organization_locations', 'organization_members', 'organization_member_locations', 'hub_featured',
          'hub_featured_product', 'hub_gallery', 'hub_reviews', 'hub_stories', 'reservations', 'customers',
          'categories', 'kitchen_orders', 'analytics_daily_snapshots', 'analytics_events', 'analytics_saved_views'])
        or c.relname like 'service\_%'
        or (exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'restaurant_id' and not a.attisdropped)
            and c.relname not like 'profile%' and c.relname not like 'life\_%' and c.relname not like 'mycen\_%'
            and c.relname not in ('identities', 'user_settings', 'content_objects', 'content_blocks'))
      )
  loop
    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t.relname and cmd = 'SELECT'
        and permissive = 'PERMISSIVE'
        and (roles && array['public', 'authenticated']::name[])
        and coalesce(qual, '') !~* '(auth\.uid|auth\.jwt|owner|admin|user_id)'
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t.relname);
    end loop;
  end loop;
end $$;

-- ─── C3. El tilde sigue al nombre en todos los casos ─────────────────────────────────────────────────
create or replace function public.mycen_verification_follows_name()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_main_name text;
  v_revoke    boolean := false;
begin
  if new.identity_id is null
     or not exists (select 1 from identities i where i.id = new.identity_id and i.verified_at is not null) then
    return new;
  end if;

  if tg_op = 'INSERT' and (new.is_primary or (new.space_slug is null and new.username is not null)) then
    -- Un principal nuevo (reemplazo del verificado) o un Space con dirección propia: lo revisa el equipo
    v_revoke := true;
  elsif tg_op = 'UPDATE' and (new.is_primary is distinct from old.is_primary) then
    v_revoke := true;
  elsif tg_op = 'UPDATE' and new.is_primary
     and (new.username is distinct from old.username or btrim(new.display_name) is distinct from btrim(old.display_name)) then
    v_revoke := true;
  elsif tg_op = 'UPDATE' and new.space_slug is null and new.username is distinct from old.username then
    v_revoke := true;
  elsif not new.is_primary
     and (tg_op = 'INSERT' or btrim(new.display_name) is distinct from btrim(old.display_name)) then
    -- Un Space secundario mantiene el tilde sólo si se llama igual que el principal
    select btrim(display_name) into v_main_name
    from profiles where identity_id = new.identity_id and is_primary and id <> new.id limit 1;
    v_revoke := v_main_name is not null and lower(btrim(new.display_name)) <> lower(v_main_name);
  end if;

  if v_revoke then
    perform set_config('mycen.verifying', 'on', true);
    update identities set verified_at = null where id = new.identity_id;
    perform set_config('mycen.verifying', '', true);
  end if;
  return new;
end $$;
revoke all on function public.mycen_verification_follows_name() from public, anon, authenticated;

drop trigger if exists profiles_verification_follows_name on public.profiles;
create trigger profiles_verification_follows_name
  after insert or update of username, display_name, is_primary, space_slug on public.profiles
  for each row execute function public.mycen_verification_follows_name();

-- Borrar el principal (o un Space con dirección propia) también lo saca: el que venga después se revisa de nuevo
create or replace function public.mycen_verification_on_delete()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if old.identity_id is null or coalesce(current_setting('mycen.deleting_account', true), '') = 'on' then
    return old;
  end if;
  if old.is_primary or (old.space_slug is null and old.username is not null) then
    perform set_config('mycen.verifying', 'on', true);
    update identities set verified_at = null where id = old.identity_id and verified_at is not null;
    perform set_config('mycen.verifying', '', true);
  end if;
  return old;
end $$;
revoke all on function public.mycen_verification_on_delete() from public, anon, authenticated;

drop trigger if exists profiles_verification_on_delete on public.profiles;
create trigger profiles_verification_on_delete after delete on public.profiles
  for each row execute function public.mycen_verification_on_delete();

-- ─── C8. Versiones con tope ──────────────────────────────────────────────────────────────────────────
-- Cada Space guarda sus últimas 50 versiones y la publicada (las más viejas se borran solas)
create or replace function public.mycen_prune_versions(p_profile_id uuid)
returns void language sql volatile security definer set search_path = public, extensions, pg_temp as $$
  delete from profile_versions v
  where v.profile_id = p_profile_id
    and v.id is distinct from (select published_version_id from profiles where id = p_profile_id)
    and v.id not in (select id from profile_versions where profile_id = p_profile_id
                     order by version_number desc limit 50);
$$;
revoke all on function public.mycen_prune_versions(uuid) from public, anon, authenticated;

-- Igual a 20261008000001 + tope de versiones
create or replace function public.publish_space(p_profile_id uuid, p_note text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v        public.profiles;
  v_snap   jsonb;
  v_last   public.profile_versions;
  v_id     uuid;
  v_number integer;
begin
  v := mycen_assert_space_owner(p_profile_id);
  if btrim(coalesce(v.display_name, '')) = '' then
    raise exception 'NAME_REQUIRED' using errcode = '22023';
  end if;

  v_snap := mycen_space_snapshot(p_profile_id);
  select * into v_last from profile_versions where id = v.published_version_id;

  -- Sin cambios desde la última publicación: no crea una versión repetida
  if found and v_last.snapshot = v_snap then
    v_id := v_last.id; v_number := v_last.version_number;
  else
    select coalesce(max(version_number), 0) + 1 into v_number from profile_versions where profile_id = p_profile_id;
    insert into profile_versions (profile_id, version_number, snapshot, created_by, note)
    values (p_profile_id, v_number, v_snap, auth.uid(), left(nullif(btrim(p_note), ''), 120))
    returning id into v_id;
  end if;

  update profiles set published_version_id = v_id, status = 'published' where id = p_profile_id;
  perform mycen_prune_versions(p_profile_id);
  return jsonb_build_object('version_id', v_id, 'version_number', v_number);
end $$;

-- Igual a 20261008000001: restaurar lo que ya está publicado no crea otra versión, y con tope
create or replace function public.restore_space_version(p_version_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v_old    public.profile_versions;
  v_pub    public.profile_versions;
  v_snap   jsonb;
  v_id     uuid;
  v_number integer;
begin
  select * into v_old from profile_versions where id = p_version_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform mycen_assert_space_owner(v_old.profile_id);

  -- La versión de trabajo vuelve a ese estado…
  perform mycen_apply_snapshot(v_old.profile_id, v_old.snapshot);
  v_snap := mycen_space_snapshot(v_old.profile_id);

  -- …y se publica como versión nueva, salvo que sea igual a la que ya está publicada
  select pv.* into v_pub from profiles p join profile_versions pv on pv.id = p.published_version_id
  where p.id = v_old.profile_id;
  if found and v_pub.snapshot = v_snap then
    update profiles set status = 'published' where id = v_old.profile_id and status <> 'published';
    return jsonb_build_object('version_id', v_pub.id, 'version_number', v_pub.version_number);
  end if;

  select coalesce(max(version_number), 0) + 1 into v_number from profile_versions where profile_id = v_old.profile_id;
  insert into profile_versions (profile_id, version_number, snapshot, created_by, restored_from, note)
  values (v_old.profile_id, v_number, v_snap, auth.uid(), v_old.id,
          'Restaurada desde la versión ' || v_old.version_number)
  returning id into v_id;

  update profiles set published_version_id = v_id, status = 'published' where id = v_old.profile_id;
  perform mycen_prune_versions(v_old.profile_id);
  return jsonb_build_object('version_id', v_id, 'version_number', v_number);
end $$;

revoke all on function public.publish_space(uuid, text) from public, anon;
revoke all on function public.restore_space_version(uuid) from public, anon;
grant execute on function public.publish_space(uuid, text) to authenticated;
grant execute on function public.restore_space_version(uuid) to authenticated;

-- ─── C11. Tarjetas de proyectos con tope ─────────────────────────────────────────────────────────────
-- Hasta 24 tarjetas por módulo y livianas: de las traducciones sólo título y resumen (lo que usa la tarjeta)
create or replace function public.mycen_project_cards(p_identity_id uuid, p_username text, p_ids jsonb)
returns jsonb language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(card order by ord nulls last, published_at desc), '[]'::jsonb)
  from (
    select sel.ord, o.published_at, jsonb_build_object(
             'id',           o.id,
             'slug',         o.slug,
             'path',         '/' || p_username || '/projects/' || o.slug,
             'title',        left(o.published_snapshot ->> 'title', 200),
             'summary',      left(o.published_snapshot ->> 'summary', 400),
             'cover_url',    left(o.published_snapshot ->> 'cover_url', 2048),
             'translations', (
               select coalesce(jsonb_object_agg(e.key, jsonb_strip_nulls(jsonb_build_object(
                        'title',   left(e.value ->> 'title', 200),
                        'summary', left(e.value ->> 'summary', 400)))), '{}'::jsonb)
               from jsonb_each(case when jsonb_typeof(o.published_snapshot -> 'translations') = 'object'
                                    then o.published_snapshot -> 'translations' else '{}'::jsonb end) e
               where e.key ~ '^[a-z]{2}$' and jsonb_typeof(e.value) = 'object')) as card
    from content_objects o
    left join (
      select (x #>> '{}')::uuid as id, min(ord) as ord
      from jsonb_array_elements(case when jsonb_typeof(p_ids) = 'array' then p_ids else '[]'::jsonb end)
           with ordinality as t(x, ord)
      where (x #>> '{}') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      group by 1
    ) sel on sel.id = o.id
    where o.identity_id = p_identity_id and o.type = 'project' and o.status = 'published'
      and o.published_snapshot is not null
      and case when jsonb_typeof(p_ids) = 'array'
               then sel.id is not null and o.visibility <> 'private'
               else o.visibility = 'public' end
    order by sel.ord nulls last, o.published_at desc
    limit 24
  ) c;
$$;
revoke all on function public.mycen_project_cards(uuid, text, jsonb) from public, anon, authenticated;

-- Igual a 20261010000001: sólo los primeros 12 módulos de proyectos llevan tarjetas (los demás, ninguna)
create or replace function public.mycen_resolve_modules(p_identity_id uuid, p_username text, p_modules jsonb)
returns jsonb language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(
           case
             when m ->> 'type' = 'project' and k <= 12 then m || jsonb_build_object('projects',
               mycen_project_cards(p_identity_id, p_username, jsonb_build_array(m -> 'content' ->> 'project_id')))
             when m ->> 'type' = 'portfolio' and k <= 12 then m || jsonb_build_object('projects',
               mycen_project_cards(p_identity_id, p_username,
                 case when jsonb_typeof(m -> 'content' -> 'project_ids') = 'array'
                       and jsonb_array_length(m -> 'content' -> 'project_ids') > 0
                      then m -> 'content' -> 'project_ids' end))
             when m ->> 'type' in ('project', 'portfolio') then m || jsonb_build_object('projects', '[]'::jsonb)
             else m
           end order by ord), '[]'::jsonb)
  from (
    select m, ord, count(*) filter (where m ->> 'type' in ('project', 'portfolio')) over (order by ord) as k
    from jsonb_array_elements(coalesce(p_modules, '[]'::jsonb)) with ordinality as t(m, ord)
    where mycen_module_live(m -> 'config')
  ) s;
$$;
revoke all on function public.mycen_resolve_modules(uuid, text, jsonb) from public, anon, authenticated;

-- Tope de 100 módulos por Space también al recuperar uno borrado o pasarlo a otro Space
create or replace function public.mycen_limit_modules_update()
returns trigger language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if new.deleted_at is null and (old.deleted_at is not null or new.profile_id is distinct from old.profile_id)
     and (select count(*) from public.profile_modules
          where profile_id = new.profile_id and deleted_at is null and id <> new.id) >= 100 then
    raise exception 'MODULE_LIMIT_REACHED' using errcode = '54000';
  end if;
  return new;
end $$;
revoke all on function public.mycen_limit_modules_update() from public, anon, authenticated;

drop trigger if exists profile_modules_limit_update on public.profile_modules;
create trigger profile_modules_limit_update
  before update of deleted_at, profile_id on public.profile_modules
  for each row execute function public.mycen_limit_modules_update();

notify pgrst, 'reload schema';
