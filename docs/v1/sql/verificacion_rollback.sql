-- Vuelta atrás de 20261025000001_v1_verification.sql. get_public_profile queda devolviendo 'verified' (inofensivo);
-- para sacarlo, volver a correr la definición de 20261015000001_v1_profile_look.sql.
begin;
drop function if exists public.admin_resolve_verification(uuid, boolean, text);
drop function if exists public.admin_set_verified(uuid, boolean);
drop function if exists public.admin_list_verifications(text);
drop function if exists public.request_verification(text, text);
drop table if exists public.verification_requests;
drop trigger if exists identities_verification_guard on public.identities;
drop trigger if exists identities_verification_insert_guard on public.identities;
drop function if exists public.mycen_verification_guard();
drop function if exists public.mycen_verification_insert_guard();
alter table public.identities drop column if exists verified_at;
commit;
