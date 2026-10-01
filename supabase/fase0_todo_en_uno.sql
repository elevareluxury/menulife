-- =====================================================================
-- MYCEN · FASE 0 — script único (pegar entero en Supabase → SQL Editor → Run)
-- 1) Crea Mycen Profile  2) Saca el token de MercadoPago de restaurants
-- 3) Importa el Hub actual. Al final muestra el reporte de importación.
-- Se puede correr más de una vez sin duplicar nada.
-- =====================================================================

-- ── 1. Mycen Profile ──
begin;

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

create schema if not exists mycen_private;
revoke all on schema mycen_private from public;

create table if not exists mycen_private.secrets (
  key   text primary key,
  value text not null
);
insert into mycen_private.secrets (key, value)
values ('visitor_salt', encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')), 'hex'))
on conflict (key) do nothing;

create or replace function public.mycen_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table if not exists public.reserved_usernames (
  username   text primary key,
  reason     text not null default 'system_route',
  created_at timestamptz not null default now()
);
alter table public.reserved_usernames enable row level security;

insert into public.reserved_usernames (username, reason) values
  ('dashboard','route'),('login','route'),('logout','route'),('register','route'),('signup','route'),
  ('auth','route'),('forgot-password','route'),('reset-password','route'),('solicitar-acceso','route'),
  ('onboarding','route'),('life','route'),('portal','route'),('q','route'),('r','route'),
  ('kitchen','route'),('mozo','route'),('waiter','route'),('delivery','route'),
  ('super-admin','route'),('superadmin','route'),('catalogo','route'),('catalog','route'),
  ('studio','route'),('profile','route'),('profiles','route'),('exchange','route'),('analytics','route'),
  ('settings','route'),('business','route'),('hub','route'),('intelligence','route'),('explore','route'),
  ('pricing','route'),('precios','route'),('planes','route'),('about','route'),('acerca','route'),
  ('help','route'),('ayuda','route'),('support','route'),('soporte','route'),('contact','route'),
  ('contacto','route'),('terms','route'),('terminos','route'),('privacy','route'),('privacidad','route'),
  ('legal','route'),('blog','route'),('docs','route'),('status','route'),('jobs','route'),
  ('api','technical'),('app','technical'),('www','technical'),('admin','technical'),('root','technical'),
  ('static','technical'),('assets','technical'),('public','technical'),('cdn','technical'),
  ('offline','technical'),('sw','technical'),('manifest','technical'),('favicon','technical'),
  ('robots','technical'),('sitemap','technical'),('og','technical'),('well-known','technical'),
  ('null','technical'),('undefined','technical'),
  ('mycen','brand'),('menulife','brand'),('resilio','brand'),('official','brand'),('oficial','brand')
on conflict (username) do nothing;

create table if not exists public.profiles (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
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
  theme               jsonb       not null default '{}'::jsonb,
  primary_action      jsonb,
  contact_card        jsonb       not null default '{"enabled": false}'::jsonb,
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

create table if not exists public.profile_username_history (
  old_username text        primary key,
  profile_id   uuid        not null references public.profiles(id) on delete cascade,
  changed_at   timestamptz not null default now()
);
alter table public.profile_username_history enable row level security;

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

revoke all on public.profiles from anon;

create table if not exists public.profile_modules (
  id           uuid        primary key default gen_random_uuid(),
  profile_id   uuid        not null references public.profiles(id) on delete cascade,
  type         text        not null check (type in (
                 'link','social','contact','location','image','text','featured_action','contact_card',
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

create table if not exists public.profile_events (
  id            bigint      generated always as identity primary key,
  profile_id    uuid        not null references public.profiles(id) on delete cascade,
  module_id     uuid        references public.profile_modules(id) on delete set null,
  event_type    text        not null check (event_type in (
                  'view','module_click','primary_action_click',
                  'share','copy_link','qr_download','vcard_download')),
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

create or replace function public.get_profile_contact_card(p_profile_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select (p.contact_card - 'enabled') || jsonb_build_object('username', p.username)
  from profiles p
  where p.id = p_profile_id
    and coalesce((p.contact_card ->> 'enabled')::boolean, false)
    and (p.status = 'published' or p.user_id = auth.uid());
$$;

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

  if exists (select 1 from profile_events e
             where e.profile_id = p_profile_id and e.visitor_hash = v_hash
               and e.event_type = p_event_type and e.module_id is not distinct from p_module_id
               and e.created_at > now() - interval '30 minutes') then
    return;
  end if;

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

-- ── 2. Seguridad: token MercadoPago ──
begin;

create table if not exists public.restaurant_secrets (
  restaurant_id            uuid        primary key references public.restaurants(id) on delete cascade,
  mercadopago_access_token text,
  updated_at               timestamptz not null default now()
);

alter table public.restaurant_secrets enable row level security;
revoke all on public.restaurant_secrets from anon;

drop policy if exists restaurant_secrets_owner_all on public.restaurant_secrets;
create policy restaurant_secrets_owner_all on public.restaurant_secrets
  for all to authenticated
  using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'restaurants'
               and column_name = 'mercadopago_access_token') then
    insert into public.restaurant_secrets (restaurant_id, mercadopago_access_token)
    select id, mercadopago_access_token
    from public.restaurants
    where coalesce(mercadopago_access_token, '') <> ''
    on conflict (restaurant_id) do update
      set mercadopago_access_token = excluded.mercadopago_access_token, updated_at = now();

    alter table public.restaurants drop column mercadopago_access_token;
  end if;
end $$;

commit;

-- ── 3. Importar el Hub ──
begin;

create table if not exists mycen_private.hub_imports (
  restaurant_id uuid        primary key,
  profile_id    uuid        not null,
  imported_at   timestamptz not null default now()
);

create or replace function public.mycen_import_hub(
  p_restaurant_id    uuid    default null,
  p_replace          boolean default false,
  p_import_analytics boolean default true
)
returns table (restaurant_slug text, profile_username text, result text)
language plpgsql security definer set search_path = public as $$
declare
  r          record;
  rj         jsonb;
  hc         jsonb;
  v_owner    uuid;
  v_profile  public.profiles;
  v_username text;
  v_new      boolean;
  v_first    boolean;
  v_note     text;
  v_cta_url  text;
  v_cta_txt  text;
  v_btype    text;
  v_plan     text;
  v_social   jsonb;
  v_key      text;
  v_val      text;
  v_url      text;
  v_pos      integer;
  v_items    jsonb;
  v_salt     text;
begin
  perform set_config('mycen.legacy_import', 'on', true);
  select value into v_salt from mycen_private.secrets where key = 'visitor_salt';

  for r in
    select * from restaurants x
    where p_restaurant_id is null or x.id = p_restaurant_id
    order by x.created_at nulls last, x.id
  loop
    begin
      rj        := to_jsonb(r);
      v_owner   := (rj ->> 'owner_id')::uuid;
      v_btype   := rj ->> 'business_type';
      v_plan    := rj ->> 'plan';
      v_note    := null;
      select to_jsonb(h) into hc from hub_config h where h.restaurant_id = r.id;
      hc := coalesce(hc, '{}'::jsonb);

      if v_owner is null then
        restaurant_slug := r.slug; profile_username := null; result := 'omitido: sin owner_id';
        return next; continue;
      end if;

      select * into v_profile from profiles where restaurant_id = r.id;
      v_new := not found;

      if v_new then
        v_username := lower(btrim(r.slug));
        v_username := regexp_replace(v_username, '[^a-z0-9_-]', '-', 'g');
        v_username := regexp_replace(v_username, '^[^a-z0-9]+', '');
        v_username := left(v_username, 63);
        if v_username = ''
           or exists (select 1 from reserved_usernames where username = v_username)
           or exists (select 1 from profiles where username = v_username)
           or exists (select 1 from profile_username_history where old_username = v_username) then
          v_username := left(coalesce(nullif(v_username, ''), 'perfil'), 50) || '-' || left(replace(r.id::text, '-', ''), 6);
          v_note := 'username cambiado (slug reservado, inválido o en uso): ' || r.slug || ' → ' || v_username;
        end if;

        insert into profiles (user_id, restaurant_id, username, purpose, status, is_primary)
        values (
          v_owner, r.id, v_username, 'business',
          case when coalesce((rj ->> 'hub_enabled')::boolean, true) then 'published' else 'unpublished' end,
          not exists (select 1 from profiles where user_id = v_owner and is_primary)
        )
        returning * into v_profile;
      end if;

      v_first := not exists (select 1 from mycen_private.hub_imports i where i.restaurant_id = r.id);

      if not (v_new or v_first or p_replace) then
        restaurant_slug := r.slug; profile_username := v_profile.username; result := 'ya importado (sin cambios)';
        return next; continue;
      end if;

      v_cta_url := nullif(btrim(rj ->> 'hub_main_cta_url'), '');
      v_cta_txt := nullif(btrim(rj ->> 'hub_main_cta_text'), '');

      update profiles set
        display_name = left(coalesce(nullif(btrim(hc ->> 'hub_title'), ''), r.name, ''), 80),
        descriptor   = left(coalesce(nullif(btrim(rj ->> 'short_description'), ''), nullif(btrim(rj ->> 'hub_category'), '')), 120),
        bio          = left(coalesce(nullif(btrim(rj ->> 'hub_about'), ''), nullif(btrim(rj ->> 'description'), '')), 1000),
        avatar_url   = nullif(rj ->> 'logo_url', ''),
        cover_url    = coalesce(nullif(rj ->> 'hub_cover_url', ''), nullif(rj ->> 'cover_image_url', '')),
        default_locale = lower(coalesce(nullif(rj ->> 'default_language', ''), 'es')),
        theme = jsonb_build_object(
          'mode',       'dark',
          'accent',     coalesce(nullif(hc ->> 'accent_color', ''), '#F59E0B'),
          'surface',    'glass',
          'title_font', coalesce(nullif(hc ->> 'title_font', ''), 'syne'),
          'show_open_status', coalesce((hc ->> 'show_open_status')::boolean, true)),
        primary_action = case
          when v_cta_url is not null then
            jsonb_build_object('kind', 'custom', 'label', coalesce(v_cta_txt, 'Ver más'), 'url', v_cta_url)
          when v_plan = 'hub_free' then null
          when v_btype = 'retail' then
            jsonb_build_object('kind', 'shop', 'label', 'Ver catálogo', 'url', '/catalogo/' || r.slug)
          when coalesce(v_btype, 'gastronomy') = 'gastronomy' then
            jsonb_build_object('kind', 'menu', 'label', 'Ver menú', 'url', '/r/' || r.slug)
          else null
        end,
        translations = jsonb_strip_nulls(jsonb_build_object('en', jsonb_strip_nulls(jsonb_build_object(
          'bio',          nullif(btrim(coalesce(rj ->> 'hub_about_en', rj ->> 'description_en')), ''),
          'display_name', nullif(btrim(rj ->> 'name_en'), ''),
          'descriptor',   nullif(btrim(rj ->> 'short_description_en'), ''),
          '_source',      'manual')))),
        contact_card = jsonb_strip_nulls(jsonb_build_object(
          'enabled', false,
          'name',    r.name,
          'email',   nullif(rj ->> 'email', ''),
          'phone',   nullif(rj ->> 'phone', ''),
          'website', nullif(rj ->> 'website', '')))
      where id = v_profile.id;

      update profiles set translations = '{}'::jsonb
      where id = v_profile.id and translations = '{"en": {"_source": "manual"}}'::jsonb;

      if p_replace then
        delete from profile_modules where profile_id = v_profile.id and config ? 'legacy_source';
      end if;

      insert into profile_modules (profile_id, type, title, content, translations, position, visibility, config)
      select v_profile.id, 'text', left(s ->> 'title', 120),
             jsonb_strip_nulls(jsonb_build_object('body', coalesce(s ->> 'text', s ->> 'description'), 'image_url', s ->> 'image_url')),
             jsonb_strip_nulls(jsonb_build_object('en', jsonb_strip_nulls(jsonb_build_object(
               'title', s ->> 'title_en', 'body', coalesce(s ->> 'text_en', s ->> 'description_en'))))),
             10, 'active',
             jsonb_build_object('legacy_source', 'hub_stories', 'legacy_id', s ->> 'id', 'variant', 'story')
      from (select to_jsonb(x) as s from hub_stories x
            where x.restaurant_id = r.id and x.is_active order by x.created_at desc nulls last limit 1) st;

      insert into profile_modules (profile_id, type, title, content, position, visibility, config)
      select v_profile.id, 'product', left(f ->> 'name', 120),
             jsonb_strip_nulls(jsonb_build_object(
               'name', f ->> 'name', 'description', f ->> 'description',
               'price', (f ->> 'price')::numeric, 'image_url', f ->> 'image_url', 'tag', f ->> 'tag',
               'cta_text', f ->> 'cta_text', 'cta_url', f ->> 'cta_url')),
             20, 'active',
             jsonb_build_object('legacy_source', 'hub_featured_product', 'legacy_id', f ->> 'id')
      from (select to_jsonb(x) as f from hub_featured_product x
            where x.restaurant_id = r.id and x.is_active order by x.created_at desc nulls last limit 1) fp;

      insert into profile_modules (profile_id, type, title, content, position, visibility, config)
      select v_profile.id, 'link', left(l.label, 120),
             jsonb_strip_nulls(jsonb_build_object(
               'url', l.url, 'link_type', coalesce(l.type, 'custom'),
               'icon', l.icon, 'image_url', to_jsonb(l) ->> 'image_url')),
             100 + coalesce(l.sort_order, 0),
             case when l.is_active then 'active' else 'hidden' end,
             jsonb_build_object('legacy_source', 'hub_links', 'legacy_id', l.id::text,
                                'legacy_click_count', coalesce(l.click_count, 0))
      from hub_links l
      where l.restaurant_id = r.id and coalesce(l.url, '') <> '';

      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'url', g.url, 'type', coalesce(g.type, 'image'), 'caption', g.caption,
               'thumbnail_url', to_jsonb(g) ->> 'thumbnail_url'))
             order by g.sort_order, g.id)
        into v_items
      from hub_gallery g where g.restaurant_id = r.id and g.is_active;
      if v_items is not null then
        insert into profile_modules (profile_id, type, title, content, position, config)
        values (v_profile.id, 'gallery', 'Galería', jsonb_build_object('items', v_items), 300,
                jsonb_build_object('legacy_source', 'hub_gallery'));
      end if;

      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'author_name', coalesce(v.j ->> 'reviewer_name', v.j ->> 'author_name'),
               'rating', (v.j ->> 'rating')::integer, 'text', v.j ->> 'text',
               'color', v.j ->> 'profile_color'))
             order by (v.j ->> 'sort_order')::integer nulls last, v.j ->> 'id')
        into v_items
      from (select to_jsonb(x) as j from hub_reviews x where x.restaurant_id = r.id) v;
      if v_items is not null or rj ->> 'google_rating' is not null then
        insert into profile_modules (profile_id, type, title, content, position, config)
        values (v_profile.id, 'testimonials', 'Reseñas',
                jsonb_strip_nulls(jsonb_build_object(
                  'items', coalesce(v_items, '[]'::jsonb),
                  'google', jsonb_strip_nulls(jsonb_build_object(
                    'rating', (rj ->> 'google_rating')::numeric,
                    'count',  (rj ->> 'google_review_count')::integer,
                    'url',    nullif(rj ->> 'google_review_url', ''))))),
                400, jsonb_build_object('legacy_source', 'hub_reviews'));
      end if;

      v_social := case when jsonb_typeof(rj -> 'social_links') = 'object' then rj -> 'social_links' else '{}'::jsonb end;
      v_pos := 500;
      for v_key, v_val in select key, btrim(value) from jsonb_each_text(v_social) order by key loop
        continue when coalesce(v_val, '') = '';
        continue when v_key = 'google_maps';  -- va al módulo de ubicación
        v_url := case
          when v_val ~* '^https?://'  then v_val
          when v_key = 'instagram'    then 'https://instagram.com/' || ltrim(v_val, '@')
          when v_key = 'tiktok'       then 'https://tiktok.com/@'   || ltrim(v_val, '@')
          when v_key = 'facebook'     then 'https://facebook.com/'  || ltrim(v_val, '@')
          when v_key in ('twitter','x') then 'https://x.com/'       || ltrim(v_val, '@')
          when v_key = 'youtube'      then 'https://youtube.com/@'  || ltrim(v_val, '@')
          when v_key = 'linkedin'     then 'https://linkedin.com/in/' || ltrim(v_val, '@')
          when v_key = 'whatsapp'     then 'https://wa.me/' || regexp_replace(v_val, '\D', '', 'g')
          else null
        end;
        continue when v_url is null;
        insert into profile_modules (profile_id, type, title, content, position, config)
        values (v_profile.id, 'social', initcap(replace(v_key, '_', ' ')),
                jsonb_build_object('network', v_key, 'handle', v_val, 'url', v_url),
                v_pos, jsonb_build_object('legacy_source', 'social_links', 'legacy_id', v_key));
        v_pos := v_pos + 1;
      end loop;

      if coalesce(nullif(rj ->> 'email', ''), nullif(rj ->> 'phone', ''), nullif(v_social ->> 'whatsapp', '')) is not null then
        insert into profile_modules (profile_id, type, title, content, position, visibility, config)
        values (v_profile.id, 'contact', 'Contacto',
                jsonb_strip_nulls(jsonb_build_object(
                  'email',    nullif(rj ->> 'email', ''),
                  'phone',    nullif(rj ->> 'phone', ''),
                  'whatsapp', nullif(v_social ->> 'whatsapp', ''))),
                600,
                case when coalesce((hc ->> 'show_contact')::boolean, true) then 'active' else 'hidden' end,
                jsonb_build_object('legacy_source', 'restaurants.contact'));
      end if;

      if coalesce(nullif(rj ->> 'address', ''), nullif(v_social ->> 'google_maps', '')) is not null then
        insert into profile_modules (profile_id, type, title, content, position, visibility, config)
        values (v_profile.id, 'location', 'Ubicación',
                jsonb_strip_nulls(jsonb_build_object(
                  'address', rj ->> 'address', 'city', coalesce(nullif(rj ->> 'hub_city', ''), nullif(rj ->> 'city', '')),
                  'directions', nullif(rj ->> 'directions', ''),
                  'maps_url', nullif(v_social ->> 'google_maps', ''))),
                700,
                case when coalesce((hc ->> 'show_locations')::boolean, true) then 'active' else 'hidden' end,
                jsonb_build_object('legacy_source', 'restaurants.address'));
      end if;

      if coalesce(v_plan, '') <> 'hub_free'
         and jsonb_typeof(rj -> 'schedule') = 'object' and rj -> 'schedule' <> '{}'::jsonb then
        insert into profile_modules (profile_id, type, title, content, position, visibility, config)
        values (v_profile.id, 'hours', 'Horarios',
                jsonb_build_object('schedule', rj -> 'schedule',
                                   'timezone', coalesce(rj ->> 'timezone', 'America/Argentina/Buenos_Aires')),
                800,
                case when coalesce((hc ->> 'show_schedule')::boolean, true) then 'active' else 'hidden' end,
                jsonb_build_object('legacy_source', 'restaurants.schedule'));
      end if;

      if p_import_analytics
         and not exists (select 1 from profile_events e
                         where e.profile_id = v_profile.id and e.source = 'legacy_import') then
        insert into profile_events (profile_id, module_id, event_type, visitor_hash, referrer_host, source, created_at)
        select v_profile.id,
               (select m.id from profile_modules m
                 where m.profile_id = v_profile.id and m.config ->> 'legacy_source' = 'hub_links'
                   and m.config ->> 'legacy_id' = a.j ->> 'link_id' limit 1),
               case a.j ->> 'event_type'
                 when 'profile_view' then 'view'
                 when 'cta_click'    then 'primary_action_click'
                 else 'module_click'
               end,
               left(encode(sha256(convert_to(
                 coalesce(a.j ->> 'user_agent', '') || '|' || v_profile.id::text || '|'
                 || coalesce(left(a.j ->> 'created_at', 10), '') || '|' || coalesce(v_salt, ''), 'UTF8')), 'hex'), 32),
               left(lower(substring(coalesce(a.j ->> 'referrer', '') from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/:?#]+)')), 120),
               'legacy_import',
               coalesce((a.j ->> 'created_at')::timestamptz, now())
        from (select to_jsonb(x) as j from hub_analytics x where x.restaurant_id = r.id) a
        where a.j ->> 'event_type' in ('profile_view','link_click','cta_click','whatsapp_click','maps_click')
          and coalesce(a.j ->> 'user_agent', '') !~* '(bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse)';
      end if;

      insert into mycen_private.hub_imports (restaurant_id, profile_id)
      values (r.id, v_profile.id)
      on conflict (restaurant_id) do update set profile_id = excluded.profile_id, imported_at = now();

      restaurant_slug  := r.slug;
      profile_username := v_profile.username;
      result := case when v_new then 'creado' else 'actualizado' end || coalesce(' · ' || v_note, '');
      return next;

    exception when others then
      restaurant_slug := r.slug; profile_username := null; result := 'ERROR: ' || sqlerrm;
      return next;
    end;
  end loop;

  perform set_config('mycen.legacy_import', 'off', true);
end $$;

revoke all on function public.mycen_import_hub(uuid, boolean, boolean) from public, anon, authenticated;

commit;

select * from public.mycen_import_hub();
