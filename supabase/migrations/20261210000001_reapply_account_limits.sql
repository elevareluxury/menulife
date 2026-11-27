-- Vuelve a aplicar los topes por cuenta (20261205000001) con la lista al día de 20261207000001
-- (admin_refresh_snapshot), porque el chequeo de producción (docs/lanzamiento/sql/check_migraciones.sql) mostró que
-- mycen_account_hit no estaba: correr 20261205 suelto ahora habría sacado admin_refresh_snapshot de la lista.
-- Y cierra verify_staff_pin (login del mozo de Business) también para cuentas con sesión: Business está cerrado y
-- Supabase Advisors la marcaba ejecutable por `authenticated` (20261123000001 ya la cerró para anon).
-- Idempotente. Se aplica en Supabase → SQL Editor. Tests: tests/db/reapply_account_limits.test.sql.


create or replace function public.mycen_account_rate_limit_for(p_rpc text)
returns integer language sql immutable set search_path = public, extensions, pg_temp as $$
  select case p_rpc
    when 'publish_space'         then 60
    when 'restore_space_version' then 30
    when 'duplicate_space'       then 20
    when 'publish_project'       then 60
    when 'record_referral'       then 10
    when 'admin_refresh_snapshot' then 60
  end;
$$;
revoke all on function public.mycen_account_rate_limit_for(text) from public, anon, authenticated;

-- Tope general de escrituras por cuenta y hora
create or replace function public.mycen_account_write_limit()
returns integer language sql immutable set search_path = public, extensions, pg_temp as $$ select 6000 $$;
revoke all on function public.mycen_account_write_limit() from public, anon, authenticated;

-- Suma un pedido de la cuenta en ese balde y dice si se pasó del tope
create or replace function public.mycen_account_hit(p_bucket text, p_uid uuid, p_limit integer)
returns boolean language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare v_hits integer;
begin
  insert into mycen_rate_hits (bucket, subject, window_start, hits)
  values (p_bucket, encode(sha256(convert_to(p_uid::text || '|mycen-account|' || current_database(), 'UTF8')), 'hex'),
          date_trunc('hour', now()), 1)
  on conflict (bucket, subject, window_start) do update set hits = mycen_rate_hits.hits + 1
  returning hits into v_hits;
  return v_hits > p_limit;
end $$;
revoke all on function public.mycen_account_hit(text, uuid, integer) from public, anon, authenticated;

-- Igual a 20261129000001 + topes por cuenta (antes del tope por IP)
create or replace function public.mycen_pre_request()
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_path text; v_rpc text; v_flag text; v_paused boolean := false; v_limit integer; v_ip text; v_hits integer;
        v_blocked boolean := false; v_mfa_pending boolean := false; v_uid uuid; v_method text;
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

  -- Topes por cuenta: escrituras en general y acciones pesadas
  begin
    v_uid := auth.uid();
    if v_uid is not null then
      v_method := upper(coalesce(current_setting('request.method', true), ''));
      if v_method in ('POST', 'PATCH', 'PUT', 'DELETE') then
        v_blocked := mycen_account_hit('acct:writes', v_uid, mycen_account_write_limit());
      end if;
      if not v_blocked and v_path like '/rpc/%' then
        v_limit := mycen_account_rate_limit_for(substr(v_path, 6));
        if v_limit is not null then
          v_blocked := mycen_account_hit('acct:' || substr(v_path, 6), v_uid, v_limit);
        end if;
      end if;
    end if;
  exception when others then v_blocked := false; end;
  if v_blocked then raise exception 'RATE_LIMITED' using errcode = 'PT429'; end if;

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

-- Login del mozo (Business cerrado): nadie de la app la ejecuta
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'verify_staff_pin'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

notify pgrst, 'reload schema';
