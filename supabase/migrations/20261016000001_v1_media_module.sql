-- =============================================================================
-- Mycen V1 · Etapa 04 — Módulo de video y música ('media')
--
-- Suma el tipo 'media' a los módulos del perfil. El contenido guarda el link que pegó el dueño (content.url) y,
-- de referencia, el proveedor detectado. La página pública nunca usa ese link como src: arma el reproductor con el
-- id validado (src/modules/profile/lib/media.ts) y sólo cuando el visitante toca "Reproducir".
--
-- Requiere 20261010000001_identity_links_connect.sql. Idempotente.
-- Vuelta atrás: docs/v1/sql/04_rollback.sql
-- =============================================================================

begin;

alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards','project','portfolio','link_group','media'
));

commit;
