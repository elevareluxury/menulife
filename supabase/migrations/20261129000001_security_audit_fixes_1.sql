-- Auditoría de seguridad (24/11/2026), arreglos 1–3 de los hallazgos medios:
--   1. Cuentas suspendidas o con retención legal no suben ni cambian archivos; el bucket privado `mycen-evidence`
--      recibe los archivos retenidos (los pasa la Edge Function `quarantine-held-files`, con service role).
--   2. Nadie con una sesión común puede preguntar si una cuenta tiene retención legal (las funciones que usan las
--      políticas viven en el esquema `mycen_private`, que la API no expone).
--   3. La verificación en dos pasos la exige la base: con un factor verificado y la sesión en aal1, sólo se usan las
--      RPC públicas (las mismas que un visitante) y no se tocan archivos, hasta escribir el código.
-- Idempotente. Se aplica en Supabase → SQL Editor.

-- ─── Esquema privado (no está en "Exposed schemas" de la API) ─────────────────────────────────────────
create schema if not exists mycen_private;
revoke all on schema mycen_private from public, anon;
grant usage on schema mycen_private to authenticated;

-- Carpeta con retención legal (la carpeta = id de la cuenta)
create or replace function mycen_private.folder_on_hold(p_name text)
returns boolean language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select exists (select 1 from public.mycen_legal_holds where user_id::text = split_part(coalesce(p_name, ''), '/', 1));
$$;
revoke all on function mycen_private.folder_on_hold(text) from public, anon;
grant execute on function mycen_private.folder_on_hold(text) to authenticated;

-- Dueña de la carpeta con retención o con algún Space suspendido: no sube ni cambia archivos
create or replace function mycen_private.folder_owner_blocked(p_name text)
returns boolean language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select exists (select 1 from public.mycen_legal_holds where user_id::text = split_part(coalesce(p_name, ''), '/', 1))
      or exists (select 1 from public.profiles
                 where user_id::text = split_part(coalesce(p_name, ''), '/', 1) and suspended_at is not null);
$$;
revoke all on function mycen_private.folder_owner_blocked(text) from public, anon;
grant execute on function mycen_private.folder_owner_blocked(text) to authenticated;

-- Dos pasos: la sesión está bien si ya es aal2 o si la cuenta no tiene un factor verificado
-- Si no pudiera leer los factores, deja pasar (no frena las subidas de todos); lo cubre el test de la base
create or replace function mycen_private.mfa_ok()
returns boolean language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
begin
  return auth.uid() is null
      or public.mycen_session_aal() = 'aal2'
      or not exists (select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified');
exception when others then
  return true;
end $$;
revoke all on function mycen_private.mfa_ok() from public, anon;
grant execute on function mycen_private.mfa_ok() to authenticated;

-- ─── 2. Sin oráculo de retención ──────────────────────────────────────────────────────────────────────
drop policy if exists mycen_legal_hold_no_delete on storage.objects;
create policy mycen_legal_hold_no_delete on storage.objects as restrictive for delete to authenticated
  using (not (bucket_id in ('profile-media', 'profile-files') and mycen_private.folder_on_hold(name)));
drop policy if exists mycen_legal_hold_no_update on storage.objects;
create policy mycen_legal_hold_no_update on storage.objects as restrictive for update to authenticated
  using (not (bucket_id in ('profile-media', 'profile-files') and mycen_private.folder_on_hold(name)));

revoke all on function public.mycen_folder_on_hold(text) from public, anon, authenticated;
revoke all on function public.mycen_has_legal_hold(uuid) from public, anon, authenticated;

-- ─── 1. Suspendidas y retenidas no suben ni cambian archivos ──────────────────────────────────────────
drop policy if exists mycen_blocked_owner_no_insert on storage.objects;
create policy mycen_blocked_owner_no_insert on storage.objects as restrictive for insert to authenticated
  with check (not (bucket_id in ('profile-media', 'profile-files') and mycen_private.folder_owner_blocked(name)));
drop policy if exists mycen_blocked_owner_no_update on storage.objects;
create policy mycen_blocked_owner_no_update on storage.objects as restrictive for update to authenticated
  with check (not (bucket_id in ('profile-media', 'profile-files') and mycen_private.folder_owner_blocked(name)));

-- Evidencia: bucket privado. Lo escribe sólo el servidor (service role); lo leen sólo super-admins con aal2.
-- Nadie lo borra ni lo cambia desde la app (no hay políticas de escritura).
insert into storage.buckets (id, name, public)
values ('mycen-evidence', 'mycen-evidence', false)
on conflict (id) do update set public = false;

drop policy if exists mycen_evidence_admin_select on storage.objects;
create policy mycen_evidence_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'mycen-evidence' and public.mycen_is_admin());

-- Bitácora del pase a evidencia (lo llama la Edge Function con la sesión del super-admin)
create or replace function public.admin_log_evidence_quarantine(p_user_id uuid, p_files integer)
returns void language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
begin
  perform mycen_assert_admin();
  if not exists (select 1 from mycen_legal_holds where user_id = p_user_id) then
    raise exception 'NO_LEGAL_HOLD' using errcode = '22023';
  end if;
  insert into admin_audit_log (admin_id, action, target_type, target_id, details)
  values ((select auth.uid()), 'evidence_quarantined', 'account', p_user_id::text,
          jsonb_build_object('files', greatest(coalesce(p_files, 0), 0)));
end $$;
revoke all on function public.admin_log_evidence_quarantine(uuid, integer) from public, anon;
grant execute on function public.admin_log_evidence_quarantine(uuid, integer) to authenticated;

-- ─── 3. Dos pasos en la base ──────────────────────────────────────────────────────────────────────────
-- Archivos de perfil: con un factor verificado, sólo con la sesión en aal2
drop policy if exists mycen_mfa_storage_insert on storage.objects;
create policy mycen_mfa_storage_insert on storage.objects as restrictive for insert to authenticated
  with check (bucket_id not in ('profile-media', 'profile-files') or mycen_private.mfa_ok());
drop policy if exists mycen_mfa_storage_update on storage.objects;
create policy mycen_mfa_storage_update on storage.objects as restrictive for update to authenticated
  using (bucket_id not in ('profile-media', 'profile-files') or mycen_private.mfa_ok());
drop policy if exists mycen_mfa_storage_delete on storage.objects;
create policy mycen_mfa_storage_delete on storage.objects as restrictive for delete to authenticated
  using (bucket_id not in ('profile-media', 'profile-files') or mycen_private.mfa_ok());

-- RPC que puede usar una sesión que todavía no escribió el código: las públicas (las mismas que un visitante)
create or replace function public.mycen_mfa_pending_rpc_allowed(p_rpc text)
returns boolean language sql immutable set search_path = public, extensions, pg_temp as $$
  select coalesce(p_rpc, '') = any (array[
    'get_public_profile', 'get_public_project', 'get_profile_contact_card', 'track_profile_event', 'check_username',
    'report_profile', 'public_sitemap', 'report_client_error', 'submit_profile_message', 'submit_profile_collab',
    'track_product_event', 'subscribe_profile', 'get_site_flags', 'get_poll_results', 'vote_profile_poll',
    'life_calendar_feed'
  ]);
$$;
revoke all on function public.mycen_mfa_pending_rpc_allowed(text) from public, anon, authenticated;

-- Igual a 20261124000001 + el chequeo de dos pasos al principio (para tablas y RPC)
create or replace function public.mycen_pre_request()
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_path text; v_rpc text; v_flag text; v_paused boolean := false; v_limit integer; v_ip text; v_hits integer;
        v_blocked boolean := false; v_mfa_pending boolean := false;
begin
  v_path := coalesce(current_setting('request.path', true), '');
  -- Dos pasos: una sesión aal1 de una cuenta con factor verificado sólo usa lo público
  begin
    v_mfa_pending := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'authenticated'
                     and not mycen_private.mfa_ok();
  exception when others then v_mfa_pending := false; end;
  if v_mfa_pending and not (v_path like '/rpc/%' and mycen_mfa_pending_rpc_allowed(substr(v_path, 6))) then
    raise exception 'MFA_REQUIRED' using errcode = '42501', hint = 'Verify the second factor (aal2) first';
  end if;

  begin
    if v_path not like '/rpc/%' then return; end if;
    v_rpc := substr(v_path, 6);
    v_flag := mycen_rpc_flag(v_rpc);
    if v_flag is not null then v_paused := not mycen_flag_on(v_flag); end if;
  exception when others then v_paused := false; end;
  if v_paused then raise exception 'FEATURE_PAUSED' using errcode = 'PT503'; end if;
  begin
    v_limit := mycen_rate_limit_for(v_rpc);
    if v_limit is null then return; end if;
    v_ip := mycen_client_ip();
    if v_ip is null then return; end if;
    insert into mycen_rate_hits (bucket, subject, window_start, hits)
    values (v_rpc, encode(sha256(convert_to(v_ip || '|mycen-rate|' || current_database(), 'UTF8')), 'hex'), date_trunc('day', now()), 1)
    on conflict (bucket, subject, window_start) do update set hits = mycen_rate_hits.hits + 1
    returning hits into v_hits;
    v_blocked := v_hits > v_limit;
  exception when others then return; end;
  if v_blocked then raise exception 'RATE_LIMITED' using errcode = 'PT429'; end if;
end $$;
revoke all on function public.mycen_pre_request() from public;
grant execute on function public.mycen_pre_request() to anon, authenticated;

notify pgrst, 'reload schema';
