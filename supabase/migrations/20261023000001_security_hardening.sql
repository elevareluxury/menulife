-- =============================================================================
-- Seguridad (auditoría previa a la V1): cierra permisos que sobraban.
--
--   · super_admins: nadie la escribe desde la app (sólo SQL Editor / service_role). Cada cuenta lee su propia fila
--     (para saber si es admin) y los admins leen la lista. Se reemplazan todas las políticas que hubiera.
--   · site_config: la política se llamaba "Super admins manage site_config" pero dejaba leer y cambiar a cualquier
--     cuenta. Ahora sólo los super-admins.
--   · profile-media (fotos): el bucket es público, así que las fotos se ven por su URL sin ninguna política. La
--     política de lectura para todos permitía además LISTAR todos los archivos de todas las cuentas; ahora cada
--     cuenta lista sólo su carpeta (la usa "borrar mi cuenta").
--
-- Requiere 20261011000001_identity_moderation.sql (mycen_is_admin). Idempotente.
-- Vuelta atrás: docs/v1/sql/seguridad_rollback.sql
-- =============================================================================

begin;

-- ─── super_admins ────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'super_admins' loop
    execute format('drop policy %I on public.super_admins', r.policyname);
  end loop;
end $$;

alter table public.super_admins enable row level security;
revoke all on public.super_admins from anon;
revoke insert, update, delete, truncate, references, trigger on public.super_admins from authenticated;
grant select on public.super_admins to authenticated;

create policy super_admins_read on public.super_admins
  for select to authenticated
  using (user_id = auth.uid() or public.mycen_is_admin());

-- ─── site_config ─────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  if to_regclass('public.site_config') is null then return; end if;
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'site_config' loop
    execute format('drop policy %I on public.site_config', r.policyname);
  end loop;
  execute 'alter table public.site_config enable row level security';
  execute 'revoke all on public.site_config from anon';
  execute $p$create policy site_config_admin on public.site_config
    for all to authenticated using (public.mycen_is_admin()) with check (public.mycen_is_admin())$p$;
end $$;

-- ─── Fotos de perfil: sin listado público ────────────────────────────────────
drop policy if exists "profile_media_public_read" on storage.objects;
drop policy if exists "profile_media_owner_select" on storage.objects;
create policy "profile_media_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
