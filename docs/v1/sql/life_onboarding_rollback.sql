-- Vuelta atrás de supabase/migrations/20261112000001_life_onboarding.sql: saca la columna del onboarding de Life OS
-- y sus tres eventos. La tabla product_event_types y track_product_event quedan (también son de life_os_metrics):
-- si hiciera falta volver a la lista fija de 20261022000001, usar la vuelta atrás de esa migración.
begin;

delete from public.product_events
 where event in ('life_onboarding_started', 'life_onboarding_completed', 'life_onboarding_skipped');
delete from public.product_event_types
 where event in ('life_onboarding_started', 'life_onboarding_completed', 'life_onboarding_skipped');
alter table public.user_settings drop column if exists life_onboarding_at;

commit;
