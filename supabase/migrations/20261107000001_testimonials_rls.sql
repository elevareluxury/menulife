-- =============================================================================
-- Landing: los testimonios daban error 500 ("infinite recursion detected in policy for relation superadmins").
-- En producción la tabla testimonials tenía, además de la lectura pública de 20260603000002, una política creada a
-- mano que consulta la tabla vieja `superadmins`, cuya propia política se consulta a sí misma.
--
--   · Se borran todas las políticas de testimonials (los nombres de producción no están en el repo) y quedan dos:
--     leer los activos (cualquiera) y todo para el equipo (mycen_is_admin(), sobre super_admins).
--   · Los 3 testimonios de ejemplo de 20260603000002 (Valeria Moreno, Rodrigo Altamirano, Sebastián Cruz) no son de
--     personas reales: quedan inactivos (CLAUDE.md: nada inventado). El equipo los puede editar o borrar en el panel.
--   · No toca la tabla `superadmins` (legado): dejar de usarla alcanza para que la landing ande.
--
-- Deshacer: volver a crear la política "Anyone can read testimonials" (using true) y, si hiciera falta,
--   update public.testimonials set is_active = true where name in ('Valeria Moreno', 'Rodrigo Altamirano', 'Sebastián Cruz');
-- =============================================================================
begin;

do $$
declare p record;
begin
  if to_regclass('public.testimonials') is null then return; end if;

  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'testimonials' loop
    execute format('drop policy %I on public.testimonials', p.policyname);
  end loop;

  alter table public.testimonials enable row level security;

  -- Leer: sólo los activos, para cualquiera (sin funciones: mycen_is_admin no se puede ejecutar como anon)
  create policy testimonials_public_read on public.testimonials for select to anon, authenticated
    using (is_active = true);
  -- El equipo ve todos y los carga, edita y borra (panel → Testimonios)
  create policy testimonials_admin_all on public.testimonials for all to authenticated
    using (public.mycen_is_admin()) with check (public.mycen_is_admin());

  grant select on public.testimonials to anon, authenticated;
  grant insert, update, delete on public.testimonials to authenticated;

  -- Los de ejemplo (no son personas reales)
  update public.testimonials set is_active = false
  where name in ('Valeria Moreno', 'Rodrigo Altamirano', 'Sebastián Cruz');
end $$;

commit;
