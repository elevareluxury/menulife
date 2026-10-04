-- =============================================================================
-- Lanzamiento L5 — Registro de errores propio (sin proveedores externos)
--
--   app_errors       un renglón por error distinto (huella = zona + mensaje + primera línea del stack):
--                    cuántas veces pasó, cuándo por primera y última vez, dónde, en qué versión y navegador.
--   app_error_hits   visitas afectadas por día con un hash anónimo diario (como la analítica: sin IP ni
--                    user-agent guardados), para contar "personas afectadas" sin saber quiénes son.
--   report_client_error(...)   la llama la app (también sin sesión) cuando algo falla. Sin bots, con topes.
--   admin_list_errors / admin_set_error_status   sólo super-admins (pantalla /super-admin/errores).
--   Si un error resuelto vuelve a pasar, se reabre solo.
--
-- Requiere 20261011000001_identity_moderation.sql (mycen_assert_admin, mycen_private.secrets).
-- Idempotente. Vuelta atrás: docs/lanzamiento/sql/l5_rollback.sql
-- =============================================================================

begin;

create table if not exists public.app_errors (
  id          uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  area        text not null default 'other'
              check (area in ('landing', 'auth', 'profile', 'studio', 'life', 'business', 'admin', 'other')),
  message     text not null,
  stack       text,
  path        text,
  release     text,
  browser     text,
  count       integer not null default 1,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  status      text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  note        text,
  resolved_at timestamptz,
  reopened    boolean not null default false
);
create index if not exists app_errors_status_last_idx on public.app_errors (status, last_seen desc);

create table if not exists public.app_error_hits (
  error_id uuid not null references public.app_errors(id) on delete cascade,
  hash     text not null,
  day      date not null default current_date,
  primary key (error_id, hash, day)
);
create index if not exists app_error_hits_day_idx on public.app_error_hits (day);

-- Nadie lee ni escribe directo: todo pasa por las funciones de abajo
alter table public.app_errors enable row level security;
alter table public.app_error_hits enable row level security;
revoke all on public.app_errors from anon, authenticated;
revoke all on public.app_error_hits from anon, authenticated;

-- ── Reportar un error (la app) ──────────────────────────────────────────────
create or replace function public.report_client_error(
  p_message text, p_stack text default null, p_area text default 'other', p_path text default null,
  p_release text default null, p_browser text default null)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v_headers json;
  v_ua text;
  v_ip text;
  v_salt text;
  v_hash text;
  v_area text := case when p_area in ('landing', 'auth', 'profile', 'studio', 'life', 'business', 'admin') then p_area else 'other' end;
  v_message text := left(btrim(coalesce(p_message, '')), 500);
  v_stack text := left(p_stack, 4000);
  v_top text;
  v_fp text;
  v_id uuid;
  v_status text;
begin
  if v_message = '' then return 'invalid'; end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ua := coalesce(v_headers ->> 'user-agent', '');
  v_ip := coalesce(btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), v_headers ->> 'x-real-ip', '');
  if v_ua ~* '(bot|crawl|spider|slurp|headless|lighthouse|curl|wget|python-requests)' then
    return 'ok';   -- los errores de robots no se guardan
  end if;

  select value into v_salt from mycen_private.secrets where key = 'visitor_salt';
  v_hash := left(encode(sha256(convert_to(
              v_ip || '|' || v_ua || '|' || coalesce(auth.uid()::text, '') || '|' || current_date::text || '|' || coalesce(v_salt, ''),
              'UTF8')), 'hex'), 32);

  -- Tope por visitante: 50 errores por día (una pestaña en bucle no llena la tabla)
  if (select count(*) from app_error_hits where hash = v_hash and day = current_date) >= 50 then
    return 'limited';
  end if;

  -- Huella: zona + mensaje sin números + primer frame del stack ("at …" en Chrome, "…@…" en Firefox/Safari)
  -- sin posiciones, sin el hash del archivo y sin query: el mismo error en otra versión se agrupa
  v_top := substring(coalesce(v_stack, '') from '(?:^|\n)\s*(at [^\n]+|[^\n]*@[^\n]+)');
  v_top := regexp_replace(coalesce(v_top, ''), '(:\d+)+|-[A-Za-z0-9_]{8}\.js|\?[^)\s]*', '', 'g');
  v_fp := md5(v_area || '|' || regexp_replace(v_message, '\d+', '#', 'g') || '|' || v_top);

  select id, status into v_id, v_status from app_errors where fingerprint = v_fp;
  if v_id is null then
    -- Tope global de errores nuevos por hora
    if (select count(*) from app_errors where first_seen > now() - interval '1 hour') >= 300 then
      return 'limited';
    end if;
    insert into app_errors (fingerprint, area, message, stack, path, release, browser)
    values (v_fp, v_area, v_message, v_stack, left(p_path, 300), left(p_release, 40), left(p_browser, 60))
    on conflict (fingerprint) do update set count = app_errors.count + 1, last_seen = now()
    returning id into v_id;
  else
    update app_errors set
      count = count + 1, last_seen = now(),
      path = coalesce(left(p_path, 300), path), release = coalesce(left(p_release, 40), release),
      browser = coalesce(left(p_browser, 60), browser),
      -- Un error resuelto que vuelve a pasar se reabre (los ignorados quedan ignorados)
      status = case when status = 'resolved' then 'open' else status end,
      reopened = reopened or status = 'resolved',
      resolved_at = case when status = 'resolved' then null else resolved_at end
    where id = v_id;
  end if;

  insert into app_error_hits (error_id, hash) values (v_id, v_hash) on conflict do nothing;
  return 'ok';
end $$;

revoke all on function public.report_client_error(text, text, text, text, text, text) from public;
grant execute on function public.report_client_error(text, text, text, text, text, text) to anon, authenticated;

-- ── Super-admin ─────────────────────────────────────────────────────────────
-- p_status: open | resolved | ignored | all. Devuelve hasta 200, los más recientes primero.
create or replace function public.admin_list_errors(p_status text default 'open')
returns jsonb language plpgsql volatile security definer set search_path = public as $$
begin
  perform mycen_assert_admin();
  -- Retención: las visitas afectadas se guardan 90 días
  delete from app_error_hits where day < current_date - 90;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', e.id, 'area', e.area, 'message', e.message, 'stack', e.stack, 'path', e.path,
             'release', e.release, 'browser', e.browser, 'count', e.count, 'first_seen', e.first_seen,
             'last_seen', e.last_seen, 'status', e.status, 'note', e.note, 'resolved_at', e.resolved_at,
             'reopened', e.reopened,
             'affected', (select count(*) from app_error_hits h where h.error_id = e.id),
             'affected_today', (select count(*) from app_error_hits h where h.error_id = e.id and h.day = current_date))
           order by e.last_seen desc)
    from (
      select * from app_errors
      where coalesce(p_status, 'open') = 'all' or status = coalesce(p_status, 'open')
      order by last_seen desc
      limit 200
    ) e
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_set_error_status(p_error_id uuid, p_status text, p_note text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  perform mycen_assert_admin();
  if p_status not in ('open', 'resolved', 'ignored') then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;
  update app_errors set
    status = p_status,
    note = coalesce(nullif(btrim(left(p_note, 300)), ''), note),
    resolved_at = case when p_status = 'open' then null else now() end,
    reopened = case when p_status = 'open' then reopened else false end
  where id = p_error_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
end $$;

-- Resumen para el Overview: errores abiertos y personas afectadas hoy
create or replace function public.admin_error_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mycen_assert_admin();
  return jsonb_build_object(
    'open', (select count(*) from app_errors where status = 'open'),
    'new_today', (select count(*) from app_errors where first_seen::date = current_date),
    'affected_today', (select count(distinct hash) from app_error_hits where day = current_date));
end $$;

revoke all on function public.admin_list_errors(text) from public;
revoke all on function public.admin_set_error_status(uuid, text, text) from public;
revoke all on function public.admin_error_summary() from public;
grant execute on function public.admin_list_errors(text) to authenticated;
grant execute on function public.admin_set_error_status(uuid, text, text) to authenticated;
grant execute on function public.admin_error_summary() to authenticated;

commit;

notify pgrst, 'reload schema';
