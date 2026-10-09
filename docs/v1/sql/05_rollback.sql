-- Vuelta atrás de 20261017000001_v1_profile_messages.sql (V1 · etapa 05). Borra los mensajes recibidos.
begin;
drop function if exists public.submit_profile_message(text, text, text, text, text, integer);
drop table if exists public.profile_messages;
delete from public.profile_modules where type = 'contact_form';
alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards','project','portfolio','link_group','media'
));
commit;
