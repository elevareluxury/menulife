-- Vuelta atrás de 20261023000001_security_hardening.sql (deja los permisos como estaban antes).
begin;
drop policy if exists super_admins_read on public.super_admins;
grant insert, update, delete on public.super_admins to authenticated;
create policy super_admins_read_all on public.super_admins for select to authenticated using (true);

do $$ begin
  if to_regclass('public.site_config') is not null then
    execute 'drop policy if exists site_config_admin on public.site_config';
    execute $p$create policy "Super admins manage site_config" on public.site_config
      for all to authenticated using (true) with check (true)$p$;
  end if;
end $$;

drop policy if exists "profile_media_owner_select" on storage.objects;
create policy "profile_media_public_read" on storage.objects
  for select to public using (bucket_id = 'profile-media');
commit;

-- Vuelta atrás de 20261023000002_access_requests_admin.sql
begin;
do $$ begin
  if to_regclass('public.access_requests') is not null then
    execute 'drop policy if exists access_requests_public_insert on public.access_requests';
    execute 'drop policy if exists access_requests_admin_select on public.access_requests';
    execute 'drop policy if exists access_requests_admin_update on public.access_requests';
    execute 'drop policy if exists access_requests_admin_delete on public.access_requests';
    execute $p$create policy anon_insert_access_requests on public.access_requests for insert to anon with check (true)$p$;
    execute $p$create policy authenticated_read_access_requests on public.access_requests for select to authenticated using (true)$p$;
    execute $p$create policy authenticated_update_access_requests on public.access_requests for update to authenticated using (true) with check (true)$p$;
  end if;
end $$;
commit;
