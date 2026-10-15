-- =============================================================================
-- Life OS · "¿Por qué lo hago?": cada hábito y cada meta puede guardar su propia frase ("¿Por qué es importante
-- para vos?"). Opcional, hasta 200 caracteres y sin quedar en blanco (vacío = null). La app la muestra en la ficha,
-- antes de archivar o borrar ("Lo empezaste porque: …") y en "Qué bueno verte de vuelta".
--
-- Sólo suma una columna por tabla: la RLS de cada una (cada cuenta lo suyo) no cambia, y exportar/borrar Life OS
-- ya incluye estas tablas enteras. Idempotente.
-- Vuelta atrás: docs/v1/sql/life_why_rollback.sql
-- =============================================================================

begin;

do $$
declare t text;
begin
  foreach t in array array['life_habits', 'life_goals'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I add column if not exists why text', t);
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_why_check');
    execute format('alter table public.%I add constraint %I check (why is null or (char_length(why) <= 200 and btrim(why) <> %L))',
      t, t || '_why_check', '');
  end loop;
end $$;

commit;
