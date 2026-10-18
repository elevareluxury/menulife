-- =============================================================================
-- Seguridad (antes de 20261108000001_restaurants_public_columns): las políticas "de dueños" de Mycen Business
-- (CRM, mozos, repartidores, platos, secciones, pedidos, reservas, servicios, avisos push…) estaban para todos los
-- roles (`public`) y consultan `restaurants.owner_id = auth.uid()`. Para un visitante esa condición nunca se cumple
-- (no tiene sesión), pero Postgres igual la evalúa: cuando el visitante deje de poder leer `owner_id`, esas consultas
-- fallarían ("permission denied") y, por ejemplo, el menú público no mostraría sus secciones.
--
-- Se dejan sólo para cuentas con sesión (`to authenticated`). No cambia lo que ve ni hace nadie: el dueño (con
-- sesión) sigue igual y el visitante ya no pasaba esa condición. Sólo se tocan las que dependen únicamente de
-- `restaurants.owner_id = auth.uid()` (sin OR): las de lectura o alta pública (menú, reservas, llamar al mozo,
-- verificar mozos y repartidores, Hub) no se tocan.
--
-- Idempotente. Deshacer: `alter policy "<nombre>" on public.<tabla> to public;` con la lista de los avisos.
-- =============================================================================
begin;

do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select p.tablename, p.policyname, coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') as expr
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename <> 'restaurants'
      and p.roles && array['anon', 'public']::name[]
  loop
    if r.expr ~* 'restaurants\.owner_id\s*=\s*auth\.uid\(\)' and r.expr !~* '\mor\M' then
      execute format('alter policy %I on public.%I to authenticated', r.policyname, r.tablename);
      raise notice 'Sólo con sesión: "%" (%)', r.policyname, r.tablename;
      n := n + 1;
    end if;
  end loop;
  raise notice 'Políticas de dueños pasadas a authenticated: %', n;
end $$;

commit;
