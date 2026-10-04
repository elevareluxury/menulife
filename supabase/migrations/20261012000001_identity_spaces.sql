-- =============================================================================
-- Mycen Identity · Fase 10 — Mis Spaces
--
--   · Una cuenta puede tener varios Spaces (hasta 5 sin archivar). El principal conserva la URL raíz
--     (/ana); los demás viven dentro de él: /ana/estudio (`space_slug`, sin username propio).
--   · Los negocios de Mycen Business siguen siendo Spaces con su username (el slug histórico) y no
--     cuentan para frenar su alta.
--   · Archivar oculta el Space sin borrar nada y libera un lugar; el principal no se archiva.
--   · duplicate_space() copia un Space (datos, apariencia y módulos) como borrador nuevo.
--   · Las RPC públicas aceptan "ana" o "ana/estudio". Cada Space tiene su propia analítica
--     (los eventos ya son por Space). Un principal suspendido oculta también sus Spaces.
--
-- Requiere 20261011000001_identity_moderation.sql. Idempotente.
-- Vuelta atrás: docs/identity/sql/fase10_rollback.sql
-- =============================================================================

begin;

-- ─── 1. Dirección de los Spaces secundarios ──────────────────────────────────

alter table public.profiles add column if not exists space_slug text;
alter table public.profiles alter column username drop not null;

-- Cada Space tiene exactamente una dirección: username propio (raíz) o slug dentro del principal
alter table public.profiles drop constraint if exists profiles_space_address;
alter table public.profiles add constraint profiles_space_address
  check ((username is null) = (space_slug is not null));
alter table public.profiles drop constraint if exists profiles_space_not_primary;
alter table public.profiles add constraint profiles_space_not_primary
  check (space_slug is null or not is_primary);
alter table public.profiles drop constraint if exists profiles_space_slug_format;
alter table public.profiles add constraint profiles_space_slug_format
  check (space_slug is null or (space_slug ~ '^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$' and space_slug not like '%--%'));

create unique index if not exists profiles_space_slug_key
  on public.profiles (identity_id, space_slug) where space_slug is not null;

-- Palabras que no pueden ser el slug de un Space (rutas debajo de /{username}).
-- Mantener sincronizado con RESERVED_SPACE_SLUGS en src/modules/studio/lib/spaces.ts
create or replace function public.mycen_reserved_space_slug(p_slug text)
returns boolean language sql immutable as $$
  select p_slug = any (array[
    'projects', 'project', 'proyectos', 'proyecto', 'spaces', 'space', 'edit', 'editar', 'settings',
    'studio', 'admin', 'api', 'og', 'vcard', 'qr', 'p', 'about', 'contact', 'links']);
$$;

-- Los Spaces secundarios no tienen username: el validador los deja pasar
create or replace function public.mycen_validate_username()
returns trigger language plpgsql security definer set search_path = public as $$
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
    if exists (select 1 from reserved_usernames r where r.username = new.username) then
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

-- ─── 2. Reglas de los Spaces ─────────────────────────────────────────────────

create or replace function public.mycen_space_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_legacy boolean := coalesce(current_setting('mycen.legacy_import', true), '') = 'on';
begin
  -- La dirección no cambia de tipo: un Space raíz no pasa a secundario ni al revés
  if tg_op = 'UPDATE' and ((old.space_slug is null) <> (new.space_slug is null)) then
    raise exception 'SPACE_ADDRESS_LOCKED' using errcode = '22023';
  end if;

  if new.space_slug is not null then
    new.space_slug := lower(btrim(new.space_slug));
    if tg_op = 'INSERT' then new.is_primary := false; end if;
    if new.space_slug !~ '^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$' or new.space_slug like '%--%' then
      raise exception 'SPACE_SLUG_INVALID' using errcode = '22023';
    end if;
    if mycen_reserved_space_slug(new.space_slug) then
      raise exception 'SPACE_SLUG_RESERVED' using errcode = '22023';
    end if;
    if (tg_op = 'INSERT' or new.space_slug is distinct from old.space_slug)
       and exists (select 1 from profiles p
                   where p.identity_id = new.identity_id and p.space_slug = new.space_slug and p.id <> new.id) then
      raise exception 'SPACE_SLUG_TAKEN' using errcode = '23505';
    end if;
    -- Vive dentro del principal: tiene que existir
    if not exists (select 1 from profiles p
                   where p.identity_id = new.identity_id and p.is_primary and p.username is not null and p.id <> new.id) then
      raise exception 'NO_PRIMARY_SPACE' using errcode = '22023';
    end if;
  end if;

  if new.status = 'archived' and new.is_primary then
    raise exception 'PRIMARY_NOT_ARCHIVABLE' using errcode = '22023';
  end if;

  -- Hasta 5 Spaces sin archivar (al crear o al sacar del archivo). El alta de negocios no se frena.
  if not v_legacy and new.restaurant_id is null and new.status <> 'archived'
     and (tg_op = 'INSERT' or old.status = 'archived') then
    perform pg_advisory_xact_lock(hashtextextended('mycen_spaces:' || new.user_id::text, 0));
    if (select count(*) from profiles p
        where p.user_id = new.user_id and p.status <> 'archived' and p.id <> new.id) >= 5 then
      raise exception 'SPACE_LIMIT_REACHED' using errcode = '23514';
    end if;
  end if;

  return new;
end $$;

-- Corre después de profiles_identity (orden alfabético): identity_id ya está completo
drop trigger if exists profiles_space_rules on public.profiles;
create trigger profiles_space_rules
  before insert or update of space_slug, username, status, is_primary, identity_id on public.profiles
  for each row execute function public.mycen_space_rules();

-- Dirección pública de un Space, sin barra inicial: "ana" o "ana/estudio"
create or replace function public.mycen_space_handle(p_profile_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(v.username, r.username || '/' || v.space_slug)
  from profiles v
  left join profiles r on r.identity_id = v.identity_id and r.is_primary and v.space_slug is not null
  where v.id = p_profile_id;
$$;

-- Un Space no se ve si está suspendido o si lo está el principal que lo contiene
create or replace function public.mycen_space_suspended(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(v.suspended_at is not null or (v.space_slug is not null and r.suspended_at is not null), true)
  from profiles v
  left join profiles r on r.identity_id = v.identity_id and r.is_primary and v.space_slug is not null
  where v.id = p_profile_id;
$$;

-- Busca un Space por su dirección ("ana" o "ana/estudio"). Si es un username viejo, devuelve a dónde redirigir.
create or replace function public.mycen_find_space(p_handle text, out o_id uuid, out o_redirect text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_handle text := lower(btrim(coalesce(p_handle, '')));
  v_user   text;
  v_slug   text;
  r        public.profiles;
begin
  if v_handle !~ '^[a-z0-9][a-z0-9_-]{0,62}(/[a-z0-9][a-z0-9-]{0,39})?$' then return; end if;
  v_user := split_part(v_handle, '/', 1);
  v_slug := nullif(split_part(v_handle, '/', 2), '');

  select * into r from profiles where username = v_user;
  if not found then
    select p.* into r from profile_username_history h join profiles p on p.id = h.profile_id
    where h.old_username = v_user;
    if not found or r.suspended_at is not null then return; end if;
    if v_slug is null then
      if r.status = 'published' and r.visibility <> 'private' then o_redirect := r.username; end if;
    elsif r.is_primary and exists (
      select 1 from profiles n
      where n.identity_id = r.identity_id and n.space_slug = v_slug
        and n.status = 'published' and n.visibility <> 'private' and n.suspended_at is null) then
      o_redirect := r.username || '/' || v_slug;
    end if;
    return;
  end if;

  if v_slug is null then o_id := r.id; return; end if;
  -- Sólo el principal tiene Spaces adentro
  if not r.is_primary then return; end if;
  select n.id into o_id from profiles n where n.identity_id = r.identity_id and n.space_slug = v_slug;
end $$;

revoke all on function public.mycen_space_handle(uuid) from public, anon, authenticated;
revoke all on function public.mycen_space_suspended(uuid) from public, anon, authenticated;
revoke all on function public.mycen_find_space(text) from public, anon, authenticated;

-- ─── 3. Duplicar ─────────────────────────────────────────────────────────────

-- Copia un Space propio (datos, apariencia y módulos) como Space nuevo en borrador, en /{principal}/{p_slug}.
-- No copia versiones, analítica ni el vínculo con un negocio.
create or replace function public.duplicate_space(p_profile_id uuid, p_slug text, p_display_name text default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  v    public.profiles;
  v_id uuid;
begin
  v := mycen_assert_space_owner(p_profile_id);

  insert into profiles (user_id, identity_id, space_slug, is_primary, status, visibility, display_name, descriptor, bio,
                        avatar_url, cover_url, purpose, tags, theme, primary_action, contact_card, default_locale,
                        translations, onboarding_step)
  values (v.user_id, v.identity_id, p_slug, false, 'draft', v.visibility,
          left(coalesce(nullif(btrim(coalesce(p_display_name, '')), ''), v.display_name), 80), v.descriptor, v.bio,
          v.avatar_url, v.cover_url, v.purpose, v.tags, v.theme, v.primary_action, v.contact_card, v.default_locale,
          v.translations, 5)
  returning id into v_id;

  insert into profile_modules (profile_id, type, title, content, config, translations, position, visibility)
  select v_id, m.type, m.title, m.content, m.config - 'legacy_source' - 'legacy_id' - 'legacy_click_count',
         m.translations, m.position, m.visibility
  from profile_modules m
  where m.profile_id = p_profile_id and m.deleted_at is null
  order by m.position, m.created_at;

  return v_id;
end $$;

revoke all on function public.duplicate_space(uuid, text, text) from public, anon;
grant execute on function public.duplicate_space(uuid, text, text) to authenticated;

-- ─── 4. RPC públicas: "ana" o "ana/estudio" ──────────────────────────────────

-- Igual que en la Fase 8, con Spaces secundarios. Devuelve `handle` (su dirección) y `space_slug`;
-- `username` es el del principal (las tarjetas de proyectos apuntan a /{username}/projects/…).
create or replace function public.get_public_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v          public.profiles;
  v_id       uuid;
  v_redirect text;
  v_owner    boolean;
  v_base     jsonb;
  v_handle   text;
begin
  select o_id, o_redirect into v_id, v_redirect from mycen_find_space(p_username);
  if v_redirect is not null then return jsonb_build_object('redirect', v_redirect); end if;
  if v_id is null then return null; end if;
  select * into v from profiles where id = v_id;

  -- Suspendido (él o su principal): no lo ve nadie, tampoco el dueño (Studio le muestra el aviso)
  if mycen_space_suspended(v.id) then
    return jsonb_build_object('status', 'unavailable');
  end if;

  v_owner := auth.uid() is not distinct from v.user_id;
  if (v.status <> 'published' or v.visibility = 'private') and not v_owner then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if v.status = 'published' and v.published_version_id is not null then
    select snapshot into v_base from profile_versions where id = v.published_version_id;
  end if;
  v_base := coalesce(v_base, mycen_space_snapshot(v.id));
  v_handle := mycen_space_handle(v.id);

  return (v_base - 'contact_card') || jsonb_build_object(
    'id',         v.id,
    'username',   split_part(v_handle, '/', 1),
    'space_slug', v.space_slug,
    'handle',     v_handle,
    'status',     v.status,
    'visibility', v.visibility,
    'is_owner',   v_owner,
    'modules',    mycen_resolve_modules(v.identity_id, split_part(v_handle, '/', 1), v_base -> 'modules'),
    'business', (
      select jsonb_build_object(
        'slug',                 r.slug,
        'business_type',        to_jsonb(r) ->> 'business_type',
        'plan',                 to_jsonb(r) ->> 'plan',
        'reservations_enabled', coalesce((to_jsonb(r) ->> 'reservations_enabled')::boolean, false),
        'timezone',             to_jsonb(r) ->> 'timezone')
      from restaurants r where r.id = v.restaurant_id
    )
  );
end $$;

-- Igual que en la Fase 8, con la dirección del Space (para el nombre del archivo) y su suspensión
create or replace function public.get_profile_contact_card(p_profile_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v      public.profiles;
  v_card jsonb;
  v_handle text;
begin
  select * into v from profiles where id = p_profile_id;
  if not found or mycen_space_suspended(v.id) then return null; end if;
  if auth.uid() is not distinct from v.user_id and (v.status <> 'published' or v.published_version_id is null) then
    v_card := v.contact_card;
  elsif v.status = 'published' and v.visibility <> 'private' then
    select snapshot -> 'contact_card' into v_card from profile_versions where id = v.published_version_id;
    v_card := coalesce(v_card, v.contact_card);
  end if;
  if not coalesce((v_card ->> 'enabled')::boolean, false) then return null; end if;
  v_handle := mycen_space_handle(v.id);
  return (v_card - 'enabled') || jsonb_build_object('username', split_part(v_handle, '/', 1), 'handle', v_handle);
end $$;

-- Igual que en la Fase 8: también se denuncia un Space secundario ("ana/estudio")
create or replace function public.report_profile(
  p_username     text,
  p_reason       text,
  p_details      text default null,
  p_project_slug text default null
) returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v          public.profiles;
  v_id       uuid;
  v_project  uuid;
  v_headers  json;
  v_ua       text;
  v_ip       text;
  v_salt     text;
  v_hash     text;
begin
  if p_reason not in ('spam', 'scam', 'impersonation', 'hate', 'violence', 'sexual', 'illegal', 'other') then
    return 'invalid';
  end if;

  select o_id into v_id from mycen_find_space(p_username);
  select * into v from profiles where id = v_id;
  if not found or v.status <> 'published' or v.visibility = 'private' or mycen_space_suspended(v.id) then
    return 'not_found';
  end if;
  if auth.uid() is not distinct from v.user_id then return 'own_profile'; end if;

  if nullif(btrim(coalesce(p_project_slug, '')), '') is not null then
    select id into v_project from content_objects
    where identity_id = v.identity_id and type = 'project' and slug = lower(btrim(p_project_slug)) and status = 'published';
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ua := coalesce(v_headers ->> 'user-agent', '');
  v_ip := coalesce(btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), v_headers ->> 'x-real-ip', '');
  if v_ua ~* '(bot|crawl|spider|slurp|headless|lighthouse|curl|wget|python-requests)' then
    return 'ok';   -- no se guarda, pero no se le avisa al bot
  end if;

  select value into v_salt from mycen_private.secrets where key = 'visitor_salt';
  v_hash := left(encode(sha256(convert_to(
              v_ip || '|' || v_ua || '|' || coalesce(auth.uid()::text, '') || '|' || current_date::text || '|' || coalesce(v_salt, ''),
              'UTF8')), 'hex'), 32);

  if exists (select 1 from profile_reports r
             where r.reporter_hash = v_hash and r.profile_id = v.id and r.created_at > now() - interval '1 day') then
    return 'duplicate';
  end if;
  if (select count(*) from profile_reports r
      where r.reporter_hash = v_hash and r.created_at > now() - interval '1 day') >= 10 then
    return 'rate_limited';
  end if;

  insert into profile_reports (profile_id, content_object_id, reason, details, reporter_hash, reporter_user_id)
  values (v.id, v_project, p_reason, left(nullif(btrim(coalesce(p_details, '')), ''), 1000), v_hash, auth.uid());
  return 'ok';
end $$;

-- ─── 5. Moderación: la dirección completa del Space ──────────────────────────

-- Igual que en la Fase 8, con `handle` ("ana" o "ana/estudio") para abrir la página denunciada
create or replace function public.admin_list_reports(p_status text default 'open')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mycen_assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id, 'reason', r.reason, 'details', r.details, 'status', r.status, 'created_at', r.created_at,
             'resolution_note', r.resolution_note, 'resolved_at', r.resolved_at,
             'project', (select jsonb_build_object('slug', o.slug, 'title', o.title) from content_objects o where o.id = r.content_object_id),
             'profile', jsonb_build_object(
               'id', p.id, 'username', split_part(mycen_space_handle(p.id), '/', 1), 'handle', mycen_space_handle(p.id),
               'display_name', p.display_name, 'status', p.status,
               'suspended_at', p.suspended_at, 'suspension_reason', p.suspension_reason,
               'open_reports', (select count(*) from profile_reports x where x.profile_id = p.id and x.status = 'open')))
           order by r.created_at desc)
    from (
      select * from profile_reports
      where case coalesce(p_status, 'open')
              when 'open' then status = 'open'
              when 'resolved' then status <> 'open'
              else true end
      order by created_at desc
      limit 200
    ) r
    join profiles p on p.id = r.profile_id
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_list_suspended()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mycen_assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'username', split_part(mycen_space_handle(p.id), '/', 1),
                                        'handle', mycen_space_handle(p.id), 'display_name', p.display_name,
                                        'suspended_at', p.suspended_at, 'suspension_reason', p.suspension_reason)
                     order by p.suspended_at desc)
    from profiles p where p.suspended_at is not null
  ), '[]'::jsonb);
end $$;

revoke all on function public.get_public_profile(text) from public;
revoke all on function public.get_profile_contact_card(uuid) from public;
revoke all on function public.report_profile(text, text, text, text) from public;
revoke all on function public.admin_list_reports(text) from public, anon;
revoke all on function public.admin_list_suspended() from public, anon;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.get_profile_contact_card(uuid) to anon, authenticated;
grant execute on function public.report_profile(text, text, text, text) to anon, authenticated;
grant execute on function public.admin_list_reports(text) to authenticated;
grant execute on function public.admin_list_suspended() to authenticated;

commit;

notify pgrst, 'reload schema';
