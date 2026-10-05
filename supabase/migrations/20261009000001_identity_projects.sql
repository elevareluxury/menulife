-- =============================================================================
-- Mycen Identity · Fase 5 — Proyectos y Portfolio
--
--   · Un proyecto (content_objects type='project') tiene bloques (content_blocks) y se publica por su
--     cuenta (P2): publish_project() congela su versión en published_snapshot.
--   · URL pública: /{username}/projects/{slug} → get_public_project().
--   · Módulos nuevos: 'project' (un proyecto destacado) y 'portfolio' (grilla). Guardan sólo ids en
--     `content`; get_public_profile() les agrega las tarjetas de los proyectos publicados al responder,
--     así que publicar un proyecto actualiza el portfolio sin volver a publicar el Space.
--
-- Requiere 20261008000001_identity_versioned_publishing.sql. Idempotente.
-- Vuelta atrás: docs/identity/sql/fase5_rollback.sql
-- =============================================================================

begin;

-- ─── 1. Tipos de módulo ──────────────────────────────────────────────────────

alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards','project','portfolio'
));

-- ─── 2. Proyectos: sólo publish_project() publica ────────────────────────────

alter table public.content_objects drop constraint if exists content_objects_published_needs_snapshot;
alter table public.content_objects add constraint content_objects_published_needs_snapshot
  check (status <> 'published' or published_snapshot is not null);

-- Studio escribe los campos editables; published_snapshot y published_at sólo los escribe la RPC
revoke insert, update on public.content_objects from authenticated;
grant insert (id, identity_id, type, title, slug, summary, cover_url, data, translations, visibility)
  on public.content_objects to authenticated;
grant update (title, slug, summary, cover_url, data, translations, visibility, status)
  on public.content_objects to authenticated;

-- Pasar a "publicado" sólo desde publish_project() (despublicar o archivar sí se puede directo)
create or replace function public.mycen_content_status_guard()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and old.status is distinct from 'published'
     and coalesce(current_setting('mycen.publishing', true), '') <> 'on' then
    raise exception 'USE_PUBLISH_PROJECT' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists content_objects_status_guard on public.content_objects;
create trigger content_objects_status_guard
  before update of status on public.content_objects
  for each row execute function public.mycen_content_status_guard();

-- ─── 3. Snapshot, publicar y estado ──────────────────────────────────────────

create or replace function public.mycen_project_snapshot(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id',           o.id,
    'type',         o.type,
    'title',        o.title,
    'summary',      o.summary,
    'cover_url',    o.cover_url,
    'data',         o.data,
    'translations', o.translations,
    'blocks', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'type', b.type, 'data', b.data, 'translations', b.translations)
                       order by b.position, b.created_at)
      from content_blocks b where b.content_object_id = o.id
    ), '[]'::jsonb)
  )
  from content_objects o where o.id = p_id;
$$;

revoke all on function public.mycen_project_snapshot(uuid) from public, anon, authenticated;

create or replace function public.mycen_assert_content_owner(p_id uuid)
returns public.content_objects language plpgsql security definer set search_path = public as $$
declare
  v public.content_objects;
begin
  select o.* into v from content_objects o join identities i on i.id = o.identity_id
  where o.id = p_id and i.user_id = auth.uid()
  for update of o;
  if not found then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  return v;
end $$;

revoke all on function public.mycen_assert_content_owner(uuid) from public, anon, authenticated;

create or replace function public.publish_project(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v public.content_objects;
begin
  v := mycen_assert_content_owner(p_id);
  perform set_config('mycen.publishing', 'on', true);
  update content_objects
    set published_snapshot = mycen_project_snapshot(p_id), published_at = now(), status = 'published'
    where id = p_id
    returning * into v;
  perform set_config('mycen.publishing', '', true);
  return jsonb_build_object('status', v.status, 'published_at', v.published_at);
end $$;

-- Qué está publicado y si el proyecto tiene cambios sin publicar
create or replace function public.project_publish_state(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v public.content_objects;
begin
  select o.* into v from content_objects o join identities i on i.id = o.identity_id
  where o.id = p_id and i.user_id = auth.uid();
  if not found then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'status',       v.status,
    'published_at', v.published_at,
    'dirty',        v.published_snapshot is null or v.published_snapshot is distinct from mycen_project_snapshot(v.id)
  );
end $$;

revoke all on function public.publish_project(uuid) from public, anon;
revoke all on function public.project_publish_state(uuid) from public, anon;
grant execute on function public.publish_project(uuid) to authenticated;
grant execute on function public.project_publish_state(uuid) to authenticated;

-- ─── 4. Tarjetas de proyectos para los módulos ───────────────────────────────

-- p_ids null = todos los proyectos públicos (más nuevos primero); con ids = esos, en ese orden
-- (también los "no listados": el dueño los eligió). Siempre de la versión publicada.
create or replace function public.mycen_project_cards(p_identity_id uuid, p_username text, p_ids jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id',           o.id,
           'slug',         o.slug,
           'path',         '/' || p_username || '/projects/' || o.slug,
           'title',        o.published_snapshot ->> 'title',
           'summary',      o.published_snapshot ->> 'summary',
           'cover_url',    o.published_snapshot ->> 'cover_url',
           'translations', coalesce(o.published_snapshot -> 'translations', '{}'::jsonb))
         order by sel.ord nulls last, o.published_at desc), '[]'::jsonb)
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
             else o.visibility = 'public' end;
$$;

revoke all on function public.mycen_project_cards(uuid, text, jsonb) from public, anon, authenticated;

-- Agrega `projects` a los módulos que muestran proyectos
create or replace function public.mycen_resolve_modules(p_identity_id uuid, p_username text, p_modules jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
           case m ->> 'type'
             when 'project' then m || jsonb_build_object('projects',
               mycen_project_cards(p_identity_id, p_username, jsonb_build_array(m -> 'content' ->> 'project_id')))
             when 'portfolio' then m || jsonb_build_object('projects',
               mycen_project_cards(p_identity_id, p_username,
                 case when jsonb_typeof(m -> 'content' -> 'project_ids') = 'array'
                       and jsonb_array_length(m -> 'content' -> 'project_ids') > 0
                      then m -> 'content' -> 'project_ids' end))
             else m
           end order by ord), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_modules, '[]'::jsonb)) with ordinality as t(m, ord);
$$;

revoke all on function public.mycen_resolve_modules(uuid, text, jsonb) from public, anon, authenticated;

-- ─── 5. RPC públicas ─────────────────────────────────────────────────────────

-- Igual que en la Fase 3, más las tarjetas de proyectos en los módulos project/portfolio
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
    'modules',    mycen_resolve_modules(v.identity_id, v.username, v_base -> 'modules'),
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

-- Página de un proyecto: /{username}/projects/{slug}
create or replace function public.get_public_project(p_username text, p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_username text := lower(btrim(coalesce(p_username, '')));
  v          public.profiles;
  o          public.content_objects;
  v_redirect text;
  v_owner    boolean;
  v_space    jsonb;
  v_project  jsonb;
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

  select * into o from content_objects
  where identity_id = v.identity_id and type = 'project' and slug = lower(btrim(coalesce(p_slug, '')));
  if not found then return null; end if;

  if o.status = 'published' and o.visibility <> 'private' then
    v_project := o.published_snapshot;
  elsif v_owner and o.status <> 'archived' then
    v_project := mycen_project_snapshot(o.id);   -- el dueño ve su borrador
  else
    return jsonb_build_object('status', 'unavailable');
  end if;

  -- Del Space, lo mismo que ve el visitante en la página principal
  if v.status = 'published' and v.published_version_id is not null then
    select snapshot into v_space from profile_versions where id = v.published_version_id;
  end if;
  v_space := coalesce(v_space, mycen_space_snapshot(v.id));

  return v_project || jsonb_build_object(
    'slug',       o.slug,
    'status',     o.status,
    'visibility', o.visibility,
    'is_owner',   v_owner,
    'space', jsonb_build_object(
      'id',             v.id,
      'username',       v.username,
      'display_name',   v_space ->> 'display_name',
      'avatar_url',     v_space ->> 'avatar_url',
      'theme',          coalesce(v_space -> 'theme', '{}'::jsonb),
      'default_locale', v_space ->> 'default_locale',
      'translations',   coalesce(v_space -> 'translations', '{}'::jsonb),
      'visibility',     v.visibility)
  );
end $$;

revoke all on function public.get_public_profile(text) from public;
revoke all on function public.get_public_project(text, text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.get_public_project(text, text) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
