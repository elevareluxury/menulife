-- =============================================================================
-- Interruptores de emergencia, verificación en dos pasos para el equipo y retención de evidencia (PR C)
--
--  1. Interruptores de emergencia (Super-admin → Estado): además de 'business', cuatro partes que se apagan en un clic
--     si hay spam o un ataque, sin publicar una versión nueva. Prendidas de entrada:
--       · 'signups'       → registros nuevos (email, Google o Apple): un trigger en auth.users los frena.
--       · 'messages'      → formulario de contacto y colaboraciones (submit_profile_message / submit_profile_collab).
--       · 'subscriptions' → módulo Suscribirse (subscribe_profile).
--       · 'polls'         → votar en encuestas (vote_profile_poll).
--     Las RPC se frenan en el gancho previo de PostgREST (mycen_pre_request) con HTTP 503 'FEATURE_PAUSED'. Si la
--     tabla no responde, se deja pasar: un interruptor nunca apaga algo por error.
--  2. Verificación en dos pasos (MFA) para el equipo: mycen_is_admin() exige además una sesión con el segundo paso
--     hecho (claim aal = 'aal2'). Sin eso, ninguna función del panel ni política de admin responde. El panel guía para
--     activarla. Si alguien del equipo pierde el celular: en el SQL Editor,
--       delete from auth.mfa_factors where user_id = '<uuid>';   -- y vuelve a activarla al entrar
--     y, sólo en una emergencia (deja el panel con contraseña sola):
--       insert into public.mycen_security_settings (key, value) values ('admin_mfa', 'off')
--         on conflict (key) do update set value = excluded.value;
--  3. Retención de evidencia (abuso sexual infantil, docs/seguridad/csam.md): admin_csam_action suspende el perfil
--     (y con el principal, todos sus Spaces), cierra sus denuncias y pone la cuenta en retención legal
--     (mycen_legal_holds): la cuenta no se puede borrar ni borrar sus fotos y PDF (tampoco el equipo) hasta que el
--     equipo levante la retención (admin_release_legal_hold). Todo queda en la bitácora del equipo.
--
-- Idempotente. Se aplica pegándola en Supabase → SQL Editor. Tests: tests/db/emergency_mfa_csam.test.sql.
-- =============================================================================
begin;

-- ─── 1. Interruptores de emergencia ─────────────────────────────────────────

alter table public.mycen_site_flags drop constraint if exists mycen_site_flags_key_check;
alter table public.mycen_site_flags add constraint mycen_site_flags_key_check
  check (key in ('business', 'signups', 'messages', 'subscriptions', 'polls'));

insert into public.mycen_site_flags (key, enabled) values
  ('signups', true), ('messages', true), ('subscriptions', true), ('polls', true)
on conflict (key) do nothing;

-- Prendido salvo que el equipo lo haya apagado (si no hay fila o algo falla, prendido)
create or replace function public.mycen_flag_on(p_key text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select enabled from mycen_site_flags where key = p_key), true);
$$;
revoke all on function public.mycen_flag_on(text) from public, anon, authenticated;

create or replace function public.get_site_flags()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'business',      coalesce((select enabled from mycen_site_flags where key = 'business'), false),
    'signups',       mycen_flag_on('signups'),
    'messages',      mycen_flag_on('messages'),
    'subscriptions', mycen_flag_on('subscriptions'),
    'polls',         mycen_flag_on('polls'));
$$;
revoke all on function public.get_site_flags() from public;
grant execute on function public.get_site_flags() to anon, authenticated;

create or replace function public.admin_set_site_flag(p_key text, p_enabled boolean)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  if not public.mycen_is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;
  if p_key is null or p_key not in ('business', 'signups', 'messages', 'subscriptions', 'polls') or p_enabled is null then
    raise exception 'INVALID_FLAG' using errcode = '22023';
  end if;
  insert into mycen_site_flags (key, enabled, updated_at, updated_by)
  values (p_key, p_enabled, now(), auth.uid())
  on conflict (key) do update set enabled = excluded.enabled, updated_at = now(), updated_by = auth.uid();
  return public.get_site_flags();
end $$;
revoke all on function public.admin_set_site_flag(text, boolean) from public, anon;
grant execute on function public.admin_set_site_flag(text, boolean) to authenticated;

-- Qué interruptor frena cada RPC pública (null = ninguno)
create or replace function public.mycen_rpc_flag(p_rpc text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select case p_rpc
    when 'submit_profile_message' then 'messages'
    when 'submit_profile_collab'  then 'messages'
    when 'subscribe_profile'      then 'subscriptions'
    when 'vote_profile_poll'      then 'polls'
  end;
$$;
revoke all on function public.mycen_rpc_flag(text) from public, anon, authenticated;

-- Gancho previo de PostgREST: primero los interruptores, después el tope diario por IP (20261123000001)
create or replace function public.mycen_pre_request()
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_path    text;
  v_rpc     text;
  v_flag    text;
  v_paused  boolean := false;
  v_limit   integer;
  v_ip      text;
  v_hits    integer;
  v_blocked boolean := false;
begin
  begin
    v_path := current_setting('request.path', true);
    if v_path is null or v_path not like '/rpc/%' then return; end if;
    v_rpc := substr(v_path, 6);
    v_flag := mycen_rpc_flag(v_rpc);
    if v_flag is not null then v_paused := not mycen_flag_on(v_flag); end if;
  exception when others then
    v_paused := false;
  end;
  if v_paused then
    -- PT503 = respuesta HTTP 503 de PostgREST; la página lo explica ("en pausa, probá en un rato")
    raise exception 'FEATURE_PAUSED' using errcode = 'PT503';
  end if;

  begin
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
    raise exception 'RATE_LIMITED' using errcode = 'PT429';
  end if;
end $$;
revoke all on function public.mycen_pre_request() from public;
grant execute on function public.mycen_pre_request() to anon, authenticated;

-- Registros: con 'signups' apagado no se crea ninguna cuenta nueva (email, Google, Apple). El equipo sí puede crear
-- usuarios desde el panel de Supabase prendiéndolo un momento.
create or replace function public.mycen_signup_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not mycen_flag_on('signups') then
    raise exception 'SIGNUPS_PAUSED' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.mycen_signup_guard() from public, anon, authenticated;

drop trigger if exists mycen_signup_guard on auth.users;
create trigger mycen_signup_guard before insert on auth.users
  for each row execute function public.mycen_signup_guard();

-- ─── 2. Verificación en dos pasos para el equipo ────────────────────────────

create table if not exists public.mycen_security_settings (
  key        text primary key check (key in ('admin_mfa')),
  value      text not null check (value in ('required', 'off')),
  updated_at timestamptz not null default now()
);
alter table public.mycen_security_settings enable row level security;
revoke all on table public.mycen_security_settings from public, anon, authenticated;

-- Nivel de la sesión que trae el pedido: 'aal1' (contraseña o Google) o 'aal2' (con el segundo paso)
create or replace function public.mycen_session_aal()
returns text language plpgsql stable set search_path = public, pg_temp as $$
begin
  return nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal';
exception when others then
  return null;
end $$;
revoke all on function public.mycen_session_aal() from public, anon;
grant execute on function public.mycen_session_aal() to authenticated;

create or replace function public.mycen_is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from super_admins where user_id = auth.uid())
     and (public.mycen_session_aal() = 'aal2'
          or coalesce((select value from mycen_security_settings where key = 'admin_mfa'), 'required') = 'off');
$$;
revoke all on function public.mycen_is_admin() from public, anon;
grant execute on function public.mycen_is_admin() to authenticated;

-- ─── 3. Retención de evidencia (abuso sexual infantil) ──────────────────────

create table if not exists public.mycen_legal_holds (
  user_id    uuid        primary key,
  reason     text        not null check (reason in ('csam', 'legal_request')),
  report_id  uuid,
  profile_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid
);
alter table public.mycen_legal_holds enable row level security;
revoke all on table public.mycen_legal_holds from public, anon, authenticated;

create or replace function public.mycen_has_legal_hold(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select p_user_id is not null and exists (select 1 from mycen_legal_holds where user_id = p_user_id);
$$;
revoke all on function public.mycen_has_legal_hold(uuid) from public, anon;
grant execute on function public.mycen_has_legal_hold(uuid) to authenticated;

-- La carpeta de un archivo de cuenta es el id de la persona: con retención, nadie lo borra ni lo reemplaza
create or replace function public.mycen_folder_on_hold(p_name text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from mycen_legal_holds where user_id::text = split_part(coalesce(p_name, ''), '/', 1));
$$;
revoke all on function public.mycen_folder_on_hold(text) from public, anon;
grant execute on function public.mycen_folder_on_hold(text) to authenticated;

drop policy if exists mycen_legal_hold_no_delete on storage.objects;
create policy mycen_legal_hold_no_delete on storage.objects as restrictive for delete to authenticated
  using (not (bucket_id in ('profile-media', 'profile-files') and public.mycen_folder_on_hold(name)));
drop policy if exists mycen_legal_hold_no_update on storage.objects;
create policy mycen_legal_hold_no_update on storage.objects as restrictive for update to authenticated
  using (not (bucket_id in ('profile-media', 'profile-files') and public.mycen_folder_on_hold(name)));

-- Borrar la cuenta: no con una retención legal (la evidencia se conserva)
create or replace function public.mycen_legal_hold_account_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from mycen_legal_holds where user_id = old.id) then
    raise exception 'LEGAL_HOLD' using errcode = '42501';
  end if;
  return old;
end $$;
revoke all on function public.mycen_legal_hold_account_guard() from public, anon, authenticated;

drop trigger if exists mycen_legal_hold_guard on auth.users;
create trigger mycen_legal_hold_guard before delete on auth.users
  for each row execute function public.mycen_legal_hold_account_guard();

-- Acción ante abuso sexual infantil: suspender, cerrar denuncias, retener y anotar (un solo paso)
create or replace function public.admin_csam_action(p_profile_id uuid, p_report_id uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_user uuid;
  v_principal uuid;
begin
  perform mycen_assert_admin();
  select user_id into v_user from profiles where id = p_profile_id;
  if v_user is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;

  -- Se suspende el principal (oculta todos los Spaces) y el Space denunciado; el motivo que ve la persona es genérico
  select id into v_principal from profiles where user_id = v_user and is_primary order by created_at limit 1;
  perform admin_set_suspension(coalesce(v_principal, p_profile_id), true, 'Incumplimiento grave de las reglas de contenido');
  if v_principal is distinct from p_profile_id then
    perform admin_set_suspension(p_profile_id, true, 'Incumplimiento grave de las reglas de contenido');
  end if;

  update profile_reports set status = 'actioned', resolution_note = 'csam', resolved_by = auth.uid(), resolved_at = now()
  where profile_id in (select id from profiles where user_id = v_user) and status = 'open';

  insert into mycen_legal_holds (user_id, reason, report_id, profile_id, created_by)
  values (v_user, 'csam', p_report_id, p_profile_id, auth.uid())
  on conflict (user_id) do nothing;

  insert into admin_audit_log (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'csam_hold', 'profiles', p_profile_id::text,
          jsonb_build_object('user_id', v_user, 'report_id', p_report_id));

  return jsonb_build_object('user_id', v_user, 'held', true);
end $$;
revoke all on function public.admin_csam_action(uuid, uuid) from public, anon;
grant execute on function public.admin_csam_action(uuid, uuid) to authenticated;

create or replace function public.admin_get_legal_hold(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform mycen_assert_admin();
  return (select jsonb_build_object('reason', reason, 'created_at', created_at, 'report_id', report_id)
          from mycen_legal_holds where user_id = p_user_id);
end $$;
revoke all on function public.admin_get_legal_hold(uuid) from public, anon;
grant execute on function public.admin_get_legal_hold(uuid) to authenticated;

create or replace function public.admin_release_legal_hold(p_user_id uuid)
returns void language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  perform mycen_assert_admin();
  delete from mycen_legal_holds where user_id = p_user_id;
  if found then
    insert into admin_audit_log (admin_id, action, target_type, target_id, details)
    values (auth.uid(), 'legal_hold_released', 'auth.users', p_user_id::text, '{}'::jsonb);
  end if;
end $$;
revoke all on function public.admin_release_legal_hold(uuid) from public, anon;
grant execute on function public.admin_release_legal_hold(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
