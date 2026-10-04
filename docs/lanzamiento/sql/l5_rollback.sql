-- Vuelta atrás de 20261014000001_launch_errors.sql (registro de errores). Borra los errores guardados.
begin;
drop function if exists public.admin_error_summary();
drop function if exists public.admin_set_error_status(uuid, text, text);
drop function if exists public.admin_list_errors(text);
drop function if exists public.report_client_error(text, text, text, text, text, text);
drop table if exists public.app_error_hits;
drop table if exists public.app_errors;
commit;
notify pgrst, 'reload schema';
