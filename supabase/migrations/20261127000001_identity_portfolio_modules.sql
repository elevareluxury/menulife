-- =============================================================================
-- Identity · portfolio profesional (modelos, actores, influencers, músicos y creativos). Idempotente.
--
--   Seis tipos nuevos de módulo, todo en `content` y publicado con el Space como el resto (la página vuelve a validar
--   lo guardado al dibujarlo, `profile/lib/portfolio.ts`):
--     · measurements   medidas en cm (y en pulgadas en la página) y talles; cada talento elige cuáles mostrar
--     · audience       media kit: seguidores, vistas y engagement por red, cargados por la persona con la fecha
--                      (`as_of`); más de un año sin actualizar = no se muestra
--     · brands         marcas con las que trabajó (logo, link, año)
--     · press          prensa: cita + medio + link
--     · credits        créditos: obra, rol, año, productora
--     · representation agencia, booking, management, sello o prensa con email, teléfono y web
--   No agrega tablas ni funciones. Ocultar = el ojo del módulo, como siempre.
--
--   Tipos de talento del onboarding (para qué es el perfil): model, actor, influencer, musician, creative.
-- =============================================================================

begin;

alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards','project','portfolio','link_group','media','contact_form',
  'support','subscribe','latest_video','listen_on','collab',
  'poll','downloads','coupon','video_gallery','podcast',
  'events',
  'measurements','audience','brands','press','credits','representation'
));

alter table public.profiles drop constraint if exists profiles_purpose_check;
alter table public.profiles add constraint profiles_purpose_check
  check (purpose in ('personal', 'professional', 'creator', 'artist', 'business', 'brand', 'project', 'event', 'custom',
                     'model', 'actor', 'influencer', 'musician', 'creative'));

commit;

notify pgrst, 'reload schema';
