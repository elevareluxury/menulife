-- =============================================================================
-- Interruptores del sitio: partes de Mycen que se prenden o apagan sin publicar una versión nueva.
--
--   · mycen_site_flags (clave → prendido): nadie lee ni escribe la tabla directo.
--   · get_site_flags(): anónima, devuelve { "business": false, … } (sólo claves conocidas).
--   · admin_set_site_flag(p_key, p_enabled): sólo super-admins.
--   · Hoy hay una: 'business' = mostrar Mycen Business en la landing (sección, precios, menú y preguntas).
--     Apagada de entrada. La app no cambia: quien ya tiene un negocio lo sigue usando igual.
--
-- Idempotente.
-- Vuelta atrás: drop function public.admin_set_site_flag(text, boolean); drop function public.get_site_flags();
--               drop table public.mycen_site_flags;
-- =============================================================================

begin;

create table if not exists public.mycen_site_flags (
  key        text primary key check (key in ('business')),
  enabled    boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.mycen_site_flags enable row level security;
revoke all on public.mycen_site_flags from anon, authenticated;

insert into public.mycen_site_flags (key, enabled) values ('business', false) on conflict (key) do nothing;

create or replace function public.get_site_flags()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('business', coalesce((select enabled from mycen_site_flags where key = 'business'), false));
$$;

revoke all on function public.get_site_flags() from public;
grant execute on function public.get_site_flags() to anon, authenticated;

create or replace function public.admin_set_site_flag(p_key text, p_enabled boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.mycen_is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;
  if p_key is null or p_key not in ('business') or p_enabled is null then
    raise exception 'INVALID_FLAG' using errcode = '22023';
  end if;
  insert into mycen_site_flags (key, enabled, updated_at, updated_by)
  values (p_key, p_enabled, now(), auth.uid())
  on conflict (key) do update set enabled = excluded.enabled, updated_at = now(), updated_by = auth.uid();
  return public.get_site_flags();
end $$;

revoke all on function public.admin_set_site_flag(text, boolean) from public, anon;
grant execute on function public.admin_set_site_flag(text, boolean) to authenticated;

commit;
