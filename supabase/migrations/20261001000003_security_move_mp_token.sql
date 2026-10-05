-- =============================================================================
-- MYCEN · Fase 0 · Paso 4 — SEGURIDAD: sacar el token de MercadoPago de restaurants
-- =============================================================================
-- Problema: restaurants.mercadopago_access_token está en la misma tabla que leen
-- las páginas públicas (/:slug, /r/:slug, /catalogo/:slug) con select('*').
-- Cualquier visitante anónimo puede leerlo.
--
-- Solución: mover el token a una tabla privada (solo el dueño la ve) y eliminar
-- la columna de restaurants. Ningún código de la app usa esa columna hoy.
--
-- DESPUÉS DE CORRERLO: si había tokens cargados, regenerarlos en MercadoPago
-- (Tus integraciones → Credenciales), porque pudieron haber quedado expuestos.
-- =============================================================================

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

    -- Vistas que dependan de la columna harían fallar el DROP: en ese caso
    -- la transacción se revierte entera y no se pierde nada.
    alter table public.restaurants drop column mercadopago_access_token;
  end if;
end $$;

commit;

select count(*) as tokens_movidos from public.restaurant_secrets;
