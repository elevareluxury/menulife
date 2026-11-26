-- Auditoría de seguridad (24/11/2026), hallazgos bajos:
--   L3. El username de un perfil suspendido quedaba libre si antes lo cambiaban y después borraban la cuenta (sólo se
--       reservaba el último). Ahora se reservan también los anteriores, y un perfil suspendido no cambia su dirección.
--   L4. Un Space podía quedar "publicado" sin versión congelada y mostrar su versión de trabajo a cualquiera. Desde la
--       app sólo se publica con publish_space / restore_space_version, y los publicados sin versión reciben una.
--   L6/L10. La revisión de links salteaba lo que pasaba el tope de una pasada y nunca volvía, y no veía links escritos
--       sin "https://" o entre comillas (la página sí los muestra). Ahora cada link revisado se anota y las pasadas
--       siguientes siguen con lo que falta; la base entrega también los links "sueltos" y el scanner los arregla con la
--       misma regla que la página.
--   N13. Las filas globales de Business (tipos de recurso del sistema y métricas globales) ya no se escriben desde la app.
-- Idempotente. Se aplica en Supabase → SQL Editor. Tests: tests/db/security_audit_fixes_3.test.sql.

-- ─── L3. Usernames de un perfil suspendido ───────────────────────────────────────────────────────────
-- Igual a 20261123000001 + los usernames anteriores del perfil
create or replace function public.mycen_profile_delete_guard()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if old.suspended_at is null then return old; end if;
  -- Sólo frena a una cuenta desde la app (con sesión); el panel de Supabase o el equipo sí pueden borrarlo
  if auth.uid() is not null and coalesce(current_setting('mycen.deleting_account', true), '') <> 'on'
     and not mycen_is_admin() then
    raise exception 'PROFILE_SUSPENDED' using errcode = '42501';
  end if;
  -- Se borra con la cuenta: el username suspendido (y los que tuvo antes) no vuelven a quedar libres
  if old.username is not null then
    insert into reserved_usernames (username, reason) values (old.username, 'suspended') on conflict do nothing;
  end if;
  insert into reserved_usernames (username, reason)
  select h.old_username, 'suspended' from profile_username_history h
  where h.profile_id = old.id and h.old_username is not null
  on conflict do nothing;
  return old;
end $$;
revoke all on function public.mycen_profile_delete_guard() from public, anon, authenticated;

-- Un perfil suspendido no cambia su dirección desde la app (el equipo sí)
-- Sin security definer a propósito: current_user tiene que ser quien hace el cambio
create or replace function public.mycen_suspended_no_rename()
returns trigger language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if old.suspended_at is not null
     and (new.username is distinct from old.username or new.space_slug is distinct from old.space_slug)
     and current_user in ('authenticated', 'anon') then
    raise exception 'PROFILE_SUSPENDED' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.mycen_suspended_no_rename() from public, anon, authenticated;

drop trigger if exists profiles_suspended_no_rename on public.profiles;
create trigger profiles_suspended_no_rename before update of username, space_slug on public.profiles
  for each row execute function public.mycen_suspended_no_rename();

-- ─── L4. "Publicado" sólo con una versión congelada ──────────────────────────────────────────────────
-- La app (rol authenticated) no puede dejar un Space publicado sin versión: eso lo hacen publish_space y
-- restore_space_version, que corren como su dueño y siempre ponen la versión.
-- Sin security definer a propósito: current_user tiene que ser quien hace el cambio
create or replace function public.mycen_published_needs_version()
returns trigger language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if new.status = 'published' and new.published_version_id is null and current_user in ('authenticated', 'anon') then
    raise exception 'PUBLISH_WITH_PUBLISH_SPACE' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.mycen_published_needs_version() from public, anon, authenticated;

drop trigger if exists profiles_published_needs_version on public.profiles;
create trigger profiles_published_needs_version before insert or update of status, published_version_id on public.profiles
  for each row execute function public.mycen_published_needs_version();

-- Los publicados sin versión (negocios importados, perfiles viejos) reciben la versión 1 con lo que tienen hoy
do $$
declare r record; v_id uuid;
begin
  for r in select id from profiles where status = 'published' and published_version_id is null loop
    insert into profile_versions (profile_id, version_number, snapshot, note)
    values (r.id, coalesce((select max(version_number) from profile_versions where profile_id = r.id), 0) + 1,
            mycen_space_snapshot(r.id), 'Versión inicial')
    returning id into v_id;
    update profiles set published_version_id = v_id where id = r.id;
  end loop;
end $$;

-- ─── L6/L10. Revisión de links sin huecos ────────────────────────────────────────────────────────────
-- Links ya revisados (nadie de la app lee la tabla). Un link se vuelve a revisar si se publica de nuevo después.
create table if not exists public.mycen_link_scans (
  url        text        primary key check (char_length(url) <= 2048),
  scanned_at timestamptz not null default now()
);
alter table public.mycen_link_scans enable row level security;
revoke all on public.mycen_link_scans from public, anon, authenticated;

-- Textos de lo publicado que pueden ser un link: con http(s) o un dominio suelto ("tienda.com/x", '"sitio.com"',
-- "https//sitio.com"). El scanner los arregla con la misma regla que la página (safeHref) antes de consultarlos.
create or replace function public.mycen_snapshot_link_candidates(p jsonb)
returns setof text language sql immutable set search_path = public, extensions, pg_temp as $$
  select distinct left(btrim(v #>> '{}'), 2048)
  from jsonb_path_query(coalesce(p, '{}'::jsonb), 'strict $.** ? (@.type() == "string")') as v
  where char_length(v #>> '{}') between 4 and 2048
    and (
      (v #>> '{}') ~* '^\s*[<"''“”‘’«]*https?:?/{0,3}[^\s]+\s*$'
      or (v #>> '{}') ~* '^\s*[<"''“”‘’«]*[^\s/@<>"''.]+(\.[^\s/@<>"''.]+)*\.[a-z]{2,}(:\d{1,5})?([/?#][^\s]*)?[>"''“”‘’».,;]*\s*$'
    );
$$;
revoke all on function public.mycen_snapshot_link_candidates(jsonb) from public, anon, authenticated;

-- Igual a 20261125000001, pero mira siempre los últimos 8 días, saca lo ya revisado después de publicarse y va en
-- orden (lo más viejo primero): lo que no entra en una pasada queda para la siguiente.
create or replace function public.cron_recent_links(p_key text, p_since timestamptz)
returns table (profile_id uuid, handle text, url text)
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
begin
  if not mycen_cron_key_ok(p_key) then raise exception 'BAD_KEY' using errcode = '42501'; end if;
  return query
    select x.profile_id, x.handle, x.url from (
      -- Spaces publicados (la versión que se ve)
      select p.id as profile_id, mycen_space_handle(p.id) as handle, l.u as url, v.created_at as at
      from profiles p
      join profile_versions v on v.id = p.published_version_id
      cross join lateral mycen_snapshot_link_candidates(v.snapshot) as l(u)
      where v.created_at >= now() - interval '8 days' and p.suspended_at is null
        and not exists (select 1 from mycen_link_scans s where s.url = l.u and s.scanned_at >= v.created_at)
      union all
      -- Proyectos publicados (a nombre del principal)
      select pr.id, mycen_space_handle(pr.id), l.u, o.published_at
      from content_objects o
      join profiles pr on pr.identity_id = o.identity_id and pr.is_primary
      cross join lateral mycen_snapshot_link_candidates(o.published_snapshot) as l(u)
      where o.status = 'published' and o.published_at >= now() - interval '8 days' and pr.suspended_at is null
        and not exists (select 1 from mycen_link_scans s where s.url = l.u and s.scanned_at >= o.published_at)
    ) x
    order by x.at, x.profile_id, x.url
    limit 20000;
end $$;
revoke all on function public.cron_recent_links(text, timestamptz) from public;
grant execute on function public.cron_recent_links(text, timestamptz) to anon, authenticated;

-- El scanner anota lo que revisó (los textos tal cual los devolvió cron_recent_links)
create or replace function public.cron_mark_links_scanned(p_key text, p_urls text[])
returns integer language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare n integer;
begin
  if not mycen_cron_key_ok(p_key) then raise exception 'BAD_KEY' using errcode = '42501'; end if;
  insert into mycen_link_scans (url, scanned_at)
  select distinct u, now() from unnest(coalesce(p_urls, '{}'::text[])) as u
  where u is not null and char_length(u) between 1 and 2048
  limit 5000
  on conflict (url) do update set scanned_at = excluded.scanned_at;
  get diagnostics n = row_count;
  -- Lo de más de 30 días ya no sirve (cron_recent_links mira 8)
  delete from mycen_link_scans where scanned_at < now() - interval '30 days';
  return n;
end $$;
revoke all on function public.cron_mark_links_scanned(text, text[]) from public;
grant execute on function public.cron_mark_links_scanned(text, text[]) to anon, authenticated;

-- ─── N13. Filas globales de Business: nadie de la app las escribe ─────────────────────────────────────
-- service_resource_types (is_system) y analytics_metric_definitions (restaurant_id null) son de todos los negocios;
-- sus políticas "FOR ALL" dejaban que cualquier cuenta las cambiara o borrara. Restrictivas: siguen visibles para leer,
-- pero escribir sólo lo propio del negocio.
do $$
begin
  if to_regclass('public.service_resource_types') is not null then
    execute 'drop policy if exists mycen_srt_system_readonly_ins on public.service_resource_types';
    execute 'drop policy if exists mycen_srt_system_readonly_upd on public.service_resource_types';
    execute 'drop policy if exists mycen_srt_system_readonly_del on public.service_resource_types';
    execute 'create policy mycen_srt_system_readonly_ins on public.service_resource_types as restrictive for insert to public with check (not is_system)';
    execute 'create policy mycen_srt_system_readonly_upd on public.service_resource_types as restrictive for update to public using (not is_system) with check (not is_system)';
    execute 'create policy mycen_srt_system_readonly_del on public.service_resource_types as restrictive for delete to public using (not is_system)';
  end if;
  if to_regclass('public.analytics_metric_definitions') is not null then
    execute 'drop policy if exists mycen_amd_global_readonly_ins on public.analytics_metric_definitions';
    execute 'drop policy if exists mycen_amd_global_readonly_upd on public.analytics_metric_definitions';
    execute 'drop policy if exists mycen_amd_global_readonly_del on public.analytics_metric_definitions';
    execute 'create policy mycen_amd_global_readonly_ins on public.analytics_metric_definitions as restrictive for insert to public with check (restaurant_id is not null)';
    execute 'create policy mycen_amd_global_readonly_upd on public.analytics_metric_definitions as restrictive for update to public using (restaurant_id is not null) with check (restaurant_id is not null)';
    execute 'create policy mycen_amd_global_readonly_del on public.analytics_metric_definitions as restrictive for delete to public using (restaurant_id is not null)';
  end if;
end $$;

notify pgrst, 'reload schema';
