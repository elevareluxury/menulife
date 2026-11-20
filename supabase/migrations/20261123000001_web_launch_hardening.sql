-- =============================================================================
-- Blindaje para la salida web mundial (Identity + Life OS; Mycen Business cerrado). Auditoría del 20/11/2026.
--
--  1. Business cerrado en la base (sólo había cuentas de prueba): ningún visitante sin sesión lee ni escribe tablas
--     de Business, se borran las políticas "para todos" (using/with check true) de esas tablas, nadie sin sesión
--     ejecuta las funciones de Business (PIN de mozos, portal de clientes, presupuestos) y nadie sube archivos a las
--     carpetas de Business (sólo el equipo, para las fotos de testimonios). restaurants conserva su lectura pública
--     de columnas (20261108000001). Para reabrir Business hace falta una migración nueva con su propia revisión.
--  2. Suplantación: los usernames que contienen marcas o bancos muy usados para phishing (paypal, santander,
--     binance…) quedan reservados (mycen_username_impersonates = IMPERSONATION_FRAGMENTS de
--     src/lib/reservedUsernames.ts; un test compara).
--  3. Verificación: el tilde se revisa de nuevo si cambia el nombre o el username de la cuenta, o si un Space nuevo
--     o renombrado usa un nombre distinto del principal (antes alguien verificado podía pasar a llamarse "Banco X").
--  4. Suspensión: un perfil suspendido no se puede borrar (salvo al borrar la cuenta entera) y su username queda
--     reservado al borrarse; una cuenta con un perfil suspendido no crea perfiles nuevos.
--  5. Límites por IP para las RPC públicas que escriben (mycen_pre_request, el gancho previo de PostgREST): además de
--     los topes por visitante (IP + agente, que se esquivaban cambiando el agente), un tope diario por IP para cada
--     función. La IP se guarda como hash, nunca en claro; las filas se borran a los 2 días.
--  6. Sitemap: los Spaces recién creados (menos de 7 días) no se publican en el sitemap (spam y phishing de paso).
--
-- Idempotente. Se aplica pegándola en Supabase → SQL Editor. Tests: tests/db/web_launch_hardening.test.sql.
-- =============================================================================
begin;

-- ─── 1. Business cerrado ─────────────────────────────────────────────────────

do $$
declare
  t record;
  p record;
begin
  for t in
    select c.oid, c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
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
        -- Cualquier otra tabla de un negocio (las que se crearon desde el panel sin migración)
        or (exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'restaurant_id' and not a.attisdropped)
            and c.relname not like 'profile%' and c.relname not like 'life\_%' and c.relname not like 'mycen\_%'
            and c.relname not in ('identities', 'user_settings', 'content_objects', 'content_blocks'))
      )
  loop
    execute format('revoke all on table public.%I from anon', t.relname);
    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t.relname
        and (btrim(coalesce(qual, '')) = 'true' or btrim(coalesce(with_check, '')) = 'true')
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t.relname);
    end loop;
  end loop;
end $$;

-- Funciones de Business: ni anónimos ni "public" (Supabase da EXECUTE a anon por defecto)
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'portal\_%'
           or p.proname in ('verify_staff_pin', 'get_public_quote', 'respond_public_quote', 'generate_quote_number',
                            'generate_sale_number', 'get_org_restaurant_ids', 'upsert_daily_snapshot'))
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
  end loop;
end $$;

-- Carpetas de archivos de Business: sólo imágenes de hasta 5 MB y nadie sube (salvo el equipo, para testimonios)
do $$
declare p record;
begin
  if to_regclass('storage.objects') is null then return; end if;
  update storage.buckets
     set file_size_limit = 5242880,
         allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
   where id in ('restaurant-logos', 'restaurant-assets', 'hub-assets', 'menu-items', 'product-images');
  update storage.buckets
     set file_size_limit = 52428800, allowed_mime_types = array['video/mp4', 'video/webm']
   where id = 'menu-videos';
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd in ('INSERT', 'ALL')
      and coalesce(with_check, qual, '') ~ '(restaurant-logos|restaurant-assets|hub-assets|menu-items|menu-videos|product-images)'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
  drop policy if exists business_media_admin_insert on storage.objects;
  create policy business_media_admin_insert on storage.objects for insert to authenticated
    with check (bucket_id in ('restaurant-assets', 'restaurant-logos', 'hub-assets') and public.mycen_is_admin());
end $$;

-- ─── 1b. El equipo puede dar de baja los archivos de una cuenta (contenido denunciado) ───
-- profile-media y profile-files son públicos: suspender oculta la página pero no los archivos. El equipo los lista y
-- los borra desde el panel (Personas), y queda anotado en la actividad del equipo.
do $$
begin
  if to_regclass('storage.objects') is null then return; end if;
  drop policy if exists account_media_admin_select on storage.objects;
  create policy account_media_admin_select on storage.objects for select to authenticated
    using (bucket_id in ('profile-media', 'profile-files') and public.mycen_is_admin());
  drop policy if exists account_media_admin_delete on storage.objects;
  create policy account_media_admin_delete on storage.objects for delete to authenticated
    using (bucket_id in ('profile-media', 'profile-files') and public.mycen_is_admin());
end $$;

create or replace function public.admin_log_media_purge(p_user_id uuid, p_files integer)
returns void language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
begin
  perform mycen_assert_admin();
  insert into admin_audit_log (admin_id, action, target_type, target_id, details)
  values ((select auth.uid()), 'media_purged', 'account', p_user_id::text,
          jsonb_build_object('files', greatest(coalesce(p_files, 0), 0)));
end $$;
revoke all on function public.admin_log_media_purge(uuid, integer) from public, anon;
grant execute on function public.admin_log_media_purge(uuid, integer) to authenticated;

-- ─── 2. Usernames que suplantan marcas o bancos ───────────────────────────────

-- Fragmentos (sin guiones) que no puede contener un username: marcas y bancos muy usados para phishing.
-- Igual a IMPERSONATION_FRAGMENTS en src/lib/reservedUsernames.ts (tests/unit/reservedUsernames.test.ts compara).
create or replace function public.mycen_username_impersonates(p_username text)
returns boolean language sql immutable set search_path = public, pg_temp as $$
  select exists (
    select 1 from unnest(array[
      'mycen', 'paypal', 'mercadopago', 'mercadolibre', 'mercadolivre', 'santander', 'bbva', 'banco',
      'hsbc', 'citibank', 'wellsfargo', 'bankofamerica', 'jpmorgan', 'chasebank', 'itau', 'bradesco', 'nubank',
      'brubank', 'naranjax', 'binance', 'coinbase', 'metamask', 'trustwallet', 'westernunion', 'moneygram',
      'icloud', 'appleid', 'applesupport', 'gmail', 'googlesupport', 'microsoft', 'office365', 'outlook',
      'hotmail', 'whatsapp', 'instagram', 'facebook', 'tiktok', 'netflix', 'afip', 'anses'
    ]) f
    where replace(lower(coalesce(p_username, '')), '-', '') like '%' || f || '%'
  );
$$;
revoke all on function public.mycen_username_impersonates(text) from public, anon, authenticated;

-- Mismo validador que 20261012000001_identity_spaces.sql + el chequeo de suplantación
create or replace function public.mycen_validate_username()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_legacy boolean := coalesce(current_setting('mycen.legacy_import', true), '') = 'on';
begin
  new.username := lower(btrim(new.username));
  if new.username is null then return new; end if;

  if tg_op = 'UPDATE' and new.username is not distinct from old.username then
    return new;
  end if;

  if not v_legacy then
    -- 3 a 30 caracteres: letras, números y guiones; sin guiones al inicio/fin ni dobles
    if new.username !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' or new.username like '%--%' then
      raise exception 'USERNAME_INVALID' using errcode = '22023';
    end if;
    if exists (select 1 from reserved_usernames r where r.username = new.username)
       or mycen_username_impersonates(new.username) then
      raise exception 'USERNAME_RESERVED' using errcode = '22023';
    end if;
  end if;

  if exists (select 1 from profile_username_history h
             where h.old_username = new.username and h.profile_id <> new.id) then
    raise exception 'USERNAME_TAKEN' using errcode = '23505';
  end if;

  if tg_op = 'UPDATE' and old.username is not null then
    insert into profile_username_history (old_username, profile_id)
    values (old.username, old.id)
    on conflict (old_username) do update set profile_id = excluded.profile_id, changed_at = now();
    -- Si vuelve a un username propio anterior, se libera del historial
    delete from profile_username_history where old_username = new.username and profile_id = new.id;
    new.username_changed_at := now();
  end if;

  return new;
end $$;

-- Mismo check_username que 20261001000001 + suplantación (responde 'reserved')
create or replace function public.check_username(p_username text)
returns text language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v text := lower(btrim(coalesce(p_username, '')));
begin
  if v !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' or v like '%--%' then
    return 'invalid';
  end if;
  if exists (select 1 from reserved_usernames where username = v) or mycen_username_impersonates(v) then
    return 'reserved';
  end if;
  if exists (select 1 from profiles p where p.username = v and p.user_id is distinct from auth.uid())
     or exists (select 1 from profile_username_history h join profiles p on p.id = h.profile_id
                where h.old_username = v and p.user_id is distinct from auth.uid()) then
    return 'taken';
  end if;
  return 'available';
end $$;
revoke all on function public.check_username(text) from public;
grant execute on function public.check_username(text) to anon, authenticated;

-- ─── 3. El tilde de verificado se revisa si cambia la identidad que se verificó ───

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

  if tg_op = 'UPDATE' and new.is_primary
     and (new.username is distinct from old.username or btrim(new.display_name) is distinct from btrim(old.display_name)) then
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
  after insert or update of username, display_name, is_primary on public.profiles
  for each row execute function public.mycen_verification_follows_name();

-- ─── 4. Una suspensión no se evade borrando o creando perfiles ─────────────────

create or replace function public.mycen_profile_delete_guard()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if old.suspended_at is null then return old; end if;
  -- Sólo frena a una cuenta desde la app (con sesión); el panel de Supabase o el equipo sí pueden borrarlo
  if auth.uid() is not null and coalesce(current_setting('mycen.deleting_account', true), '') <> 'on'
     and not mycen_is_admin() then
    raise exception 'PROFILE_SUSPENDED' using errcode = '42501';
  end if;
  -- Se borra con la cuenta: el username suspendido no vuelve a quedar libre
  if old.username is not null then
    insert into reserved_usernames (username, reason) values (old.username, 'suspended') on conflict do nothing;
  end if;
  return old;
end $$;
revoke all on function public.mycen_profile_delete_guard() from public, anon, authenticated;

drop trigger if exists profiles_delete_guard on public.profiles;
create trigger profiles_delete_guard before delete on public.profiles
  for each row execute function public.mycen_profile_delete_guard();

create or replace function public.mycen_profile_insert_guard()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if exists (select 1 from profiles p where p.user_id = new.user_id and p.suspended_at is not null) then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.mycen_profile_insert_guard() from public, anon, authenticated;

drop trigger if exists profiles_insert_guard on public.profiles;
create trigger profiles_insert_guard before insert on public.profiles
  for each row execute function public.mycen_profile_insert_guard();

-- Borrar la cuenta (igual que 20261003000001) avisando al guard de que es el borrado completo
create or replace function public.delete_my_account()
returns void language plpgsql volatile security definer set search_path = public, auth, extensions, pg_temp as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if exists (select 1 from public.restaurants where owner_id = v_uid) then
    raise exception 'HAS_BUSINESS' using errcode = 'P0001';
  end if;
  perform set_config('mycen.deleting_account', 'on', true);
  -- Borra el usuario: perfiles, módulos, eventos y datos de Life OS se eliminan en cascada
  delete from auth.users where id = v_uid;
  perform set_config('mycen.deleting_account', '', true);
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ─── 5. Límite diario por IP para las RPC públicas que escriben ────────────────

create table if not exists public.mycen_rate_hits (
  bucket       text        not null,
  subject      text        not null,  -- sha256 de la IP + sal: nunca la IP
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, subject, window_start)
);
alter table public.mycen_rate_hits enable row level security;
revoke all on table public.mycen_rate_hits from public, anon, authenticated;
create index if not exists mycen_rate_hits_window_idx on public.mycen_rate_hits (window_start);

-- IP del visitante: la que pone Cloudflare (no la puede inventar el cliente) o, si no está, la primera de
-- x-forwarded-for (como hasta ahora). Null si no hay pedido HTTP (SQL Editor, cron).
create or replace function public.mycen_client_ip()
returns text language plpgsql stable set search_path = public, pg_temp as $$
declare
  h json;
begin
  h := nullif(current_setting('request.headers', true), '')::json;
  return nullif(btrim(coalesce(h ->> 'cf-connecting-ip', split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1))), '');
exception when others then
  return null;
end $$;
revoke all on function public.mycen_client_ip() from public, anon, authenticated;

-- Tope diario por IP de cada función pública que escribe. Holgados a propósito: muchas personas comparten IP
-- (redes de celulares, oficinas). Los topes finos siguen dentro de cada función.
create or replace function public.mycen_rate_limit_for(p_rpc text)
returns integer language sql immutable set search_path = public, pg_temp as $$
  select case p_rpc
    when 'track_profile_event'    then 3000
    when 'submit_profile_message' then 60
    when 'submit_profile_collab'  then 60
    when 'subscribe_profile'      then 60
    when 'vote_profile_poll'      then 300
    when 'report_profile'         then 30
    when 'report_client_error'    then 300
    when 'track_product_event'    then 600
  end;
$$;
revoke all on function public.mycen_rate_limit_for(text) from public, anon, authenticated;

-- Gancho previo de PostgREST: corre antes de cada pedido. Para lo que no está en la lista sale enseguida. Si algo
-- falla adentro (sin encabezados, transacción de sólo lectura), deja pasar: nunca rompe la API.
create or replace function public.mycen_pre_request()
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_path    text;
  v_rpc     text;
  v_limit   integer;
  v_ip      text;
  v_hits    integer;
  v_blocked boolean := false;
begin
  begin
    v_path := current_setting('request.path', true);
    if v_path is null or v_path not like '/rpc/%' then return; end if;
    v_rpc := substr(v_path, 6);
    v_limit := mycen_rate_limit_for(v_rpc);
    if v_limit is null then return; end if;
    v_ip := mycen_client_ip();
    if v_ip is null then return; end if;
    insert into mycen_rate_hits (bucket, subject, window_start, hits)
    values (v_rpc,
            encode(sha256(convert_to(v_ip || '|mycen-rate|' || current_database(), 'UTF8')), 'hex'),
            date_trunc('day', now()), 1)
    on conflict (bucket, subject, window_start) do update set hits = mycen_rate_hits.hits + 1
    returning hits into v_hits;
    v_blocked := v_hits > v_limit;
  exception when others then
    return;
  end;
  if v_blocked then
    -- PT429 = respuesta HTTP 429 de PostgREST (la fila del contador se deshace con el error: queda en el tope)
    raise exception 'RATE_LIMITED' using errcode = 'PT429';
  end if;
end $$;
revoke all on function public.mycen_pre_request() from public;
grant execute on function public.mycen_pre_request() to anon, authenticated;

-- Activar el gancho (sólo en Supabase, donde existe el rol authenticator de PostgREST)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    execute 'alter role authenticator set pgrst.db_pre_request = ''public.mycen_pre_request''';
  end if;
end $$;

-- Las filas de los contadores se borran a los 2 días (si pg_cron está prendido)
do $$
begin
  if to_regnamespace('cron') is not null and exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'cron' and p.proname = 'schedule'
  ) then
    begin
      perform cron.unschedule('mycen-rate-hits-purge');
    exception when others then null;
    end;
    perform cron.schedule('mycen-rate-hits-purge', '23 * * * *',
      $cron$delete from public.mycen_rate_hits where window_start < now() - interval '2 days'$cron$);
  end if;
exception when others then
  raise notice 'pg_cron no disponible: borrar a mano mycen_rate_hits viejos';
end $$;

-- ─── 6. Sitemap: los Spaces de menos de 7 días todavía no se publican ──────────

create or replace function public.public_sitemap(p_offset integer default 0, p_limit integer default 50000)
returns table (path text, lastmod timestamptz)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with spaces as (
    select '/' || mycen_space_handle(p.id) as path,
           coalesce(pv.created_at, p.published_at, p.updated_at) as lastmod
    from profiles p
    left join profile_versions pv on pv.id = p.published_version_id
    where p.status = 'published' and p.visibility = 'public' and not mycen_space_suspended(p.id)
      and (p.username is not null or p.space_slug is not null)
      and p.created_at < now() - interval '7 days'
  ),
  projects as (
    select '/' || r.username || '/projects/' || o.slug as path,
           coalesce(o.published_at, o.updated_at) as lastmod
    from content_objects o
    join profiles r on r.identity_id = o.identity_id and r.is_primary and r.username is not null
    where o.type = 'project' and o.status = 'published' and o.visibility = 'public' and o.published_snapshot is not null
      and r.status = 'published' and r.visibility = 'public' and r.suspended_at is null
      and r.created_at < now() - interval '7 days'
  )
  select path, lastmod from (select * from spaces union all select * from projects) t
  where path is not null
  order by lastmod desc, path
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 50000), 1), 50000);
$$;
revoke all on function public.public_sitemap(integer, integer) from public;
grant execute on function public.public_sitemap(integer, integer) to anon, authenticated;

commit;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
