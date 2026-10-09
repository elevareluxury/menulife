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
-- Life OS: Brain (tareas, ideas y notas), como en producción (20260615000001 + 20261005000001)
create table public.life_brain_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('idea','note','task')), title text not null, content text,
  is_completed boolean not null default false, is_archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  due_date date, due_time time, remind_minutes integer, reminded_at timestamptz, completed_at timestamptz,
  goal_id uuid references public.life_goals(id) on delete set null, is_focus boolean not null default false);
alter table public.life_brain_items enable row level security;
create policy lbi_owner on public.life_brain_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant all on public.life_brain_items to authenticated;
