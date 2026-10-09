-- =============================================================================
-- Mycen V1 · Etapa 08 — "Creá tu identidad": de qué perfil llegó cada cuenta nueva
--
--   · El pie de cada perfil lleva a /register?ref=<handle>&tipo=<propósito>. El registro guarda ref y tipo en los
--     datos de la cuenta y, cuando la persona crea su perfil en el onboarding, Studio llama a record_referral.
--   · referrals: una fila por cuenta (la primera atribución gana), con el perfil que la trajo (referred_by).
--     La persona ve sólo la suya; nadie inserta directo (sólo la RPC, security definer). No se guarda nada del
--     visitante ni del navegador.
--   · No cuenta: el propio perfil, perfiles sin publicar, privados o suspendidos.
--
-- Requiere las migraciones de Identity y V1 hasta 20261017000001. Idempotente.
-- Vuelta atrás: docs/v1/sql/08_rollback.sql
-- =============================================================================

begin;

create table if not exists public.referrals (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  -- Perfil (Space) que trajo la cuenta; si se borra, la atribución queda sin perfil
  referred_by uuid references public.profiles(id) on delete set null,
  -- Propósito con el que llegó (el del perfil que la trajo), para preseleccionarlo en el onboarding
  purpose     text check (purpose is null or purpose ~ '^[a-z_]{1,30}$'),
  created_at  timestamptz not null default now()
);

create index if not exists referrals_referred_by_idx on public.referrals (referred_by, created_at desc);

alter table public.referrals enable row level security;

drop policy if exists referrals_own_select on public.referrals;
create policy referrals_own_select on public.referrals for select to authenticated
  using (user_id = auth.uid());

revoke all on public.referrals from anon, authenticated;
grant select on public.referrals to authenticated;

-- Atribuye la cuenta actual al perfil p_ref ("ana" o "ana/estudio"). Devuelve 'ok', 'already', 'self',
-- 'not_found' o 'not_signed_in'.
create or replace function public.record_referral(p_ref text, p_purpose text default null)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_id   uuid;
  v      public.profiles;
  v_purp text := nullif(lower(btrim(coalesce(p_purpose, ''))), '');
begin
  if v_uid is null then return 'not_signed_in'; end if;
  if exists (select 1 from referrals where user_id = v_uid) then return 'already'; end if;

  select o_id into v_id from mycen_find_space(p_ref);
  select * into v from profiles where id = v_id;
  if not found or v.status <> 'published' or v.visibility = 'private' or mycen_space_suspended(v.id) then
    return 'not_found';
  end if;
  if v.user_id = v_uid then return 'self'; end if;
  if v_purp is not null and v_purp !~ '^[a-z_]{1,30}$' then v_purp := null; end if;

  insert into referrals (user_id, referred_by, purpose) values (v_uid, v.id, v_purp)
  on conflict (user_id) do nothing;
  return 'ok';
end $$;

revoke all on function public.record_referral(text, text) from public, anon;
grant execute on function public.record_referral(text, text) to authenticated;

commit;
