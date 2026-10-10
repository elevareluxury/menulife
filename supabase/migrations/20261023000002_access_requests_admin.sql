-- =============================================================================
-- Seguridad (auditoría V1, segunda parte): solicitudes de acceso a Business (access_requests).
--
--   Antes: cualquier cuenta podía LEER todas las solicitudes (nombre, email, teléfono, ciudad) y aprobarlas o
--   rechazarlas ("superadmin route is app-level protected": la app escondía la pantalla, la base no protegía nada).
--   Ahora: leer, cambiar y borrar sólo los super-admins. El formulario público sigue pudiendo enviar solicitudes,
--   pero sólo nuevas (status 'pending').
--
-- Requiere 20261011000001_identity_moderation.sql (mycen_is_admin). Idempotente.
-- Vuelta atrás: docs/v1/sql/seguridad_rollback.sql
-- =============================================================================

begin;

do $$
declare r record;
begin
  if to_regclass('public.access_requests') is null then return; end if;

  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'access_requests' loop
    execute format('drop policy %I on public.access_requests', r.policyname);
  end loop;
  execute 'alter table public.access_requests enable row level security';

  -- El formulario público: sólo solicitudes nuevas
  execute $p$create policy access_requests_public_insert on public.access_requests
    for insert to anon, authenticated with check (coalesce(status, 'pending') = 'pending')$p$;
  -- Revisarlas: sólo super-admins
  execute $p$create policy access_requests_admin_select on public.access_requests
    for select to authenticated using (public.mycen_is_admin())$p$;
  execute $p$create policy access_requests_admin_update on public.access_requests
    for update to authenticated using (public.mycen_is_admin()) with check (public.mycen_is_admin())$p$;
  execute $p$create policy access_requests_admin_delete on public.access_requests
    for delete to authenticated using (public.mycen_is_admin())$p$;
end $$;

commit;
