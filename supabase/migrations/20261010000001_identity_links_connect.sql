-- =============================================================================
-- Mycen Identity · Fase 7 — Links avanzados y Connect
--
--   · Módulo nuevo 'link_group' (varios links bajo un título).
--   · Programar módulos: config.show_from / config.show_until (ISO 8601). La RPC pública los filtra
--     al responder (no en la versión publicada), así que un módulo aparece y desaparece solo, sin
--     volver a publicar, y nunca se envía antes de tiempo.
--   · Analítica: profile_traffic_sources() agrupa las visitas por fuente (?src=…) y sitio de origen.
--
-- Requiere 20261009000001_identity_projects.sql. Idempotente.
-- Vuelta atrás: docs/identity/sql/fase7_rollback.sql
-- =============================================================================

begin;

-- ─── 1. Tipo de módulo nuevo ─────────────────────────────────────────────────

alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards','project','portfolio','link_group'
));

-- ─── 2. Módulos programados ──────────────────────────────────────────────────

-- Fecha inválida → null (se ignora en vez de romper la página)
create or replace function public.mycen_try_timestamptz(p text)
returns timestamptz language plpgsql stable as $$
begin
  return nullif(btrim(coalesce(p, '')), '')::timestamptz;
exception when others then
  return null;
end $$;

-- ¿Se muestra ahora? Sin fechas = siempre
create or replace function public.mycen_module_live(p_config jsonb)
returns boolean language sql stable as $$
  select coalesce(mycen_try_timestamptz(p_config ->> 'show_from') <= now(), true)
     and coalesce(mycen_try_timestamptz(p_config ->> 'show_until') > now(), true);
$$;

-- Igual que en la Fase 5, sin los módulos que no están en su horario
create or replace function public.mycen_resolve_modules(p_identity_id uuid, p_username text, p_modules jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
           case m ->> 'type'
             when 'project' then m || jsonb_build_object('projects',
               mycen_project_cards(p_identity_id, p_username, jsonb_build_array(m -> 'content' ->> 'project_id')))
             when 'portfolio' then m || jsonb_build_object('projects',
               mycen_project_cards(p_identity_id, p_username,
                 case when jsonb_typeof(m -> 'content' -> 'project_ids') = 'array'
                       and jsonb_array_length(m -> 'content' -> 'project_ids') > 0
                      then m -> 'content' -> 'project_ids' end))
             else m
           end order by ord), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_modules, '[]'::jsonb)) with ordinality as t(m, ord)
  where mycen_module_live(m -> 'config');
$$;

revoke all on function public.mycen_resolve_modules(uuid, text, jsonb) from public, anon, authenticated;

-- ─── 3. Fuentes de tráfico ───────────────────────────────────────────────────

-- Visitas de los últimos p_days días agrupadas por fuente (?src=qr|ig|wa…) y sitio de origen.
-- Sólo el dueño. Studio traduce cada grupo a un nombre (Instagram, QR, Directo…).
create or replace function public.profile_traffic_sources(p_profile_id uuid, p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = p_profile_id and user_id = auth.uid()) then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('source', g.source, 'referrer_host', g.referrer_host,
                                        'visits', g.visits, 'visitors', g.visitors) order by g.visits desc)
    from (
      select e.source, e.referrer_host, count(*) as visits, count(distinct e.visitor_hash) as visitors
      from profile_events e
      where e.profile_id = p_profile_id and e.event_type = 'view'
        and e.created_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 366))
      group by e.source, e.referrer_host
      order by count(*) desc
      limit 50
    ) g
  ), '[]'::jsonb);
end $$;

revoke all on function public.profile_traffic_sources(uuid, integer) from public, anon;
grant execute on function public.profile_traffic_sources(uuid, integer) to authenticated;

commit;

notify pgrst, 'reload schema';
