-- =============================================================================
-- Mycen Identity · Fase 8 — Moderación
--
--   · Cualquier visitante (sin cuenta) puede denunciar un perfil o un proyecto: report_profile().
--     Anónimo (hash diario, sin IP ni user-agent), sin bots, una denuncia por perfil y por día,
--     máximo 10 por día por persona. Nadie más que los administradores lee las denuncias.
--   · Los administradores (tabla super_admins) las revisan: descartar, o suspender el perfil.
--   · Un perfil suspendido no se ve: página, proyectos, vCard, redirecciones y vista previa al
--     compartir responden "no disponible". El dueño no puede quitarse la suspensión.
--
-- Requiere 20261010000001_identity_links_connect.sql. Idempotente.
-- Vuelta atrás: docs/identity/sql/fase8_rollback.sql
-- =============================================================================

begin;

-- ─── 1. Administradores ──────────────────────────────────────────────────────

-- Ya existe en producción (la usa el panel super-admin); se crea sólo si falta
create table if not exists public.super_admins (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade
);

create or replace function public.mycen_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from super_admins where user_id = auth.uid());
$$;

revoke all on function public.mycen_is_admin() from public, anon;
grant execute on function public.mycen_is_admin() to authenticated;

-- ─── 2. Suspensión ───────────────────────────────────────────────────────────

alter table public.profiles add column if not exists suspended_at      timestamptz;
alter table public.profiles add column if not exists suspension_reason text;
alter table public.profiles drop constraint if exists profiles_suspension_reason_len;
alter table public.profiles add constraint profiles_suspension_reason_len
  check (char_length(coalesce(suspension_reason, '')) <= 300);

-- Sólo las RPC de moderación cambian la suspensión (el dueño no puede quitársela)
create or replace function public.mycen_suspension_guard()
returns trigger language plpgsql as $$
begin
  if (new.suspended_at is distinct from old.suspended_at or new.suspension_reason is distinct from old.suspension_reason)
     and coalesce(current_setting('mycen.moderating', true), '') <> 'on' then
    raise exception 'SUSPENSION_LOCKED' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_suspension_guard on public.profiles;
create trigger profiles_suspension_guard
  before update on public.profiles
  for each row execute function public.mycen_suspension_guard();

-- Suspender no es un cambio de contenido: no sube la revisión (no pisa el autosave del dueño)
create or replace function public.mycen_profile_revision()
returns trigger language plpgsql as $$
declare
  v_skip text[] := array['revision', 'status', 'published_version_id', 'published_at', 'updated_at', 'onboarding_step',
                         'suspended_at', 'suspension_reason'];
begin
  if (to_jsonb(new) - v_skip) is distinct from (to_jsonb(old) - v_skip) then
    new.revision := old.revision + 1;
  end if;
  return new;
end $$;

-- ─── 3. Denuncias ────────────────────────────────────────────────────────────

create table if not exists public.profile_reports (
  id                uuid        primary key default gen_random_uuid(),
  profile_id        uuid        not null references public.profiles(id) on delete cascade,
  content_object_id uuid        references public.content_objects(id) on delete set null,
  reason            text        not null check (reason in
                      ('spam', 'scam', 'impersonation', 'hate', 'violence', 'sexual', 'illegal', 'other')),
  details           text        check (char_length(coalesce(details, '')) <= 1000),
  -- Hash diario anónimo (como en la analítica): sirve para frenar abusos, no identifica a nadie
  reporter_hash     text,
  reporter_user_id  uuid        references auth.users(id) on delete set null,
  status            text        not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  resolution_note   text        check (char_length(coalesce(resolution_note, '')) <= 500),
  resolved_by       uuid        references auth.users(id) on delete set null,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists profile_reports_status_idx on public.profile_reports (status, created_at desc);
create index if not exists profile_reports_profile_idx on public.profile_reports (profile_id, created_at desc);
create index if not exists profile_reports_reporter_idx on public.profile_reports (reporter_hash, created_at desc);

alter table public.profile_reports enable row level security;
-- Sin políticas: nadie lee ni escribe la tabla directo. Todo pasa por las RPC de abajo.
revoke all on public.profile_reports from anon, authenticated;

-- Denunciar. Devuelve 'ok' | 'duplicate' | 'rate_limited' | 'own_profile' | 'not_found' | 'invalid'
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

revoke all on function public.report_profile(text, text, text, text) from public;
grant execute on function public.report_profile(text, text, text, text) to anon, authenticated;

-- ─── 4. Revisión (sólo administradores) ──────────────────────────────────────

create or replace function public.mycen_assert_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not mycen_is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;
end $$;

revoke all on function public.mycen_assert_admin() from public, anon, authenticated;

-- Denuncias con los datos del perfil denunciado. p_status: open | resolved | all
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

-- Perfiles suspendidos (para poder levantar la suspensión)
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

-- Suspender o levantar la suspensión de un perfil
create or replace function public.admin_set_suspension(p_profile_id uuid, p_suspended boolean, p_reason text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_rows integer;
begin
  perform mycen_assert_admin();
  perform set_config('mycen.moderating', 'on', true);
  update profiles set
    suspended_at      = case when p_suspended then coalesce(suspended_at, now()) end,
    suspension_reason = case when p_suspended then left(nullif(btrim(coalesce(p_reason, '')), ''), 300) end
  where id = p_profile_id;
  get diagnostics v_rows = row_count;
  perform set_config('mycen.moderating', '', true);
  if v_rows = 0 then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
end $$;

-- Resolver una denuncia: 'dismiss' (no infringe) o 'suspend' (suspende el perfil y cierra todas sus denuncias abiertas)
create or replace function public.admin_resolve_report(p_report_id uuid, p_action text, p_note text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  r public.profile_reports;
  v_note text := left(nullif(btrim(coalesce(p_note, '')), ''), 500);
begin
  perform mycen_assert_admin();
  select * into r from profile_reports where id = p_report_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;

  if p_action = 'dismiss' then
    update profile_reports set status = 'dismissed', resolution_note = v_note, resolved_by = auth.uid(), resolved_at = now()
    where id = p_report_id;
  elsif p_action = 'suspend' then
    perform admin_set_suspension(r.profile_id, true, coalesce(v_note, r.reason));
    update profile_reports set status = 'actioned', resolution_note = v_note, resolved_by = auth.uid(), resolved_at = now()
    where profile_id = r.profile_id and status = 'open';
  else
    raise exception 'INVALID_ACTION' using errcode = '22023';
  end if;
end $$;

revoke all on function public.admin_list_reports(text) from public, anon;
revoke all on function public.admin_list_suspended() from public, anon;
revoke all on function public.admin_set_suspension(uuid, boolean, text) from public, anon;
revoke all on function public.admin_resolve_report(uuid, text, text) from public, anon;
grant execute on function public.admin_list_reports(text) to authenticated;
grant execute on function public.admin_list_suspended() to authenticated;
grant execute on function public.admin_set_suspension(uuid, boolean, text) to authenticated;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;

-- ─── 5. Lo suspendido no se ve ───────────────────────────────────────────────

-- Igual que en la Fase 5, más la suspensión
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
    where h.old_username = v_username and p.status = 'published' and p.visibility <> 'private' and p.suspended_at is null;
    if v_redirect is not null then
      return jsonb_build_object('redirect', v_redirect);
    end if;
    return null;
  end if;

  if v.suspended_at is not null then
    return jsonb_build_object('status', 'unavailable');
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
    v_project := mycen_project_snapshot(o.id);
  else
    return jsonb_build_object('status', 'unavailable');
  end if;

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

-- Igual que en la Fase 3, más la suspensión
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

revoke all on function public.get_public_profile(text) from public;
revoke all on function public.get_public_project(text, text) from public;
revoke all on function public.get_profile_contact_card(uuid) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.get_public_project(text, text) to anon, authenticated;
grant execute on function public.get_profile_contact_card(uuid) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
