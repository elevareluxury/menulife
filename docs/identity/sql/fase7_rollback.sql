-- Vuelta atrás de la Fase 7 (20261010000001_identity_links_connect.sql).
-- Borra los módulos link_group, devuelve mycen_resolve_modules a la Fase 5 (sin horarios: los módulos
-- programados se ven siempre) y quita las funciones nuevas. Los eventos no se tocan.
begin;

delete from public.profile_modules where type = 'link_group';
alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards','project','portfolio'
));

-- Agrega `projects` a los módulos que muestran proyectos
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
  from jsonb_array_elements(coalesce(p_modules, '[]'::jsonb)) with ordinality as t(m, ord);
$$;

revoke all on function public.mycen_resolve_modules(uuid, text, jsonb) from public, anon, authenticated;

drop function if exists public.profile_traffic_sources(uuid, integer);
drop function if exists public.mycen_module_live(jsonb);
drop function if exists public.mycen_try_timestamptz(text);

commit;

notify pgrst, 'reload schema';
