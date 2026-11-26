-- Auditoría de seguridad (24/11/2026), dos puntos "a validar" confirmados con el estado real de la base (26/11/2026):
--   N2. access_requests aceptaba inserciones directas de cualquiera, sin límites de largo y fuera de los topes por IP
--       (esos sólo miran las RPC). El formulario ya no existe (/solicitar-acceso lleva a /register): nadie inserta más.
--       El equipo sigue leyendo y resolviendo las que hay.
--   N4. organizations_owner_manage deja administrar una organización a quien tenga un negocio con ese
--       organization_id, y el dueño de un negocio podía ponerle cualquier organization_id. Desde la app ya no se cambia
--       (sólo el equipo, por SQL).
-- Idempotente. Se aplica en Supabase → SQL Editor. Tests: tests/db/security_audit_fixes_4.test.sql.

-- ─── N2. Sin altas de solicitudes de acceso desde la app ─────────────────────────────────────────────
do $$
begin
  if to_regclass('public.access_requests') is not null then
    execute 'drop policy if exists access_requests_public_insert on public.access_requests';
    execute 'drop policy if exists anon_insert_access_requests on public.access_requests';
    execute 'revoke insert on public.access_requests from anon, authenticated';
  end if;
end $$;

-- ─── N4. organization_id de un negocio no se cambia desde la app ─────────────────────────────────────
-- Sin security definer a propósito: current_user tiene que ser quien hace el cambio
create or replace function public.mycen_restaurant_org_locked()
returns trigger language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if current_user in ('authenticated', 'anon') and (
       (tg_op = 'INSERT' and new.organization_id is not null)
       or (tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id)) then
    raise exception 'ORGANIZATION_LOCKED' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.mycen_restaurant_org_locked() from public, anon, authenticated;

do $$
begin
  if to_regclass('public.restaurants') is not null and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'restaurants' and column_name = 'organization_id') then
    execute 'drop trigger if exists restaurants_org_locked on public.restaurants';
    execute 'create trigger restaurants_org_locked before insert or update of organization_id on public.restaurants
             for each row execute function public.mycen_restaurant_org_locked()';
  end if;
end $$;

notify pgrst, 'reload schema';
