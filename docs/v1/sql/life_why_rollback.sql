-- Vuelta atrás de 20261030000003_life_why.sql (borra las frases guardadas)
begin;
do $$
declare t text;
begin
  foreach t in array array['life_habits', 'life_goals'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I drop constraint if exists %I', t, t || '_why_check');
      execute format('alter table public.%I drop column if exists why', t);
    end if;
  end loop;
end $$;
commit;
