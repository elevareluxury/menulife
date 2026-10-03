-- Vuelta atrás de la Fase 3 (20261008000001_identity_versioned_publishing.sql).
-- La página pública vuelve a leer las tablas vivas (guardar = publicar, como antes). Las versiones
-- ya creadas se conservan. Después, desplegar la versión anterior de la app (Studio sin "Publicar").

begin;

drop function if exists public.publish_space(uuid, text);
drop function if exists public.restore_space_version(uuid);
drop function if exists public.space_publish_state(uuid);
drop function if exists public.mycen_apply_snapshot(uuid, jsonb);
drop function if exists public.mycen_assert_space_owner(uuid);
drop trigger if exists profiles_revision on public.profiles;
drop function if exists public.mycen_profile_revision();
alter table public.profiles drop column if exists revision;

-- get_public_profile: lectura en vivo (igual que 20261002000001, más privacidad)
create or replace function public.get_public_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_username text := lower(btrim(coalesce(p_username, '')));
  v          public.profiles;
  v_redirect text;
begin
  select * into v from profiles where username = v_username;
  if not found then
    select p.username into v_redirect
    from profile_username_history h join profiles p on p.id = h.profile_id
    where h.old_username = v_username and p.status = 'published';
    if v_redirect is not null then return jsonb_build_object('redirect', v_redirect); end if;
    return null;
  end if;
  if v.status <> 'published' and auth.uid() is distinct from v.user_id then
    return jsonb_build_object('status', 'unavailable');
  end if;
  return (mycen_space_snapshot(v.id) - 'contact_card') || jsonb_build_object(
    'status', v.status, 'is_owner', auth.uid() is not distinct from v.user_id,
    'business', (select jsonb_build_object('slug', r.slug, 'business_type', to_jsonb(r) ->> 'business_type',
                   'plan', to_jsonb(r) ->> 'plan',
                   'reservations_enabled', coalesce((to_jsonb(r) ->> 'reservations_enabled')::boolean, false),
                   'timezone', to_jsonb(r) ->> 'timezone')
                 from restaurants r where r.id = v.restaurant_id));
end $$;

create or replace function public.get_profile_contact_card(p_profile_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select (p.contact_card - 'enabled') || jsonb_build_object('username', p.username)
  from profiles p
  where p.id = p_profile_id
    and coalesce((p.contact_card ->> 'enabled')::boolean, false)
    and (p.status = 'published' or p.user_id = auth.uid());
$$;

revoke all on function public.get_public_profile(text) from public;
revoke all on function public.get_profile_contact_card(uuid) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.get_profile_contact_card(uuid) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
