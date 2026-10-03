-- =============================================================================
-- Mycen Identity · Fase 3 — Publicación con versiones (Switch)
--
-- Desde acá, guardar ≠ publicar:
--   · Studio edita la versión de trabajo (las filas de profiles / profile_modules).
--   · publish_space() congela esa versión en profile_versions y la deja pública.
--   · get_public_profile() muestra la versión publicada (el dueño, si no está publicado, ve su borrador).
--   · restore_space_version() publica una versión anterior como versión nueva y la trae a Studio.
--   · revision: control de concurrencia (otra pestaña guardó antes → el guardado se rechaza).
--
-- Requiere 20261007000001_identity_spaces_expand.sql. Idempotente.
-- Vuelta atrás: docs/identity/sql/fase3_rollback.sql
-- =============================================================================

begin;

-- ─── 1. Control de concurrencia ──────────────────────────────────────────────

alter table public.profiles add column if not exists revision integer not null default 0;

-- Sube sólo cuando cambia el contenido editable (no al publicar, pausar ni por el onboarding)
create or replace function public.mycen_profile_revision()
returns trigger language plpgsql as $$
declare
  v_skip text[] := array['revision', 'status', 'published_version_id', 'published_at', 'updated_at', 'onboarding_step'];
begin
  if (to_jsonb(new) - v_skip) is distinct from (to_jsonb(old) - v_skip) then
    new.revision := old.revision + 1;
  end if;
  return new;
end $$;

drop trigger if exists profiles_revision on public.profiles;
create trigger profiles_revision
  before update on public.profiles
  for each row execute function public.mycen_profile_revision();

-- ─── 2. Utilidades internas ──────────────────────────────────────────────────

create or replace function public.mycen_assert_space_owner(p_profile_id uuid)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  v public.profiles;
begin
  select * into v from profiles where id = p_profile_id for update;
  if not found or auth.uid() is distinct from v.user_id then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  return v;
end $$;

-- Lleva un snapshot a la versión de trabajo (para restaurar). No borra nada: los módulos que no
-- estaban en esa versión quedan ocultos, no eliminados.
create or replace function public.mycen_apply_snapshot(p_profile_id uuid, p_snapshot jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
begin
  update profiles set
    display_name   = coalesce(p_snapshot ->> 'display_name', display_name),
    descriptor     = p_snapshot ->> 'descriptor',
    bio            = p_snapshot ->> 'bio',
    avatar_url     = p_snapshot ->> 'avatar_url',
    cover_url      = p_snapshot ->> 'cover_url',
    purpose        = coalesce(p_snapshot ->> 'purpose', purpose),
    tags           = coalesce(array(select jsonb_array_elements_text(p_snapshot -> 'tags')), '{}'),
    theme          = coalesce(p_snapshot -> 'theme', '{}'::jsonb),
    primary_action = case when jsonb_typeof(p_snapshot -> 'primary_action') = 'object' then p_snapshot -> 'primary_action' end,
    default_locale = coalesce(p_snapshot ->> 'default_locale', default_locale),
    translations   = coalesce(p_snapshot -> 'translations', '{}'::jsonb),
    contact_card   = coalesce(p_snapshot -> 'contact_card', contact_card)
  where id = p_profile_id;

  select coalesce(array_agg((m ->> 'id')::uuid), '{}') into v_ids
  from jsonb_array_elements(coalesce(p_snapshot -> 'modules', '[]'::jsonb)) m;

  -- Módulos de la versión: vuelven con su contenido y en su orden
  insert into profile_modules (id, profile_id, type, title, content, config, translations, position, visibility, deleted_at)
  select (m ->> 'id')::uuid, p_profile_id, m ->> 'type', m ->> 'title',
         coalesce(m -> 'content', '{}'::jsonb), coalesce(m -> 'config', '{}'::jsonb),
         coalesce(m -> 'translations', '{}'::jsonb), (o * 10)::integer, 'active', null
  from jsonb_array_elements(coalesce(p_snapshot -> 'modules', '[]'::jsonb)) with ordinality as t(m, o)
  on conflict (id) do update set
    type         = excluded.type,
    title        = excluded.title,
    content      = excluded.content,
    config       = profile_modules.config || excluded.config,
    translations = excluded.translations,
    position     = excluded.position,
    visibility   = 'active',
    deleted_at   = null
  where profile_modules.profile_id = p_profile_id;

  -- Lo que no estaba en esa versión se oculta (se puede volver a mostrar desde Studio)
  update profile_modules set visibility = 'hidden'
  where profile_id = p_profile_id and deleted_at is null and visibility = 'active' and not (id = any(v_ids));
end $$;

revoke all on function public.mycen_assert_space_owner(uuid) from public, anon, authenticated;
revoke all on function public.mycen_apply_snapshot(uuid, jsonb) from public, anon, authenticated;

-- ─── 3. Publicar, restaurar y estado ─────────────────────────────────────────

create or replace function public.publish_space(p_profile_id uuid, p_note text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
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
  return jsonb_build_object('version_id', v_id, 'version_number', v_number);
end $$;

create or replace function public.restore_space_version(p_version_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_old    public.profile_versions;
  v_id     uuid;
  v_number integer;
begin
  select * into v_old from profile_versions where id = p_version_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform mycen_assert_space_owner(v_old.profile_id);

  -- La versión de trabajo vuelve a ese estado…
  perform mycen_apply_snapshot(v_old.profile_id, v_old.snapshot);

  -- …y se publica como versión nueva (el historial no se borra)
  select coalesce(max(version_number), 0) + 1 into v_number from profile_versions where profile_id = v_old.profile_id;
  insert into profile_versions (profile_id, version_number, snapshot, created_by, restored_from, note)
  values (v_old.profile_id, v_number, mycen_space_snapshot(v_old.profile_id), auth.uid(), v_old.id,
          'Restaurada desde la versión ' || v_old.version_number)
  returning id into v_id;

  update profiles set published_version_id = v_id, status = 'published' where id = v_old.profile_id;
  return jsonb_build_object('version_id', v_id, 'version_number', v_number);
end $$;

-- Qué está publicado y si la versión de trabajo tiene cambios sin publicar
create or replace function public.space_publish_state(p_profile_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v   public.profiles;
  pv  public.profile_versions;
begin
  select * into v from profiles where id = p_profile_id;
  if not found or auth.uid() is distinct from v.user_id then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  select * into pv from profile_versions where id = v.published_version_id;
  return jsonb_build_object(
    'status',         v.status,
    'visibility',     v.visibility,
    'revision',       v.revision,
    'version_id',     pv.id,
    'version_number', pv.version_number,
    'published_at',   pv.created_at,
    'dirty',          pv.id is null or pv.snapshot is distinct from mycen_space_snapshot(v.id)
  );
end $$;

revoke all on function public.publish_space(uuid, text) from public, anon;
revoke all on function public.restore_space_version(uuid) from public, anon;
revoke all on function public.space_publish_state(uuid) from public, anon;
grant execute on function public.publish_space(uuid, text) to authenticated;
grant execute on function public.restore_space_version(uuid) to authenticated;
grant execute on function public.space_publish_state(uuid) to authenticated;

-- ─── 4. RPC públicas: leen la versión publicada ──────────────────────────────

create or replace function public.get_public_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_username text := lower(btrim(coalesce(p_username, '')));
  v          public.profiles;
  v_redirect text;
  v_owner    boolean;
  v_base     jsonb;
begin
  select * into v from profiles where username = v_username;

  if not found then
    select p.username into v_redirect
    from profile_username_history h join profiles p on p.id = h.profile_id
    where h.old_username = v_username and p.status = 'published' and p.visibility <> 'private';
    if v_redirect is not null then
      return jsonb_build_object('redirect', v_redirect);
    end if;
    return null;
  end if;

  v_owner := auth.uid() is not distinct from v.user_id;
  if (v.status <> 'published' or v.visibility = 'private') and not v_owner then
    return jsonb_build_object('status', 'unavailable');
  end if;

  -- El visitante ve la versión publicada; el dueño, si todavía no publicó, ve su borrador
  if v.status = 'published' and v.published_version_id is not null then
    select snapshot into v_base from profile_versions where id = v.published_version_id;
  end if;
  v_base := coalesce(v_base, mycen_space_snapshot(v.id));

  return (v_base - 'contact_card') || jsonb_build_object(
    'id',         v.id,
    'username',   v.username,       -- la URL vigente aunque se haya publicado con otro username
    'status',     v.status,
    'visibility', v.visibility,
    'is_owner',   v_owner,
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

-- La vCard también sale de lo publicado
create or replace function public.get_profile_contact_card(p_profile_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v      public.profiles;
  v_card jsonb;
begin
  select * into v from profiles where id = p_profile_id;
  if not found then return null; end if;
  if auth.uid() is not distinct from v.user_id and (v.status <> 'published' or v.published_version_id is null) then
    v_card := v.contact_card;
  elsif v.status = 'published' and v.visibility <> 'private' then
    select snapshot -> 'contact_card' into v_card from profile_versions where id = v.published_version_id;
    v_card := coalesce(v_card, v.contact_card);
  end if;
  if not coalesce((v_card ->> 'enabled')::boolean, false) then return null; end if;
  return (v_card - 'enabled') || jsonb_build_object('username', v.username);
end $$;

revoke all on function public.get_public_profile(text) from public;
revoke all on function public.get_profile_contact_card(uuid) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.get_profile_contact_card(uuid) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
