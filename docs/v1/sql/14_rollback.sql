-- Vuelta atrás de la etapa 14 (métricas de producto propias). Borra los eventos guardados.
begin;
drop function if exists public.admin_product_metrics(int);
drop function if exists public.track_product_event(text, jsonb);
drop function if exists public.mycen_valid_event_props(jsonb);
drop function if exists public.mycen_valid_event_shape(text, jsonb);
drop table if exists public.product_events;
drop table if exists public.product_event_types;
commit;
notify pgrst, 'reload schema';
