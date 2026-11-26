-- Escala (etapa 4, millones de perfiles): sitemap en partes.
--   · Un sitemap admite 50.000 direcciones y la API de Supabase corta en "Max rows" (1000 por defecto) lo que devuelve
--     una RPC con filas: con public_sitemap, el sitemap dejaba afuera lo que pasaba de ese número.
--   · Ahora /sitemap.xml es un índice (api/sitemap.ts) que apunta a /sitemap-static.xml y a partes de hasta 5000
--     direcciones: /sitemap-p-<id>.xml (Spaces) y /sitemap-j-<id>.xml (proyectos). Cada parte empieza en un id y se lee
--     en orden de id (índice de la clave primaria), así una parte del medio cuesta lo mismo que la primera.
--   · public_sitemap_index() devuelve las partes (id de inicio y fecha más nueva) y public_sitemap_page(kind, from) las
--     direcciones de una parte. Las dos devuelven un solo jsonb (no filas): "Max rows" no las corta.
--   · Mismas reglas que public_sitemap (sigue para el panel): publicado, público, sin suspensión propia ni del principal
--     y con más de 7 días.
-- Idempotente. Se aplica en Supabase → SQL Editor. Tests: tests/db/sitemap_index.test.sql.

-- Tamaño de cada parte (≤ 50.000 por el protocolo; 5000 deja la respuesta en ~400 KB)
create or replace function public.mycen_sitemap_chunk()
returns integer language sql immutable set search_path = public, extensions, pg_temp as $$ select 5000 $$;
revoke all on function public.mycen_sitemap_chunk() from public, anon, authenticated;

-- Spaces que van al sitemap
create or replace function public.mycen_sitemap_space_ok(p profiles)
returns boolean language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select p.status = 'published' and p.visibility = 'public'
     and (p.username is not null or p.space_slug is not null)
     and p.created_at < now() - interval '7 days'
     and not mycen_space_suspended(p.id);
$$;
revoke all on function public.mycen_sitemap_space_ok(profiles) from public, anon, authenticated;

create or replace function public.public_sitemap_index()
returns jsonb language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with spaces as (
    select p.id, coalesce(pv.created_at, p.published_at, p.updated_at) as lastmod,
           row_number() over (order by p.id) - 1 as n
    from profiles p
    left join profile_versions pv on pv.id = p.published_version_id
    where mycen_sitemap_space_ok(p)
  ),
  projects as (
    select o.id, coalesce(o.published_at, o.updated_at) as lastmod,
           row_number() over (order by o.id) - 1 as n
    from content_objects o
    join profiles r on r.identity_id = o.identity_id and r.is_primary and r.username is not null
    where o.type = 'project' and o.status = 'published' and o.visibility = 'public' and o.published_snapshot is not null
      and r.status = 'published' and r.visibility = 'public' and r.suspended_at is null
      and r.created_at < now() - interval '7 days'
  ),
  parts as (
    select 'p' as kind, n / mycen_sitemap_chunk() as part,
           (array_agg(id order by id))[1] as from_id, max(lastmod) as lastmod
    from spaces group by 2
    union all
    select 'j', n / mycen_sitemap_chunk(), (array_agg(id order by id))[1], max(lastmod)
    from projects group by 2
  )
  select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'from', from_id, 'lastmod', lastmod) order by kind desc, part)
                  filter (where part < 24000), '[]'::jsonb)
  from parts;
$$;
revoke all on function public.public_sitemap_index() from public;
grant execute on function public.public_sitemap_index() to anon, authenticated;

create or replace function public.public_sitemap_page(p_kind text, p_from uuid)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare v jsonb;
begin
  if p_from is null then return '[]'::jsonb; end if;
  if p_kind = 'p' then
    select jsonb_agg(jsonb_build_object('path', t.path, 'lastmod', t.lastmod) order by t.id) into v
    from (
      select p.id, '/' || mycen_space_handle(p.id) as path, coalesce(pv.created_at, p.published_at, p.updated_at) as lastmod
      from profiles p
      left join profile_versions pv on pv.id = p.published_version_id
      where p.id >= p_from and mycen_sitemap_space_ok(p)
      order by p.id
      limit mycen_sitemap_chunk()
    ) t
    where t.path is not null;
  elsif p_kind = 'j' then
    select jsonb_agg(jsonb_build_object('path', t.path, 'lastmod', t.lastmod) order by t.id) into v
    from (
      select o.id, '/' || r.username || '/projects/' || o.slug as path, coalesce(o.published_at, o.updated_at) as lastmod
      from content_objects o
      join profiles r on r.identity_id = o.identity_id and r.is_primary and r.username is not null
      where o.id >= p_from
        and o.type = 'project' and o.status = 'published' and o.visibility = 'public' and o.published_snapshot is not null
        and r.status = 'published' and r.visibility = 'public' and r.suspended_at is null
        and r.created_at < now() - interval '7 days'
      order by o.id
      limit mycen_sitemap_chunk()
    ) t;
  end if;
  return coalesce(v, '[]'::jsonb);
end $$;
revoke all on function public.public_sitemap_page(text, uuid) from public;
grant execute on function public.public_sitemap_page(text, uuid) to anon, authenticated;

-- RPC públicas que puede usar una sesión que todavía no escribió el código de dos pasos (igual a 20261129000001 + las nuevas)
create or replace function public.mycen_mfa_pending_rpc_allowed(p_rpc text)
returns boolean language sql immutable set search_path = public, extensions, pg_temp as $$
  select coalesce(p_rpc, '') = any (array[
    'get_public_profile', 'get_public_project', 'get_profile_contact_card', 'track_profile_event', 'check_username',
    'report_profile', 'public_sitemap', 'report_client_error', 'submit_profile_message', 'submit_profile_collab',
    'track_product_event', 'subscribe_profile', 'get_site_flags', 'get_poll_results', 'vote_profile_poll',
    'life_calendar_feed', 'public_sitemap_index', 'public_sitemap_page'
  ]);
$$;
revoke all on function public.mycen_mfa_pending_rpc_allowed(text) from public, anon, authenticated;

notify pgrst, 'reload schema';
