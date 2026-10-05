-- =============================================================================
-- Lanzamiento L2 — Sitemap para buscadores
--
--   public_sitemap(): las direcciones que Google puede indexar, con su fecha de última publicación.
--   Sólo lo público de verdad: Spaces publicados con visibilidad "public" (no "no listados" ni privados),
--   sin suspensión (propia o del principal), y proyectos publicados y públicos de una identidad cuyo
--   principal también es público. La usa api/sitemap.ts (Vercel) para armar /sitemap.xml.
--
-- Requiere 20261012000001_identity_spaces.sql. Idempotente. Vuelta atrás: docs/lanzamiento/sql/l2_rollback.sql
-- =============================================================================

begin;

create or replace function public.public_sitemap(p_offset integer default 0, p_limit integer default 50000)
returns table (path text, lastmod timestamptz)
language sql stable security definer set search_path = public as $$
  with spaces as (
    select '/' || mycen_space_handle(p.id) as path,
           coalesce(pv.created_at, p.published_at, p.updated_at) as lastmod
    from profiles p
    left join profile_versions pv on pv.id = p.published_version_id
    where p.status = 'published' and p.visibility = 'public' and not mycen_space_suspended(p.id)
      and (p.username is not null or p.space_slug is not null)
  ),
  projects as (
    select '/' || r.username || '/projects/' || o.slug as path,
           coalesce(o.published_at, o.updated_at) as lastmod
    from content_objects o
    join profiles r on r.identity_id = o.identity_id and r.is_primary and r.username is not null
    where o.type = 'project' and o.status = 'published' and o.visibility = 'public' and o.published_snapshot is not null
      and r.status = 'published' and r.visibility = 'public' and r.suspended_at is null
  )
  select path, lastmod from (select * from spaces union all select * from projects) t
  where path is not null
  order by lastmod desc, path
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 50000), 1), 50000);
$$;

revoke all on function public.public_sitemap(integer, integer) from public;
grant execute on function public.public_sitemap(integer, integer) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
