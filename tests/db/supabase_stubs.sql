-- Lo mínimo de Supabase para aplicar las migraciones de Identity en un Postgres limpio.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema auth;
create table auth.users (id uuid primary key, email text);
-- auth.uid() lee el "usuario" que fija cada test con: select set_config('request.jwt.claim.sub', '<uuid>', false)
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
-- Tablas de Mycen Business / Life OS que las migraciones de Identity referencian
create table public.restaurants (
  id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id), slug text, name text,
  logo_url text, hub_enabled boolean default true, plan text, business_type text, hub_category_tags text[] default '{}',
  updated_at timestamptz default now());
create table public.life_goals (id uuid primary key default gen_random_uuid(), user_id uuid);
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
-- Panel super-admin (existe en producción)
create table public.super_admins (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  email text, created_at timestamptz default now(), updated_at timestamptz default now());
