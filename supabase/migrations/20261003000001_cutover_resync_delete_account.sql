-- =============================================================================
-- MYCEN · Corte Hub → Profile + eliminación de cuenta
-- =============================================================================
-- 1. Re-sincroniza desde el Hub los perfiles cuyo Hub cambió después de la
--    importación inicial y que NO tienen módulos editados en Studio.
-- 2. Importa negocios creados después de la importación inicial.
-- 3. delete_my_account(): el usuario puede eliminar su cuenta (no aplica a
--    dueños de un negocio de Mycen Business, que deben pedirlo a soporte).
-- Al final muestra un reporte por negocio.
-- =============================================================================

begin;

-- ─── 1 y 2. Sincronización final ─────────────────────────────────────────────
create temporary table _mycen_cutover (restaurant_slug text, profile_username text, result text) on commit drop;

do $$
declare
  r record;
begin
  for r in
    select i.restaurant_id, x.slug, i.profile_id, p.username,
      -- ¿Cambió algo del Hub después de importar?
      (
        x.updated_at > i.imported_at + interval '5 seconds'
        or exists (select 1 from public.hub_links t   where t.restaurant_id = x.id and coalesce((to_jsonb(t) ->> 'updated_at')::timestamptz, (to_jsonb(t) ->> 'created_at')::timestamptz) > i.imported_at + interval '5 seconds')
        or exists (select 1 from public.hub_stories t where t.restaurant_id = x.id and coalesce((to_jsonb(t) ->> 'updated_at')::timestamptz, (to_jsonb(t) ->> 'created_at')::timestamptz) > i.imported_at + interval '5 seconds')
        or exists (select 1 from public.hub_gallery t where t.restaurant_id = x.id and coalesce((to_jsonb(t) ->> 'updated_at')::timestamptz, (to_jsonb(t) ->> 'created_at')::timestamptz) > i.imported_at + interval '5 seconds')
        or exists (select 1 from public.hub_reviews t where t.restaurant_id = x.id and coalesce((to_jsonb(t) ->> 'updated_at')::timestamptz, (to_jsonb(t) ->> 'created_at')::timestamptz) > i.imported_at + interval '5 seconds')
        or exists (select 1 from public.hub_featured_product t where t.restaurant_id = x.id and coalesce((to_jsonb(t) ->> 'updated_at')::timestamptz, (to_jsonb(t) ->> 'created_at')::timestamptz) > i.imported_at + interval '5 seconds')
        or exists (select 1 from public.hub_config t  where t.restaurant_id = x.id and coalesce((to_jsonb(t) ->> 'updated_at')::timestamptz, (to_jsonb(t) ->> 'created_at')::timestamptz) > i.imported_at + interval '5 seconds')
      ) as hub_changed,
      -- ¿El dueño trabajó sus módulos en Studio?
      exists (
        select 1 from public.profile_modules m
        where m.profile_id = i.profile_id
          and (not (m.config ? 'legacy_source') or m.updated_at > i.imported_at + interval '5 seconds' or m.deleted_at is not null)
      ) as studio_edited
    from mycen_private.hub_imports i
    join public.restaurants x on x.id = i.restaurant_id
    join public.profiles p on p.id = i.profile_id
  loop
    if r.hub_changed and not r.studio_edited then
      insert into _mycen_cutover
      select restaurant_slug, profile_username, 're-sincronizado desde el Hub'
      from public.mycen_import_hub(r.restaurant_id, true, false);
    elsif r.hub_changed then
      insert into _mycen_cutover values (r.slug, r.username, 'el Hub cambió, pero se conserva lo editado en Studio');
    else
      insert into _mycen_cutover values (r.slug, r.username, 'sin cambios en el Hub');
    end if;
  end loop;

  -- Negocios creados después de la importación inicial
  insert into _mycen_cutover
  select * from public.mycen_import_hub()
  where restaurant_slug not in (select restaurant_slug from _mycen_cutover);
end $$;

-- ─── 3. Eliminar mi cuenta ───────────────────────────────────────────────────
create or replace function public.delete_my_account()
returns void language plpgsql volatile security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if exists (select 1 from public.restaurants where owner_id = v_uid) then
    raise exception 'HAS_BUSINESS' using errcode = 'P0001';
  end if;
  -- Borra el usuario: perfiles, módulos, eventos y datos de Life OS se eliminan en cascada
  delete from auth.users where id = v_uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

select * from _mycen_cutover order by restaurant_slug;

commit;
