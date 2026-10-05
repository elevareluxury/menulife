-- =============================================================================
-- MYCEN · Fase 0 · Paso 2 — Fundación de Mycen Profile
-- =============================================================================
-- Crea el modelo de identidad, separado de `restaurants`:
--
--   profiles                  identidad pública (/{username})
--   profile_modules           bloques del perfil (link, social, contact, …)
--   profile_username_history  usernames anteriores → redirección (QRs impresos)
--   reserved_usernames        rutas del sistema que nadie puede usar
--   profile_events            analítica anónima (sin IP ni user-agent crudos)
--   profile_stats_daily       vista agregada por día para Studio
--
-- RPCs públicas: get_public_profile, check_username, track_profile_event,
--                get_profile_contact_card
--
-- Es ADITIVA: no modifica ni borra nada del sistema actual (restaurants, hub_*).
-- Se puede correr más de una vez.
-- =============================================================================

begin;

-- ─── 0. Guardas ──────────────────────────────────────────────────────────────

do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'profiles')
     and not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'profiles' and column_name = 'username') then
    raise exception 'Ya existe una tabla public.profiles que no es de Mycen. No se aplicó nada: avisale a Claude.';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'restaurants' and column_name = 'owner_id') then
    raise exception 'restaurants.owner_id no existe. No se aplicó nada: avisale a Claude.';
  end if;
end $$;

-- Esquema privado: NO expuesto por la API de Supabase
create schema if not exists mycen_private;
revoke all on schema mycen_private from public;

create table if not exists mycen_private.secrets (
  key   text primary key,
  value text not null
);
insert into mycen_private.secrets (key, value)
values ('visitor_salt', encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')), 'hex'))
on conflict (key) do nothing;

-- ─── 1. Utilidades ───────────────────────────────────────────────────────────

create or replace function public.mycen_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── 2. Usernames reservados ─────────────────────────────────────────────────

create table if not exists public.reserved_usernames (
  username   text primary key,
  reason     text not null default 'system_route',
  created_at timestamptz not null default now()
);
alter table public.reserved_usernames enable row level security;
-- Sin políticas: solo se consulta a través de funciones SECURITY DEFINER.

insert into public.reserved_usernames (username, reason) values
  -- Rutas existentes de la app
  ('dashboard','route'),('login','route'),('logout','route'),('register','route'),('signup','route'),
  ('auth','route'),('forgot-password','route'),('reset-password','route'),('solicitar-acceso','route'),
  ('onboarding','route'),('life','route'),('portal','route'),('q','route'),('r','route'),
  ('kitchen','route'),('mozo','route'),('waiter','route'),('delivery','route'),
  ('super-admin','route'),('superadmin','route'),('catalogo','route'),('catalog','route'),
  -- Rutas de Mycen (actuales y futuras)
  ('studio','route'),('profile','route'),('profiles','route'),('exchange','route'),('analytics','route'),
  ('settings','route'),('business','route'),('hub','route'),('intelligence','route'),('explore','route'),
  ('pricing','route'),('precios','route'),('planes','route'),('about','route'),('acerca','route'),
  ('help','route'),('ayuda','route'),('support','route'),('soporte','route'),('contact','route'),
  ('contacto','route'),('terms','route'),('terminos','route'),('privacy','route'),('privacidad','route'),
  ('legal','route'),('blog','route'),('docs','route'),('status','route'),('jobs','route'),
  -- Técnicas
  ('api','technical'),('app','technical'),('www','technical'),('admin','technical'),('root','technical'),
  ('static','technical'),('assets','technical'),('public','technical'),('cdn','technical'),
  ('offline','technical'),('sw','technical'),('manifest','technical'),('favicon','technical'),
  ('robots','technical'),('sitemap','technical'),('og','technical'),('well-known','technical'),
  ('null','technical'),('undefined','technical'),
  -- Marca
  ('mycen','brand'),('menulife','brand'),('resilio','brand'),('official','brand'),('oficial','brand')
on conflict (username) do nothing;

-- ─── 3. profiles ─────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  -- Vínculo opcional con Mycen Business (un negocio TIENE un perfil)
  restaurant_id       uuid        unique references public.restaurants(id) on delete set null,
  username            text        not null,
  display_name        text        not null default '',
  descriptor          text,
  bio                 text,
  avatar_url          text,
  cover_url           text,
  purpose             text        check (purpose in ('personal','professional','creator','business','event')),
  status              text        not null default 'draft'
                                  check (status in ('draft','published','unpublished')),
  is_primary          boolean     not null default true,
  -- Apariencia dentro del sistema: {mode, accent, surface, title_font, ...}
  theme               jsonb       not null default '{}'::jsonb,
  -- Acción principal: {kind, label, url}
  primary_action      jsonb,
  -- Tarjeta de contacto (vCard): solo datos que el dueño autoriza explícitamente
  -- {enabled: bool, name, title, email, phone, whatsapp, website, ...}
  contact_card        jsonb       not null default '{"enabled": false}'::jsonb,
  -- Traducciones cacheadas: {"en": {"bio": "...", "descriptor": "...", "_hash": "..."}}
  default_locale      text        not null default 'es',
  translations        jsonb       not null default '{}'::jsonb,
  onboarding_step     integer     not null default 0,
  username_changed_at timestamptz,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint profiles_username_format
    check (username = lower(username) and username ~ '^[a-z0-9][a-z0-9_-]{0,62}$'),
  constraint profiles_text_lengths
    check (char_length(display_name) <= 80
       and char_length(coalesce(descriptor, '')) <= 120
       and char_length(coalesce(bio, '')) <= 1000),
  constraint profiles_jsonb_size
    check (pg_column_size(theme) < 4096
       and pg_column_size(contact_card) < 4096
       and pg_column_size(translations) < 65536)
);

create unique index if not exists profiles_username_key   on public.profiles (username);
create unique index if not exists profiles_one_primary_per_user on public.profiles (user_id) where is_primary;
create index        if not exists profiles_user_id_idx    on public.profiles (user_id);

-- Historial de usernames: los QRs viejos siguen funcionando tras un cambio
create table if not exists public.profile_username_history (
  old_username text        primary key,
  profile_id   uuid        not null references public.profiles(id) on delete cascade,
  changed_at   timestamptz not null default now()
);
alter table public.profile_username_history enable row level security;

-- Validación + normalización de username.
-- `mycen.legacy_import = on` permite importar slugs históricos que no cumplen
-- el formato estricto (sólo lo usa el backfill / trigger de negocios).
create or replace function public.mycen_validate_username()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_legacy boolean := coalesce(current_setting('mycen.legacy_import', true), '') = 'on';
begin
  new.username := lower(btrim(new.username));

  if tg_op = 'UPDATE' and new.username = old.username then
    return new;
  end if;

  if not v_legacy then
    -- 3 a 30 caracteres: letras, números y guiones; sin guiones al inicio/fin ni dobles
    if new.username !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' or new.username like '%--%' then
      raise exception 'USERNAME_INVALID' using errcode = '22023';
    end if;
    if exists (select 1 from reserved_usernames r where r.username = new.username) then
      raise exception 'USERNAME_RESERVED' using errcode = '22023';
    end if;
  end if;

  if exists (select 1 from profile_username_history h
             where h.old_username = new.username and h.profile_id <> new.id) then
    raise exception 'USERNAME_TAKEN' using errcode = '23505';
  end if;

  if tg_op = 'UPDATE' then
    insert into profile_username_history (old_username, profile_id)
    values (old.username, old.id)
    on conflict (old_username) do update set profile_id = excluded.profile_id, changed_at = now();
    -- Si vuelve a un username propio anterior, se libera del historial
    delete from profile_username_history where old_username = new.username and profile_id = new.id;
    new.username_changed_at := now();
  end if;

  return new;
end $$;

create or replace function public.mycen_profile_status_change()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
  end if;
  return new;
end $$;

drop trigger if exists profiles_validate_username on public.profiles;
create trigger profiles_validate_username
  before insert or update of username on public.profiles
  for each row execute function public.mycen_validate_username();

drop trigger if exists profiles_status_change on public.profiles;
create trigger profiles_status_change
  before insert or update of status on public.profiles
  for each row execute function public.mycen_profile_status_change();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.mycen_touch_updated_at();

alter table public.profiles enable row level security;

drop policy if exists profiles_owner_select on public.profiles;
create policy profiles_owner_select on public.profiles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists profiles_owner_insert on public.profiles;
create policy profiles_owner_insert on public.profiles
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (restaurant_id is null
         or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()))
  );

drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (restaurant_id is null
         or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()))
  );

drop policy if exists profiles_owner_delete on public.profiles;
create policy profiles_owner_delete on public.profiles
  for delete to authenticated using (user_id = auth.uid());

-- El visitante anónimo NO lee la tabla: usa get_public_profile()
revoke all on public.profiles from anon;

-- ─── 4. profile_modules ──────────────────────────────────────────────────────

create table if not exists public.profile_modules (
  id           uuid        primary key default gen_random_uuid(),
  profile_id   uuid        not null references public.profiles(id) on delete cascade,
  type         text        not null check (type in (
                 -- MVP (Etapa 2)
                 'link','social','contact','location','image','text','featured_action','contact_card',
                 -- Heredados del Hub / Mycen Business
                 'gallery','product','testimonials','hours'
               )),
  title        text,
  content      jsonb       not null default '{}'::jsonb,
  config       jsonb       not null default '{}'::jsonb,
  translations jsonb       not null default '{}'::jsonb,
  position     integer     not null default 0,
  visibility   text        not null default 'active' check (visibility in ('active','hidden')),
  deleted_at   timestamptz,               -- estado "Deleted" (borrado lógico)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint profile_modules_sizes
    check (char_length(coalesce(title, '')) <= 120
       and pg_column_size(content) < 32768
       and pg_column_size(config) < 8192
       and pg_column_size(translations) < 65536)
);

create index if not exists profile_modules_profile_position_idx
  on public.profile_modules (profile_id, position)
  where deleted_at is null;

drop trigger if exists profile_modules_touch_updated_at on public.profile_modules;
create trigger profile_modules_touch_updated_at
  before update on public.profile_modules
  for each row execute function public.mycen_touch_updated_at();

-- Límite anti-abuso: 100 módulos vivos por perfil
create or replace function public.mycen_limit_modules()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.profile_modules
      where profile_id = new.profile_id and deleted_at is null) >= 100 then
    raise exception 'MODULE_LIMIT_REACHED' using errcode = '54000';
  end if;
  return new;
end $$;

drop trigger if exists profile_modules_limit on public.profile_modules;
create trigger profile_modules_limit
  before insert on public.profile_modules
  for each row execute function public.mycen_limit_modules();

alter table public.profile_modules enable row level security;

drop policy if exists profile_modules_owner_all on public.profile_modules;
create policy profile_modules_owner_all on public.profile_modules
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

revoke all on public.profile_modules from anon;

-- ─── 5. Analítica ────────────────────────────────────────────────────────────

create table if not exists public.profile_events (
  id            bigint      generated always as identity primary key,
  profile_id    uuid        not null references public.profiles(id) on delete cascade,
  module_id     uuid        references public.profile_modules(id) on delete set null,
  event_type    text        not null check (event_type in (
                  'view','module_click','primary_action_click',
                  'share','copy_link','qr_download','vcard_download')),
  -- Hash diario anónimo (IP+UA+perfil+día+sal). No se guarda IP ni user-agent.
  visitor_hash  text,
  referrer_host text,
  source        text,        -- ?src=qr | ig | wa | legacy_import …
  created_at    timestamptz not null default now()
);

create index if not exists profile_events_profile_time_idx
  on public.profile_events (profile_id, created_at desc);
create index if not exists profile_events_dedupe_idx
  on public.profile_events (profile_id, visitor_hash, event_type, created_at desc);

alter table public.profile_events enable row level security;

drop policy if exists profile_events_owner_select on public.profile_events;
create policy profile_events_owner_select on public.profile_events
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

revoke all on public.profile_events from anon;
revoke insert, update, delete on public.profile_events from authenticated;

-- Agregado diario (respeta RLS del que consulta)
create or replace view public.profile_stats_daily
with (security_invoker = true) as
select
  profile_id,
  (created_at at time zone 'UTC')::date as day,
  event_type,
  module_id,
  count(*)                     as events,
  count(distinct visitor_hash) as visitors
from public.profile_events
group by 1, 2, 3, 4;

-- ─── 6. RPCs públicas ────────────────────────────────────────────────────────

-- Disponibilidad de username (onboarding / Studio)
-- Devuelve: available | taken | reserved | invalid
create or replace function public.check_username(p_username text)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  v text := lower(btrim(coalesce(p_username, '')));
begin
  if v !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' or v like '%--%' then
    return 'invalid';
  end if;
  if exists (select 1 from reserved_usernames where username = v) then
    return 'reserved';
  end if;
  if exists (select 1 from profiles p where p.username = v and p.user_id is distinct from auth.uid())
     or exists (select 1 from profile_username_history h join profiles p on p.id = h.profile_id
                where h.old_username = v and p.user_id is distinct from auth.uid()) then
    return 'taken';
  end if;
  return 'available';
end $$;

-- Perfil público: SOLO campos autorizados + módulos activos.
-- Devuelve null (no existe), {"redirect": "nuevo"} (username cambiado),
-- {"status": "unavailable"} (borrador/despublicado) o el perfil.
-- El dueño logueado puede ver su propio borrador (preview).
create or replace function public.get_public_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_username text := lower(btrim(coalesce(p_username, '')));
  v          public.profiles;
  v_redirect text;
begin
  select * into v from profiles where username = v_username;

  if not found then
    select p.username into v_redirect
    from profile_username_history h join profiles p on p.id = h.profile_id
    where h.old_username = v_username and p.status = 'published';
    if v_redirect is not null then
      return jsonb_build_object('redirect', v_redirect);
    end if;
    return null;
  end if;

  if v.status <> 'published' and auth.uid() is distinct from v.user_id then
    return jsonb_build_object('status', 'unavailable');
  end if;

  return jsonb_build_object(
    'id',             v.id,
    'username',       v.username,
    'display_name',   v.display_name,
    'descriptor',     v.descriptor,
    'bio',            v.bio,
    'avatar_url',     v.avatar_url,
    'cover_url',      v.cover_url,
    'purpose',        v.purpose,
    'status',         v.status,
    'theme',          v.theme,
    'primary_action', v.primary_action,
    'default_locale', v.default_locale,
    'translations',   v.translations,
    'has_contact_card', coalesce((v.contact_card ->> 'enabled')::boolean, false),
    'is_owner',       auth.uid() is not distinct from v.user_id,
    'business', (
      select jsonb_build_object(
        'slug',                 r.slug,
        'business_type',        to_jsonb(r) ->> 'business_type',
        'plan',                 to_jsonb(r) ->> 'plan',
        'reservations_enabled', coalesce((to_jsonb(r) ->> 'reservations_enabled')::boolean, false),
        'timezone',             to_jsonb(r) ->> 'timezone')
      from restaurants r where r.id = v.restaurant_id
    ),
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'type', m.type, 'title', m.title,
               'content', m.content, 'config', m.config - 'legacy_source' - 'legacy_id' - 'legacy_click_count',
               'translations', m.translations)
             order by m.position, m.created_at)
      from profile_modules m
      where m.profile_id = v.id and m.visibility = 'active' and m.deleted_at is null
    ), '[]'::jsonb)
  );
end $$;

-- Datos de la vCard: solo si el dueño la habilitó y el perfil está publicado
create or replace function public.get_profile_contact_card(p_profile_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select (p.contact_card - 'enabled') || jsonb_build_object('username', p.username)
  from profiles p
  where p.id = p_profile_id
    and coalesce((p.contact_card ->> 'enabled')::boolean, false)
    and (p.status = 'published' or p.user_id = auth.uid());
$$;

-- Registro de eventos: anónimo, deduplicado, sin bots y sin contar al dueño
create or replace function public.track_profile_event(
  p_profile_id uuid,
  p_event_type text,
  p_module_id  uuid default null,
  p_referrer   text default null,
  p_source     text default null
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

  select value into v_salt from mycen_private.secrets where key = 'visitor_salt';
  v_hash := left(encode(sha256(convert_to(
              v_ip || '|' || v_ua || '|' || p_profile_id::text || '|' || current_date::text || '|' || coalesce(v_salt, ''),
              'UTF8')), 'hex'), 32);

  -- Deduplicación: mismo visitante + evento + módulo en 30 minutos
  if exists (select 1 from profile_events e
             where e.profile_id = p_profile_id and e.visitor_hash = v_hash
               and e.event_type = p_event_type and e.module_id is not distinct from p_module_id
               and e.created_at > now() - interval '30 minutes') then
    return;
  end if;

  -- Límite anti-abuso: 300 eventos por visitante por día y perfil
  if (select count(*) from profile_events e
      where e.profile_id = p_profile_id and e.visitor_hash = v_hash
        and e.created_at > now() - interval '1 day') >= 300 then
    return;
  end if;

  insert into profile_events (profile_id, module_id, event_type, visitor_hash, referrer_host, source)
  values (
    p_profile_id, p_module_id, p_event_type, v_hash,
    left(lower(substring(coalesce(p_referrer, '') from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/:?#]+)')), 120),
    left(nullif(btrim(p_source), ''), 32)
  );
end $$;

revoke all on function public.check_username(text)                                  from public;
revoke all on function public.get_public_profile(text)                              from public;
revoke all on function public.get_profile_contact_card(uuid)                        from public;
revoke all on function public.track_profile_event(uuid, text, uuid, text, text)     from public;
grant execute on function public.check_username(text)                              to anon, authenticated;
grant execute on function public.get_public_profile(text)                          to anon, authenticated;
grant execute on function public.get_profile_contact_card(uuid)                    to anon, authenticated;
grant execute on function public.track_profile_event(uuid, text, uuid, text, text) to anon, authenticated;

-- ─── 7. Sincronía con Mycen Business ─────────────────────────────────────────
-- Todo negocio nuevo obtiene su perfil automáticamente (mismo slug = misma URL).
-- Nunca bloquea la creación del negocio: si algo falla, sólo deja un WARNING.

create or replace function public.mycen_profile_for_restaurant()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner    uuid := (to_jsonb(new) ->> 'owner_id')::uuid;
  v_username text := lower(btrim(coalesce(new.slug, '')));
begin
  if v_owner is null or v_username = '' then return new; end if;
  if exists (select 1 from profiles where restaurant_id = new.id) then return new; end if;
  if exists (select 1 from profiles where username = v_username)
     or exists (select 1 from reserved_usernames where username = v_username)
     or exists (select 1 from profile_username_history where old_username = v_username)
     or v_username !~ '^[a-z0-9][a-z0-9_-]{0,62}$' then
    return new;
  end if;

  begin
    perform set_config('mycen.legacy_import', 'on', true);
    insert into profiles (user_id, restaurant_id, username, display_name, avatar_url, purpose, status, is_primary)
    values (
      v_owner, new.id, v_username, coalesce(new.name, ''), to_jsonb(new) ->> 'logo_url', 'business',
      case when coalesce((to_jsonb(new) ->> 'hub_enabled')::boolean, true) then 'published' else 'unpublished' end,
      not exists (select 1 from profiles where user_id = v_owner and is_primary)
    );
    perform set_config('mycen.legacy_import', 'off', true);
  exception when others then
    perform set_config('mycen.legacy_import', 'off', true);
    raise warning 'mycen: no se pudo crear el perfil del negocio %: %', new.id, sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists restaurants_create_profile on public.restaurants;
create trigger restaurants_create_profile
  after insert on public.restaurants
  for each row execute function public.mycen_profile_for_restaurant();

-- ─── 8. Storage: fotos de perfil y módulos ───────────────────────────────────
-- Cada usuario sólo puede escribir en su carpeta: profile-media/{auth.uid()}/…

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do nothing;

drop policy if exists "profile_media_public_read" on storage.objects;
create policy "profile_media_public_read" on storage.objects
  for select to public using (bucket_id = 'profile-media');

drop policy if exists "profile_media_owner_insert" on storage.objects;
create policy "profile_media_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile_media_owner_update" on storage.objects;
create policy "profile_media_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile_media_owner_delete" on storage.objects;
create policy "profile_media_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
