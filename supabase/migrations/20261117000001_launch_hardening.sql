-- =============================================================================
-- Blindaje de lanzamiento (auditoría de seguridad y rendimiento del 31/10/2026). Todo condicional e idempotente: las
-- tablas y funciones de Business se crearon en su momento y pueden no existir en todos los entornos.
--
--   1. Portal de clientes de Business: portal_request_magic_link devolvía el código de acceso en la respuesta
--      ("dev_code", modo de prueba): con el id público del negocio y el email de un cliente se entraba a su cuenta.
--      Se cierra el ingreso (request + verify) para todos hasta que el código salga por mail. Business está apagado.
--   2. Storage de Business (logos, archivos del negocio, Hub): cambiar o borrar un archivo exige ser quien lo subió
--      (antes bastaba con tener sesión), y se borran las políticas viejas que dejaban listar el bucket entero.
--   3. country_configs y date_dimension: con RLS; todos leen, nadie escribe desde la API.
--   4. restaurants: el dueño no puede cambiarse solo el plan, el estado de la suscripción ni el fin de la prueba
--      (sólo un super-admin o el servidor, sin sesión).
--   5. upsert_daily_snapshot: search_path fijo y sin llamada anónima.
--   6. app_error_hits: índice (hash, day) para report_client_error (cada reporte contaba las personas del día
--      recorriendo todo el día).
-- =============================================================================

begin;

-- ─── 1. Portal de clientes ───────────────────────────────────────────────────
do $$
declare f regprocedure;
begin
  foreach f in array array[
    to_regprocedure('public.portal_request_magic_link(text, uuid)'),
    to_regprocedure('public.portal_verify_code(text, text, uuid)')
  ] loop
    if f is not null then
      execute format('revoke all on function %s from public, anon, authenticated', f);
    end if;
  end loop;
end $$;

-- ─── 2. Storage de Business ──────────────────────────────────────────────────
do $$
declare
  b record;
begin
  if to_regclass('storage.objects') is null then return; end if;

  -- Lectura que dejaba listar todo el bucket (los links públicos de los archivos siguen andando: no pasan por RLS)
  drop policy if exists "Restaurant logos are publicly readable" on storage.objects;
  drop policy if exists "Hub assets are publicly readable" on storage.objects;
  drop policy if exists "Public can read restaurant assets" on storage.objects;

  -- Cambiar o borrar: sólo quien subió el archivo
  for b in
    select * from (values
      ('restaurant-logos',  'Owners can update restaurant logos', 'Owners can delete restaurant logos'),
      ('restaurant-assets', 'Auth can update restaurant assets',  'Auth can delete restaurant assets'),
      ('hub-assets',        'Owners can update hub assets',       'Owners can delete hub assets')
    ) as t(bucket, upd, del)
  loop
    execute format('drop policy if exists %I on storage.objects', b.upd);
    execute format('drop policy if exists %I on storage.objects', b.del);
    execute format('create policy %I on storage.objects for update to authenticated '
                   'using (bucket_id = %L and owner = (select auth.uid())) '
                   'with check (bucket_id = %L and owner = (select auth.uid()))', b.upd, b.bucket, b.bucket);
    execute format('create policy %I on storage.objects for delete to authenticated '
                   'using (bucket_id = %L and owner = (select auth.uid()))', b.del, b.bucket);
  end loop;
end $$;

-- ─── 3. Tablas de referencia sin RLS ─────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['country_configs', 'date_dimension'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
      execute format('drop policy if exists %I on public.%I', t || '_read', t);
      execute format('create policy %I on public.%I for select using (true)', t || '_read', t);
    end if;
  end loop;
end $$;

-- ─── 4. El plan lo cambia el equipo, no el dueño ─────────────────────────────
create or replace function public.mycen_guard_restaurant_plan()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  -- Sin sesión = servidor (service role, SQL Editor, webhooks de pago): puede
  if (select auth.uid()) is null or public.mycen_is_admin() then return new; end if;
  if new.plan is distinct from old.plan
     or new.subscription_status is distinct from old.subscription_status
     or new.trial_ends_at is distinct from old.trial_ends_at then
    raise exception 'PLAN_LOCKED' using errcode = '42501';
  end if;
  return new;
end $$;

revoke all on function public.mycen_guard_restaurant_plan() from public, anon, authenticated;

do $$
begin
  if to_regclass('public.restaurants') is not null
     and (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'restaurants'
          and column_name in ('plan', 'subscription_status', 'trial_ends_at')) = 3 then
    drop trigger if exists restaurants_plan_guard on public.restaurants;
    create trigger restaurants_plan_guard before update on public.restaurants
      for each row execute function public.mycen_guard_restaurant_plan();
  end if;
end $$;

-- ─── 5. upsert_daily_snapshot ────────────────────────────────────────────────
do $$
declare f regprocedure := to_regprocedure('public.upsert_daily_snapshot(uuid, date)');
begin
  if f is not null then
    execute format('alter function %s set search_path = public, extensions, pg_temp', f);
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end if;
end $$;

-- ─── 6. Índice para el registro de errores ───────────────────────────────────
do $$
begin
  if to_regclass('public.app_error_hits') is not null then
    create index if not exists app_error_hits_hash_day_idx on public.app_error_hits (hash, day);
  end if;
end $$;

commit;

notify pgrst, 'reload schema';
