-- Módulos para la página de bio (V1.1): Apoyame (support), Suscribirse (subscribe), Último video (latest_video),
-- Escuchá en (listen_on) y Colaboraciones (collab). Sólo el tipo: las tablas y RPC de cada uno van en su migración.
-- Idempotente.

alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards','project','portfolio','link_group','media','contact_form',
  'support','subscribe','latest_video','listen_on','collab'
));
