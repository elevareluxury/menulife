-- Escala (etapa 3) y auditoría N12: tope de espacio por cuenta para fotos y PDF de los perfiles.
--   · Hasta 1 GB y 3000 archivos por cuenta entre profile-media y profile-files (hoy la cuenta que más usa tiene 10 MB:
--     una foto ya achicada pesa ~300 KB). Lo mira una política restrictiva al subir: cuenta lo que la carpeta ya tiene,
--     así que una subida de más pasa como mucho por un archivo (5 MB foto, 10 MB PDF) y la siguiente se frena.
--   · mycen_storage_usage(): lo que usa la propia cuenta y los topes (Studio lo usa para explicar el error).
--   · Borrar fotos o PDF libera lugar enseguida. El equipo (service role) no tiene tope.
-- Idempotente. Se aplica en Supabase → SQL Editor. Tests: tests/db/storage_quota.test.sql.

create schema if not exists mycen_private;

create or replace function mycen_private.storage_quota()
returns table (max_bytes bigint, max_files integer) language sql immutable set search_path = public, extensions, pg_temp as $$
  select 1073741824::bigint, 3000;
$$;
revoke all on function mycen_private.storage_quota() from public, anon;
grant execute on function mycen_private.storage_quota() to authenticated;

-- Lo que ya hay en la carpeta (= id de la cuenta) de los dos buckets de perfiles
create or replace function mycen_private.folder_usage(p_folder text)
returns table (bytes bigint, files integer) language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select coalesce(sum(case when (o.metadata ->> 'size') ~ '^[0-9]{1,15}$' then (o.metadata ->> 'size')::bigint end), 0)::bigint,
         count(*)::integer
  from storage.objects o
  where o.bucket_id in ('profile-media', 'profile-files')
    and o.name collate "C" like p_folder || '/%';
$$;
revoke all on function mycen_private.folder_usage(text) from public, anon;
grant execute on function mycen_private.folder_usage(text) to authenticated;

-- ¿Entra un archivo más en esta carpeta? Una carpeta que no es un id de cuenta no suma (la frenan las otras políticas)
create or replace function mycen_private.folder_has_room(p_name text)
returns boolean language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_folder text := split_part(coalesce(p_name, ''), '/', 1);
  v_used record;
  v_quota record;
begin
  if v_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return true; end if;
  select * into v_used from mycen_private.folder_usage(v_folder);
  select * into v_quota from mycen_private.storage_quota();
  return v_used.bytes < v_quota.max_bytes and v_used.files < v_quota.max_files;
end $$;
revoke all on function mycen_private.folder_has_room(text) from public, anon;
grant execute on function mycen_private.folder_has_room(text) to authenticated;

drop policy if exists mycen_storage_quota_insert on storage.objects;
create policy mycen_storage_quota_insert on storage.objects as restrictive for insert to authenticated
  with check (bucket_id not in ('profile-media', 'profile-files') or mycen_private.folder_has_room(name));

-- Lo que usa la propia cuenta (para la app)
create or replace function public.mycen_storage_usage()
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_used record;
  v_quota record;
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  select * into v_used from mycen_private.folder_usage(auth.uid()::text);
  select * into v_quota from mycen_private.storage_quota();
  return jsonb_build_object('bytes', v_used.bytes, 'files', v_used.files,
    'max_bytes', v_quota.max_bytes, 'max_files', v_quota.max_files,
    'full', v_used.bytes >= v_quota.max_bytes or v_used.files >= v_quota.max_files);
end $$;
revoke all on function public.mycen_storage_usage() from public, anon;
grant execute on function public.mycen_storage_usage() to authenticated;

notify pgrst, 'reload schema';
