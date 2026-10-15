-- Clics por botón en Studio → Analítica. Pegar entero en Supabase → SQL Editor y tocar Run. Se puede correr más de una vez.

-- =============================================================================
-- Analítica — "Lo que más tocan": toques por botón en Studio → Analítica.
--
--   · profile_events.item_key: qué botón dentro del módulo se tocó (un link de un grupo, una red, un medio de
--     "Apoyame", una plataforma de "Escuchá en", WhatsApp/teléfono/email de Contacto, la reserva…). Es una clave
--     corta que arma la página pública con el contenido del módulo (ej. 'spotify', 'whatsapp', 'u:1k3x9a' = hash
--     del link). Nada del visitante: sólo módulo + clave (≤ 64, letras, números y : _ . -). Una clave inválida se
--     descarta (el evento cuenta igual, sin clave).
--   · track_profile_event suma p_item_key (opcional, al final: las llamadas viejas siguen andando). Mismas reglas de
--     siempre: sin bots, sin el dueño, sólo perfiles publicados, hash diario anónimo, 30 min de deduplicación (ahora
--     también por clave: tocar dos links distintos del mismo grupo cuenta los dos) y 300 eventos por visitante y día.
--   · profile_click_stats(p_profile_id, p_days): sólo el dueño. Visitas del período y toques agrupados por evento,
--     módulo y clave (module_click, primary_action_click, vcard_download). Studio pone los nombres con el contenido
--     actual de cada módulo.
--
-- Idempotente.
-- Vuelta atrás: drop function public.profile_click_stats(uuid, integer);
--               drop function public.track_profile_event(uuid, text, uuid, text, text, text);
--               (y volver a crear la de 5 parámetros de 20261001000001); alter table profile_events drop column item_key;
-- =============================================================================

begin;

alter table public.profile_events add column if not exists item_key text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profile_events_item_key_check') then
    alter table public.profile_events add constraint profile_events_item_key_check
      check (item_key is null or item_key ~ '^[A-Za-z0-9:_.-]{1,64}$');
  end if;
end $$;

-- La de 5 parámetros se reemplaza por una con p_item_key opcional (PostgREST elige por nombre de argumentos)
drop function if exists public.track_profile_event(uuid, text, uuid, text, text);

create or replace function public.track_profile_event(
  p_profile_id uuid,
  p_event_type text,
  p_module_id  uuid default null,
  p_referrer   text default null,
  p_source     text default null,
  p_item_key   text default null
) returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_headers json;
  v_ua      text;
  v_ip      text;
  v_salt    text;
  v_hash    text;
  v_owner   uuid;
begin
  if p_event_type not in ('view','module_click','primary_action_click','share','copy_link','qr_download','vcard_download') then
    return;
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ua := coalesce(v_headers ->> 'user-agent', '');
  v_ip := coalesce(btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), v_headers ->> 'x-real-ip', '');

  -- Bots y previsualizadores de links
  if v_ua ~* '(bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|headless|lighthouse|pingdom|curl|wget|python-requests)' then
    return;
  end if;

  select user_id into v_owner from profiles where id = p_profile_id and status = 'published';
  if v_owner is null then return; end if;
  if auth.uid() is not distinct from v_owner then return; end if;  -- no contar al dueño

  if p_module_id is not null
     and not exists (select 1 from profile_modules where id = p_module_id and profile_id = p_profile_id) then
    p_module_id := null;
  end if;

  -- Clave del botón: sólo para toques y con el formato acordado; si no, el evento cuenta sin clave
  if p_event_type = 'view' or p_item_key is null or p_item_key !~ '^[A-Za-z0-9:_.-]{1,64}$' then
    p_item_key := null;
  end if;

  select value into v_salt from mycen_private.secrets where key = 'visitor_salt';
  v_hash := left(encode(sha256(convert_to(
              v_ip || '|' || v_ua || '|' || p_profile_id::text || '|' || current_date::text || '|' || coalesce(v_salt, ''),
              'UTF8')), 'hex'), 32);

  -- Deduplicación: mismo visitante + evento + módulo + botón en 30 minutos
  if exists (select 1 from profile_events e
             where e.profile_id = p_profile_id and e.visitor_hash = v_hash
               and e.event_type = p_event_type and e.module_id is not distinct from p_module_id
               and e.item_key is not distinct from p_item_key
               and e.created_at > now() - interval '30 minutes') then
    return;
  end if;

  -- Límite anti-abuso: 300 eventos por visitante por día y perfil
  if (select count(*) from profile_events e
      where e.profile_id = p_profile_id and e.visitor_hash = v_hash
        and e.created_at > now() - interval '1 day') >= 300 then
    return;
  end if;

  insert into profile_events (profile_id, module_id, event_type, visitor_hash, referrer_host, source, item_key)
  values (
    p_profile_id, p_module_id, p_event_type, v_hash,
    left(lower(substring(coalesce(p_referrer, '') from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/:?#]+)')), 120),
    left(nullif(btrim(p_source), ''), 32),
    p_item_key
  );
end $$;

revoke all on function public.track_profile_event(uuid, text, uuid, text, text, text) from public;
grant execute on function public.track_profile_event(uuid, text, uuid, text, text, text) to anon, authenticated;

-- Toques del período agrupados por botón. Sólo el dueño del Space.
create or replace function public.profile_click_stats(p_profile_id uuid, p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_since timestamptz;
begin
  if auth.uid() is null or not exists (select 1 from profiles where id = p_profile_id and user_id = auth.uid()) then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  v_since := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 366));
  return jsonb_build_object(
    'visits', (select count(*) from profile_events e
               where e.profile_id = p_profile_id and e.event_type = 'view' and e.created_at >= v_since),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('event_type', g.event_type, 'module_id', g.module_id, 'item_key', g.item_key,
                                          'taps', g.taps, 'visitors', g.visitors) order by g.taps desc)
      from (
        select e.event_type, e.module_id, e.item_key, count(*) as taps, count(distinct e.visitor_hash) as visitors
        from profile_events e
        where e.profile_id = p_profile_id
          and e.event_type in ('module_click', 'primary_action_click', 'vcard_download')
          and e.created_at >= v_since
        group by e.event_type, e.module_id, e.item_key
        order by count(*) desc
        limit 300
      ) g
    ), '[]'::jsonb)
  );
end $$;

revoke all on function public.profile_click_stats(uuid, integer) from public, anon;
grant execute on function public.profile_click_stats(uuid, integer) to authenticated;

commit;
