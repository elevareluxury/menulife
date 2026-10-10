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
-- Como en Supabase: RLS activo y los roles de la API con permisos sobre la tabla (las políticas deciden)
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
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
-- Configuración de la landing (existe en producción; 20260601000004)
create table public.site_config (
  id uuid primary key default gen_random_uuid(), demo_link text not null default 'mailto:x', contact_link text not null default 'mailto:x',
  created_at timestamptz default now(), updated_at timestamptz default now());
alter table public.site_config enable row level security;
create policy "Super admins manage site_config" on public.site_config for all to authenticated using (true) with check (true);
insert into public.site_config default values;
-- Solicitudes de acceso a Business (existe en producción; políticas de 20260609000002)
create table public.access_requests (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null unique, business_name text not null,
  phone text, city text, message text, status text not null default 'pending', reviewed_at timestamptz,
  created_at timestamptz default now());
alter table public.access_requests enable row level security;
create policy authenticated_read_access_requests on public.access_requests for select to authenticated using (true);
create policy authenticated_update_access_requests on public.access_requests for update to authenticated using (true) with check (true);
create policy anon_insert_access_requests on public.access_requests for insert to anon with check (true);
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
-- Life OS: hábitos (20260615000001 + goal_id de 20261006000001)
create table public.life_habits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, icon text not null default 'CheckCircle', color text not null default '#F4705A',
  frequency jsonb not null default '{"type":"daily","days":[0,1,2,3,4,5,6]}', is_active boolean not null default true,
  sort_order int not null default 0, created_at timestamptz not null default now(),
  goal_id uuid references public.life_goals(id) on delete set null);
create table public.life_habit_logs (
  id uuid primary key default gen_random_uuid(), habit_id uuid not null references public.life_habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, completed_date date not null,
  created_at timestamptz not null default now(), unique (habit_id, completed_date));
alter table public.life_habits enable row level security;
alter table public.life_habit_logs enable row level security;
create policy lh_owner on public.life_habits for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lhl_owner on public.life_habit_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant all on public.life_habits, public.life_habit_logs to authenticated;
