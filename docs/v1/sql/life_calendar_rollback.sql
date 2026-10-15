-- Vuelta atrás de 20261028000001_life_calendar_feed.sql (los links de calendario dejan de funcionar)
begin;
drop function if exists public.life_calendar_feed(text);
drop function if exists public.life_calendar_disable();
drop function if exists public.life_calendar_token(boolean);
drop table if exists public.life_calendar_feeds;
commit;
