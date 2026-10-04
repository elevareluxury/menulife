-- Vuelta atrás de la Fase 10 (20261012000001_identity_spaces.sql).
-- ATENCIÓN: borra los Spaces secundarios (/usuario/slug) con sus módulos, versiones y analítica,
-- porque sin `space_slug` no tienen dirección. Los Spaces con username propio no se tocan.
-- Las RPC vuelven a la versión de la Fase 8.
begin;

drop function if exists public.duplicate_space(uuid, text, text);
drop trigger if exists profiles_space_rules on public.profiles;
drop function if exists public.mycen_space_rules();

delete from public.profiles where space_slug is not null;


create or replace function public.mycen_validate_username()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_legacy boolean := coalesce(current_setting('mycen.legacy_import', true), '') = 'on';
begin
  new.username := lower(btrim(new.username));

  if tg_op = 'UPDATE' and new.username = old.username then
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

  if tg_op = 'UPDATE' then
    insert into profile_username_history (old_username, profile_id)
    values (old.username, old.id)
    on conflict (old_username) do update set profile_id = excluded.profile_id, changed_at = now();
    -- Si vuelve a un username propio anterior, se libera del historial
    delete from profile_username_history where old_username = new.username and profile_id = new.id;
    new.username_changed_at := now();
  end if;

  return new;
end $$;




-- RPC públicas y de moderación como en la Fase 8

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
    where h.old_username = v_username and p.status = 'published' and p.visibility <> 'private' and p.suspended_at is null;
    if v_redirect is not null then
      return jsonb_build_object('redirect', v_redirect);
    end if;
    return null;
  end if;

  -- Suspendido: no lo ve nadie, tampoco el dueño (Studio le muestra el aviso)
  if v.suspended_at is not null then
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

  return (v_base - 'contact_card') || jsonb_build_object(
    'id',         v.id,
    'username',   v.username,
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

create or replace function public.get_profile_contact_card(p_profile_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v      public.profiles;
  v_card jsonb;
begin
  select * into v from profiles where id = p_profile_id;
  if not found or v.suspended_at is not null then return null; end if;
  if auth.uid() is not distinct from v.user_id and (v.status <> 'published' or v.published_version_id is null) then
    v_card := v.contact_card;
  elsif v.status = 'published' and v.visibility <> 'private' then
    select snapshot -> 'contact_card' into v_card from profile_versions where id = v.published_version_id;
    v_card := coalesce(v_card, v.contact_card);
  end if;
  if not coalesce((v_card ->> 'enabled')::boolean, false) then return null; end if;
  return (v_card - 'enabled') || jsonb_build_object('username', v.username);
end $$;

create or replace function public.report_profile(
  p_username     text,
  p_reason       text,
  p_details      text default null,
  p_project_slug text default null
) returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v          public.profiles;
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

  select * into v from profiles where username = lower(btrim(coalesce(p_username, '')));
  if not found or v.status <> 'published' or v.visibility = 'private' or v.suspended_at is not null then
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
               'id', p.id, 'username', p.username, 'display_name', p.display_name, 'status', p.status,
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
    select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name,
                                        'suspended_at', p.suspended_at, 'suspension_reason', p.suspension_reason)
                     order by p.suspended_at desc)
    from profiles p where p.suspended_at is not null
  ), '[]'::jsonb);
end $$;


drop function if exists public.mycen_find_space(text);
drop function if exists public.mycen_space_handle(uuid);
drop function if exists public.mycen_space_suspended(uuid);
drop function if exists public.mycen_reserved_space_slug(text);

drop index if exists public.profiles_space_slug_key;
alter table public.profiles drop constraint if exists profiles_space_slug_format;
alter table public.profiles drop constraint if exists profiles_space_not_primary;
alter table public.profiles drop constraint if exists profiles_space_address;
alter table public.profiles drop column if exists space_slug;
alter table public.profiles alter column username set not null;

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
