-- Verificación de la Fase 2 (después de correr 20261007000001_identity_spaces_expand.sql).
-- Solo lectura. Todas las filas de "chequeo" tienen que dar ok = true.

select 'cada perfil tiene identidad'                     as chequeo,
       count(*) filter (where identity_id is null) = 0  as ok
from public.profiles
union all
select 'una identidad por dueño de perfil',
       (select count(*) from public.identities) = (select count(distinct user_id) from public.profiles)
union all
select 'la identidad y el perfil son del mismo usuario',
       not exists (select 1 from public.profiles p join public.identities i on i.id = p.identity_id where i.user_id <> p.user_id)
union all
select 'cada identidad con perfil principal lo tiene marcado',
       not exists (select 1 from public.profiles p join public.identities i on i.id = p.identity_id
                   where p.is_primary and i.primary_space_id is distinct from p.id)
union all
select 'cada perfil publicado tiene su versión 1',
       not exists (select 1 from public.profiles p where p.status = 'published' and p.published_version_id is null)
union all
select 'la versión publicada es idéntica a lo que ve el visitante hoy',
       not exists (
         select 1 from public.profiles p
         join public.profile_versions v on v.id = p.published_version_id
         where (public.get_public_profile(p.username) - 'is_owner' - 'business' - 'status')
               is distinct from (v.snapshot - 'contact_card'))
union all
select 'las URLs siguen resolviendo (mismo username, mismo id)',
       not exists (select 1 from public.profiles p
                   where (public.get_public_profile(p.username) ->> 'id') is distinct from p.id::text
                     and p.status = 'published');

-- Conteos para comparar con los de antes (8 perfiles, 8 publicados, 13 módulos vivos)
select
  (select count(*) from public.identities)                                 as identidades,
  (select count(*) from public.profiles)                                   as perfiles,
  (select count(*) from public.profiles where status = 'published')        as publicados,
  (select count(*) from public.profile_versions)                           as versiones,
  (select count(*) from public.profile_modules where deleted_at is null)   as modulos_vivos;
