-- Vuelta atrás de Lanzamiento L2 (20261013000001_launch_sitemap.sql). /sitemap.xml queda sólo con las páginas fijas.
begin;
drop function if exists public.public_sitemap(integer, integer);
commit;
notify pgrst, 'reload schema';
