-- Vuelta atrás de 20261108000001_restaurants_public_columns.sql: el visitante vuelve a leer `restaurants` entera
-- (con email, teléfono, dueño, plan, notas…). Usar sólo si el menú público dejó de funcionar y hasta corregirlo.
begin;
do $$
declare v_col text;
begin
  for v_col in select column_name from information_schema.columns
               where table_schema = 'public' and table_name = 'restaurants' loop
    execute format('revoke select (%I) on public.restaurants from anon', v_col);
  end loop;
end $$;
grant select on public.restaurants to anon;
commit;
