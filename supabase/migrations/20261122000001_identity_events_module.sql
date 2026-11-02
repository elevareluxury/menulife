-- =============================================================================
-- Identity · módulo "Eventos" (ticketera para productoras). Idempotente.
--
--   Tipo nuevo `events`: un carrusel de eventos con portada, fecha y hora, lugar, etiqueta, descripción (se lee al
--   entrar al evento) y link de entradas. Todo vive en `content.items` del módulo, se publica con el Space como el
--   resto y la página lo vuelve a validar al dibujarlo. No agrega tablas ni funciones.
-- =============================================================================

begin;

alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards','project','portfolio','link_group','media','contact_form',
  'support','subscribe','latest_video','listen_on','collab',
  'poll','downloads','coupon','video_gallery','podcast',
  'events'
));

commit;

notify pgrst, 'reload schema';
