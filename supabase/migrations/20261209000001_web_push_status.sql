-- =============================================================================
-- Avisos push (Life OS con la app cerrada): saber desde el panel si está todo conectado, y limpiar los dispositivos
-- que fallan siempre.
--
--   · life_push_runs (una sola fila, nadie la lee desde la app): la función life-reminders anota cada corrida con
--     life_push_record_run — si respondió, si le faltan las claves VAPID o están mal copiadas, el último error y la
--     clave PÚBLICA con la que firma (es pública; así el panel la compara con la de la web). Antes, sin claves, la
--     función respondía 200 "skipped" y el panel mostraba los recordatorios en verde aunque no saliera ningún aviso.
--   · life_push_note_failures: suma un fallo a los dispositivos que respondieron con error (que no sea 404/410, esos ya
--     se borran) y borra los que fallaron 10 veces seguidas. Antes `failures` no se usaba y una suscripción rota (por
--     ejemplo, de otra clave VAPID) se reintentaba para siempre. Un envío bueno lo vuelve a 0 (life-reminders).
--   · admin_push_status() (sólo super-admins con aal2): dispositivos suscritos, la última corrida, avisos entregados y
--     tocados en 24 h, si la tarea de pg_cron está programada y cuántas llamadas rechazó la función en la última hora
--     por la clave del cron (401). Lo muestra Super-admin → Estado → "Avisos push".
--
-- Idempotente. Se aplica en Supabase → SQL Editor. Tests: tests/db/web_push_status.test.sql.
-- Deshacer: drop function admin_push_status(), life_push_note_failures(uuid[]),
--           life_push_record_run(text, text, jsonb, text); drop table life_push_runs.
-- =============================================================================
begin;

create table if not exists public.life_push_runs (
  id          smallint primary key default 1 check (id = 1),
  last_run_at timestamptz,
  last_result text check (last_result in ('ok', 'no_keys', 'bad_keys', 'error')),
  last_ok_at  timestamptz,
  last_error  text check (last_error is null or length(last_error) <= 300),
  -- La clave pública VAPID (base64url, ~87 caracteres): no es secreta
  public_key  text check (public_key is null or public_key ~ '^[A-Za-z0-9_-]{20,200}$'),
  last_stats  jsonb
);
alter table public.life_push_runs enable row level security;
revoke all on public.life_push_runs from public, anon, authenticated;

-- La anota life-reminders (service role) en cada corrida que pasó la clave del cron
create or replace function public.life_push_record_run(p_result text, p_public_key text default null,
  p_stats jsonb default null, p_error text default null)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_key text;
begin
  if p_result is null or p_result not in ('ok', 'no_keys', 'bad_keys', 'error') then
    raise exception 'Resultado inválido' using errcode = '22023';
  end if;
  v_key := case when p_public_key ~ '^[A-Za-z0-9_-]{20,200}$' then p_public_key end;
  insert into public.life_push_runs as r (id, last_run_at, last_result, last_ok_at, last_error, public_key, last_stats)
  values (1, now(), p_result, case when p_result = 'ok' then now() end, left(p_error, 300), v_key,
          case when jsonb_typeof(p_stats) = 'object' then p_stats end)
  on conflict (id) do update set
    last_run_at = excluded.last_run_at,
    last_result = excluded.last_result,
    last_ok_at  = coalesce(excluded.last_ok_at, r.last_ok_at),
    last_error  = excluded.last_error,
    public_key  = case when p_result = 'no_keys' then null else coalesce(excluded.public_key, r.public_key) end,
    last_stats  = coalesce(excluded.last_stats, r.last_stats);
end $$;

-- Un fallo más para cada dispositivo; los que llegan a 10 seguidos se borran. Devuelve cuántos se borraron.
create or replace function public.life_push_note_failures(p_ids uuid[])
returns integer language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare n integer;
begin
  if p_ids is null or cardinality(p_ids) = 0 then return 0; end if;
  update public.life_push_subscriptions set failures = failures + 1 where id = any(p_ids[1:1000]);
  delete from public.life_push_subscriptions where id = any(p_ids[1:1000]) and failures >= 10;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.life_push_record_run(text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.life_push_note_failures(uuid[]) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.life_push_record_run(text, text, jsonb, text) to service_role;
    grant execute on function public.life_push_note_failures(uuid[]) to service_role;
  end if;
end $$;

-- Panel → Estado → "Avisos push"
create or replace function public.admin_push_status()
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v_cron jsonb;
  v_unauthorized integer;
  v_run  public.life_push_runs%rowtype;
begin
  perform mycen_assert_admin();
  select * into v_run from public.life_push_runs where id = 1;

  -- La tarea de pg_cron que llama a la función (por nombre o por la dirección que llama; el comando lleva la clave del
  -- cron, así que sólo se compara, nunca se devuelve)
  if to_regclass('cron.job') is not null then
    begin
      execute $q$
        select coalesce(jsonb_agg(jsonb_build_object('name', j.jobname, 'schedule', j.schedule, 'active', j.active)
                                  order by j.jobname), '[]'::jsonb)
        from cron.job j
        where j.jobname ilike '%remind%' or j.command like '%/functions/v1/life-reminders%'
      $q$ into v_cron;
    exception when others then
      v_cron := null;
    end;
  end if;

  -- Respuestas 401 de la función a las llamadas de la base (pg_net) en la última hora: la clave del cron no coincide
  if to_regclass('net._http_response') is not null then
    begin
      execute $q$
        select count(*)::integer from net._http_response
        where created > now() - interval '1 hour' and status_code = 401 and content like '%unauthorized%'
      $q$ into v_unauthorized;
    exception when others then
      v_unauthorized := null;
    end;
  end if;

  return jsonb_build_object(
    'checked_at', now(),
    'subscriptions', (select count(*) from public.life_push_subscriptions),
    'people', (select count(distinct user_id) from public.life_push_subscriptions),
    'failing', (select count(*) from public.life_push_subscriptions where failures > 0),
    'sent_7d', (select count(*) from public.life_push_subscriptions where last_sent_at > now() - interval '7 days'),
    'run', case when v_run.id is null then null else jsonb_build_object(
      'last_run_at', v_run.last_run_at, 'last_result', v_run.last_result, 'last_ok_at', v_run.last_ok_at,
      'last_error', v_run.last_error, 'public_key', v_run.public_key, 'stats', v_run.last_stats) end,
    'shown_24h', (select count(*) from public.product_events
                  where event = 'reminder_shown' and props->>'channel' = 'push' and created_at > now() - interval '24 hours'),
    'opened_24h', (select count(*) from public.product_events
                   where event = 'reminder_opened' and props->>'channel' = 'push' and created_at > now() - interval '24 hours'),
    'cron', v_cron,
    'unauthorized_1h', v_unauthorized
  );
end $$;
revoke all on function public.admin_push_status() from public, anon;
grant execute on function public.admin_push_status() to authenticated;

commit;
