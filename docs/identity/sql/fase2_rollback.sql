-- Vuelta atrás de la Fase 2. Deja la base como estaba antes de 20261007000001_identity_spaces_expand.sql.
-- Seguro mientras la app no use las tablas nuevas (antes de la Fase 3). No toca perfiles, módulos ni eventos.
-- OJO: si ya hay perfiles en 'archived' o con tipos nuevos, el paso 4 falla a propósito: revisar antes.

begin;

-- 1. Triggers y funciones nuevas
drop trigger if exists profiles_identity on public.profiles;
drop trigger if exists profiles_primary_space on public.profiles;
drop function if exists public.mycen_profile_identity();
drop function if exists public.mycen_profile_primary_space();
drop function if exists public.mycen_space_snapshot(uuid);

-- 2. Columnas nuevas
alter table public.profile_modules drop column if exists content_object_id;
alter table public.profiles drop column if exists published_version_id;
alter table public.profiles drop column if exists identity_id;
alter table public.profiles drop column if exists visibility;

-- 3. Tablas nuevas
drop table if exists public.content_blocks;
drop table if exists public.content_objects;
drop table if exists public.profile_versions;
drop table if exists public.identities;

-- 4. Checks originales
alter table public.profiles drop constraint if exists profiles_purpose_check;
alter table public.profiles add constraint profiles_purpose_check
  check (purpose in ('personal', 'professional', 'creator', 'business', 'event'));
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('draft', 'published', 'unpublished'));

commit;

notify pgrst, 'reload schema';
