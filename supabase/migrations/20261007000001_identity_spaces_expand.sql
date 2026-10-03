-- =============================================================================
-- Mycen Identity · Fase 2 (Expand + Migrate) — diseño en docs/identity/05-modelo-objetivo.md
--
-- Aditiva e idempotente: se puede correr más de una vez. NO cambia lo que ve el visitante ni lo
-- que hace Studio: la página pública sigue leyendo las tablas vivas hasta la Fase 3 (Switch).
--
--   identities         raíz privada de cada cuenta (1 por usuario)
--   profiles           pasa a ser la tabla de Spaces (+ identity_id, visibility, archived, tipos nuevos)
--   profile_versions   versiones publicadas inmutables (snapshot) de cada Space
--   content_objects    contenido reutilizable de la identidad (empieza por proyectos)
--   content_blocks     bloques narrativos de un contenido (proyecto / case study)
--
-- Verificación: docs/identity/sql/fase2_verify.sql · Vuelta atrás: docs/identity/sql/fase2_rollback.sql
-- =============================================================================

begin;

-- ─── 1. Identity ─────────────────────────────────────────────────────────────

create table if not exists public.identities (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null unique references auth.users(id) on delete cascade,
  -- Space principal (el que conserva la URL raíz histórica)
  primary_space_id uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists identities_touch_updated_at on public.identities;
create trigger identities_touch_updated_at
  before update on public.identities
  for each row execute function public.mycen_touch_updated_at();

alter table public.identities enable row level security;

drop policy if exists identities_owner_select on public.identities;
create policy identities_owner_select on public.identities
  for select to authenticated using (user_id = auth.uid());

drop policy if exists identities_owner_update on public.identities;
create policy identities_owner_update on public.identities
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Se crea sola (trigger de profiles); el usuario no inserta ni borra identidades a mano
revoke all on public.identities from anon;
revoke insert, delete on public.identities from authenticated;

-- ─── 2. profiles = Space ─────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists identity_id uuid references public.identities(id) on delete cascade;

alter table public.profiles
  add column if not exists visibility text not null default 'public';
alter table public.profiles drop constraint if exists profiles_visibility_check;
alter table public.profiles add constraint profiles_visibility_check
  check (visibility in ('public', 'unlisted', 'private'));

-- Tipos de Space (P5: los negocios son 'business', equivalente a 'brand')
alter table public.profiles drop constraint if exists profiles_purpose_check;
alter table public.profiles add constraint profiles_purpose_check
  check (purpose in ('personal', 'professional', 'creator', 'artist', 'business', 'brand', 'project', 'event', 'custom'));

-- Estado archivado (reversible; no borra contenido)
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('draft', 'published', 'unpublished', 'archived'));

create index if not exists profiles_identity_id_idx on public.profiles (identity_id);

-- FK de la identidad a su Space principal (se agrega acá porque profiles ya existe)
alter table public.identities drop constraint if exists identities_primary_space_fkey;
alter table public.identities add constraint identities_primary_space_fkey
  foreign key (primary_space_id) references public.profiles(id) on delete set null;

-- Cada Space pertenece a la identidad de su dueño (se crea sola si no existe).
-- Cubre también los perfiles que crea el trigger de negocios (riesgo R5).
create or replace function public.mycen_profile_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.identity_id is null then
    insert into identities (user_id) values (new.user_id) on conflict (user_id) do nothing;
    select id into new.identity_id from identities where user_id = new.user_id;
  elsif not exists (select 1 from identities i where i.id = new.identity_id and i.user_id = new.user_id) then
    raise exception 'IDENTITY_MISMATCH' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_identity on public.profiles;
create trigger profiles_identity
  before insert or update of identity_id, user_id on public.profiles
  for each row execute function public.mycen_profile_identity();

create or replace function public.mycen_profile_primary_space()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_primary then
    update identities set primary_space_id = new.id
    where id = new.identity_id and primary_space_id is distinct from new.id;
  end if;
  return new;
end $$;

drop trigger if exists profiles_primary_space on public.profiles;
create trigger profiles_primary_space
  after insert or update of is_primary, identity_id on public.profiles
  for each row execute function public.mycen_profile_primary_space();

-- ─── 3. Versiones publicadas ─────────────────────────────────────────────────

create table if not exists public.profile_versions (
  id             uuid        primary key default gen_random_uuid(),
  profile_id     uuid        not null references public.profiles(id) on delete cascade,
  version_number integer     not null check (version_number > 0),
  -- Composición pública completa e inmutable (ver mycen_space_snapshot)
  snapshot       jsonb       not null check (pg_column_size(snapshot) < 524288),
  created_by     uuid        references auth.users(id) on delete set null,
  restored_from  uuid        references public.profile_versions(id) on delete set null,
  note           text        check (char_length(coalesce(note, '')) <= 120),
  created_at     timestamptz not null default now(),
  unique (profile_id, version_number)
);

alter table public.profiles
  add column if not exists published_version_id uuid references public.profile_versions(id) on delete set null;

alter table public.profile_versions enable row level security;

drop policy if exists profile_versions_owner_select on public.profile_versions;
create policy profile_versions_owner_select on public.profile_versions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

-- Las versiones sólo las escriben las RPC de publicar/restaurar (Fase 3): inmutables para el cliente
revoke all on public.profile_versions from anon;
revoke insert, update, delete on public.profile_versions from authenticated;

-- Snapshot = exactamente lo que hoy arma get_public_profile, sin lo que es "en vivo"
-- (status, is_owner, business). Incluye contact_card para que la vCard también salga de la
-- versión publicada; la RPC pública la quita antes de responder.
create or replace function public.mycen_space_snapshot(p_profile_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id',               v.id,
    'username',         v.username,
    'display_name',     v.display_name,
    'descriptor',       v.descriptor,
    'bio',              v.bio,
    'avatar_url',       v.avatar_url,
    'cover_url',        v.cover_url,
    'purpose',          v.purpose,
    'tags',             to_jsonb(v.tags),
    'theme',            v.theme,
    'primary_action',   v.primary_action,
    'default_locale',   v.default_locale,
    'translations',     v.translations,
    'has_contact_card', coalesce((v.contact_card ->> 'enabled')::boolean, false),
    'contact_card',     v.contact_card,
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'type', m.type, 'title', m.title,
               'content', m.content, 'config', m.config - 'legacy_source' - 'legacy_id' - 'legacy_click_count',
               'translations', m.translations)
             order by m.position, m.created_at)
      from profile_modules m
      where m.profile_id = v.id and m.visibility = 'active' and m.deleted_at is null
    ), '[]'::jsonb)
  )
  from profiles v where v.id = p_profile_id;
$$;

revoke all on function public.mycen_space_snapshot(uuid) from public, anon, authenticated;

-- ─── 4. Contenido reutilizable (empieza por proyectos) ───────────────────────

create table if not exists public.content_objects (
  id                 uuid        primary key default gen_random_uuid(),
  identity_id        uuid        not null references public.identities(id) on delete cascade,
  type               text        not null check (type in ('project')),
  title              text        not null check (char_length(title) between 1 and 160),
  slug               text        not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$'),
  summary            text        check (char_length(coalesce(summary, '')) <= 500),
  cover_url          text,
  data               jsonb       not null default '{}'::jsonb check (pg_column_size(data) < 32768),
  translations       jsonb       not null default '{}'::jsonb check (pg_column_size(translations) < 65536),
  status             text        not null default 'draft' check (status in ('draft', 'published', 'archived')),
  visibility         text        not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  -- P2: cada contenido se publica por su cuenta; los Spaces muestran su versión publicada
  published_snapshot jsonb       check (pg_column_size(published_snapshot) < 524288),
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (identity_id, type, slug)
);

create table if not exists public.content_blocks (
  id                uuid        primary key default gen_random_uuid(),
  content_object_id uuid        not null references public.content_objects(id) on delete cascade,
  type              text        not null check (type in (
                      'heading', 'paragraph', 'image', 'gallery', 'video', 'embed', 'quote', 'divider', 'credits')),
  position          integer     not null default 0,
  data              jsonb       not null default '{}'::jsonb check (pg_column_size(data) < 32768),
  translations      jsonb       not null default '{}'::jsonb check (pg_column_size(translations) < 65536),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists content_objects_identity_idx on public.content_objects (identity_id, type, status);
create index if not exists content_blocks_object_idx on public.content_blocks (content_object_id, position);

drop trigger if exists content_objects_touch_updated_at on public.content_objects;
create trigger content_objects_touch_updated_at
  before update on public.content_objects
  for each row execute function public.mycen_touch_updated_at();

drop trigger if exists content_blocks_touch_updated_at on public.content_blocks;
create trigger content_blocks_touch_updated_at
  before update on public.content_blocks
  for each row execute function public.mycen_touch_updated_at();

-- Un módulo puede mostrar un contenido sin copiarlo (proyecto destacado, portfolio…)
alter table public.profile_modules
  add column if not exists content_object_id uuid references public.content_objects(id) on delete set null;

alter table public.content_objects enable row level security;
alter table public.content_blocks  enable row level security;

drop policy if exists content_objects_owner_all on public.content_objects;
create policy content_objects_owner_all on public.content_objects
  for all to authenticated
  using (exists (select 1 from public.identities i where i.id = identity_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.identities i where i.id = identity_id and i.user_id = auth.uid()));

drop policy if exists content_blocks_owner_all on public.content_blocks;
create policy content_blocks_owner_all on public.content_blocks
  for all to authenticated
  using (exists (select 1 from public.content_objects o join public.identities i on i.id = o.identity_id
                 where o.id = content_object_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.content_objects o join public.identities i on i.id = o.identity_id
                      where o.id = content_object_id and i.user_id = auth.uid()));

-- El visitante nunca lee estas tablas: sólo RPC públicas (Fase 5)
revoke all on public.content_objects from anon;
revoke all on public.content_blocks  from anon;

-- ─── 5. Migrate: datos existentes ────────────────────────────────────────────

-- Una identidad por cada dueño de perfil
insert into public.identities (user_id)
select distinct user_id from public.profiles
on conflict (user_id) do nothing;

update public.profiles p set identity_id = i.id
from public.identities i
where i.user_id = p.user_id and p.identity_id is null;

update public.identities i set primary_space_id = p.id
from public.profiles p
where p.identity_id = i.id and p.is_primary and i.primary_space_id is distinct from p.id;

-- Versión 1 de cada Space publicado = lo que el visitante ve hoy
insert into public.profile_versions (profile_id, version_number, snapshot, note)
select p.id, 1, public.mycen_space_snapshot(p.id), 'Versión inicial (migración Identity)'
from public.profiles p
where p.status = 'published'
  and not exists (select 1 from public.profile_versions v where v.profile_id = p.id);

update public.profiles p set published_version_id = v.id
from public.profile_versions v
where v.profile_id = p.id and v.version_number = 1 and p.published_version_id is null;

commit;

notify pgrst, 'reload schema';
