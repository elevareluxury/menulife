-- Vuelta atrás de la Fase 8 (20261011000001_identity_moderation.sql).
-- Levanta todas las suspensiones (las columnas se borran), borra las denuncias y devuelve las RPC
-- públicas a la Fase 5. La tabla super_admins no se toca (la usa el panel super-admin).
begin;

drop function if exists public.admin_resolve_report(uuid, text, text);
drop function if exists public.admin_set_suspension(uuid, boolean, text);
drop function if exists public.admin_list_suspended();
drop function if exists public.admin_list_reports(text);
drop function if exists public.mycen_assert_admin();
drop function if exists public.report_profile(text, text, text, text);
drop table if exists public.profile_reports;

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
revoke all on function public.get_public_project(text, text) from public;
revoke all on function public.get_profile_contact_card(uuid) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.get_public_project(text, text) to anon, authenticated;
grant execute on function public.get_profile_contact_card(uuid) to anon, authenticated;

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

drop trigger if exists profiles_suspension_guard on public.profiles;
drop function if exists public.mycen_suspension_guard();
alter table public.profiles drop constraint if exists profiles_suspension_reason_len;
alter table public.profiles drop column if exists suspension_reason;
alter table public.profiles drop column if exists suspended_at;
drop function if exists public.mycen_is_admin();

commit;

notify pgrst, 'reload schema';
