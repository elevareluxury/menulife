-- Vuelta atrás de 20261016000001_v1_media_module.sql (V1 · etapa 04).
-- Borra los módulos de video y música (si no, el check viejo no se puede volver a poner).
begin;
delete from public.profile_modules where type = 'media';
alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards','project','portfolio','link_group'
));
commit;
