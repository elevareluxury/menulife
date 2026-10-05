-- Vuelta atrás de la Fase 5 (20261009000001_identity_projects.sql).
-- Borra los módulos project/portfolio (sin ellos la página queda como antes) y devuelve get_public_profile
-- a la versión de la Fase 3. Los proyectos (content_objects/content_blocks) NO se borran: son de la Fase 1.
begin;

delete from public.profile_modules where type in ('project', 'portfolio');
alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards'
));

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

drop function if exists public.get_public_project(text, text);
drop function if exists public.mycen_resolve_modules(uuid, text, jsonb);
drop function if exists public.mycen_project_cards(uuid, text, jsonb);
drop function if exists public.publish_project(uuid);
drop function if exists public.project_publish_state(uuid);
drop function if exists public.mycen_assert_content_owner(uuid);
drop function if exists public.mycen_project_snapshot(uuid);
drop trigger if exists content_objects_status_guard on public.content_objects;
drop function if exists public.mycen_content_status_guard();
alter table public.content_objects drop constraint if exists content_objects_published_needs_snapshot;
grant insert, update on public.content_objects to authenticated;

commit;

notify pgrst, 'reload schema';
