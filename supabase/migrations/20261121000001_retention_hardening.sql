-- =============================================================================
-- Hardening (SOC 2 / ISO 27001 / ISO 27701). Idempotente. Detalle en docs/seguridad/sgsi/.
--
--   1. Retención automática (ISO 27701 7.4.7, ISO 27001 A.8.10, SOC 2 P4.2): mycen_purge_expired() borra lo vencido
--      según docs/seguridad/sgsi/05-retencion.md y la política de privacidad:
--        · product_events (uso de la app)              25 meses
--        · user_activity_days ("usé Mycen hoy")         25 meses
--        · app_error_hits (personas afectadas)          90 días
--        · admin_audit_log (actividad del equipo)       3 años
--      Corre todos los días a las 04:17 UTC con pg_cron (si la extensión está prendida; si no, queda la función).
--   2. Bitácora del equipo inalterable (ISO 27001 A.8.15, SOC 2 CC7.2): admin_audit_log no se puede modificar y sólo
--      la limpieza de retención borra filas vencidas (ni siquiera un super-admin desde la app o el SQL Editor sin
--      pasar por la función).
-- =============================================================================

begin;

-- ─── 2. Bitácora inalterable ─────────────────────────────────────────────────
create or replace function public.mycen_audit_log_guard()
returns trigger language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'AUDIT_LOG_IMMUTABLE' using errcode = '42501';
  end if;
  -- DELETE: sólo la limpieza de retención y sólo filas vencidas
  if coalesce(current_setting('mycen.retention_purge', true), '') = 'on' and old.created_at < now() - interval '3 years' then
    return old;
  end if;
  raise exception 'AUDIT_LOG_IMMUTABLE' using errcode = '42501';
end $$;

revoke all on function public.mycen_audit_log_guard() from public, anon, authenticated;

do $$
begin
  if to_regclass('public.admin_audit_log') is not null then
    drop trigger if exists admin_audit_log_guard on public.admin_audit_log;
    create trigger admin_audit_log_guard before update or delete on public.admin_audit_log
      for each row execute function public.mycen_audit_log_guard();
  end if;
end $$;

-- ─── 1. Retención ────────────────────────────────────────────────────────────
create or replace function public.mycen_purge_expired()
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  n_events   bigint := 0;
  n_activity bigint := 0;
  n_hits     bigint := 0;
  n_audit    bigint := 0;
begin
  if to_regclass('public.product_events') is not null then
    delete from product_events where created_at < now() - interval '25 months';
    get diagnostics n_events = row_count;
  end if;
  if to_regclass('public.user_activity_days') is not null then
    delete from user_activity_days where day < (current_date - interval '25 months')::date;
    get diagnostics n_activity = row_count;
  end if;
  if to_regclass('public.app_error_hits') is not null then
    delete from app_error_hits where day < current_date - 90;
    get diagnostics n_hits = row_count;
  end if;
  if to_regclass('public.admin_audit_log') is not null then
    perform set_config('mycen.retention_purge', 'on', true);
    delete from admin_audit_log where created_at < now() - interval '3 years';
    get diagnostics n_audit = row_count;
    perform set_config('mycen.retention_purge', '', true);
  end if;
  return jsonb_build_object('product_events', n_events, 'user_activity_days', n_activity,
    'app_error_hits', n_hits, 'admin_audit_log', n_audit, 'at', now());
end $$;

revoke all on function public.mycen_purge_expired() from public, anon, authenticated;

-- Todos los días a las 04:17 UTC (si pg_cron está prendido en el proyecto)
do $$
begin
  if to_regnamespace('cron') is not null and to_regproc('cron.schedule') is not null then
    begin
      perform cron.unschedule('mycen-purge-expired');
    exception when others then null;
    end;
    perform cron.schedule('mycen-purge-expired', '17 4 * * *', 'select public.mycen_purge_expired()');
  end if;
exception when others then
  raise notice 'pg_cron no disponible: correr select public.mycen_purge_expired() a mano o prender la extensión';
end $$;

commit;

notify pgrst, 'reload schema';
