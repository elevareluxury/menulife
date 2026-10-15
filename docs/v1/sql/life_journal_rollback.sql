-- Vuelta atrás de 20261030000004_life_journal.sql.
-- Ojo: borra todas las entradas del diario de todas las cuentas. Si hace falta conservarlas, exportarlas antes.
begin;
drop table if exists public.life_journal_entries;
drop function if exists public.life_journal_rules();
commit;
