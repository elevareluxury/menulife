-- Vuelta atrás de supabase/migrations/20261015000001_v1_profile_look.sql (V1 · etapa 03).
-- Las columnas nuevas quedan (no se borran datos): sólo se quitan las validaciones y se restauran las funciones
-- de la Fase 10 (get_public_profile sin perfil vivo) pegando de nuevo 20261012000001_identity_spaces.sql, y las de
-- la Fase 3 (mycen_space_snapshot / mycen_apply_snapshot) de 20261007000001 y 20261008000001.
begin;
alter table public.profiles drop constraint if exists profiles_theme_look_check;
alter table public.profiles drop constraint if exists profiles_status_text_check;
alter table public.profiles drop constraint if exists profiles_huella_salt_check;
drop trigger if exists profiles_status_text on public.profiles;
drop function if exists public.mycen_profile_status_text();
drop function if exists public.mycen_valid_profile_look(jsonb);
drop function if exists public.mycen_upgrade_theme(jsonb);
drop function if exists public.mycen_nearest_accent(text);
commit;
