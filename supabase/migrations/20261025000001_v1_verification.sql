-- =============================================================================
-- Verificación de cuenta (después de la etapa 15; antes estaba anotada para la V1.1)
--
--   · verification_requests: la persona pide la verificación desde Studio → Ajustes con un mensaje y un link
--     opcional (https). Una pendiente por vez y hasta 3 pedidos cada 30 días (request_verification). La lee sólo su
--     dueño (RLS); nadie escribe directo.
--   · identities.verified_at: la cuenta está verificada. Sólo la cambian los super-admins con
--     admin_resolve_verification (trigger mycen_verification_guard): el dueño no puede ponérselo.
--   · get_public_profile devuelve 'verified' (todos los Spaces de la identidad); la página muestra el tilde.
--   · Super-admin: admin_list_verifications(status) y admin_resolve_verification(id, aprobar, nota), y
--     admin_set_verified(user_id, verificado) para quitar o dar la verificación sin pedido.
--
-- Requiere 20261011000001_identity_moderation.sql (mycen_assert_admin). Idempotente.
-- Vuelta atrás: docs/v1/sql/verificacion_rollback.sql
-- =============================================================================

begin;

alter table public.identities add column if not exists verified_at timestamptz;

create or replace function public.mycen_verification_guard()
returns trigger language plpgsql as $$
begin
  if new.verified_at is distinct from old.verified_at
     and coalesce(current_setting('mycen.verifying', true), '') <> 'on' then
    raise exception 'VERIFICATION_LOCKED' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists identities_verification_guard on public.identities;
create trigger identities_verification_guard
  before update on public.identities
  for each row execute function public.mycen_verification_guard();

-- Una identidad nueva no nace verificada
create or replace function public.mycen_verification_insert_guard()
returns trigger language plpgsql as $$
begin
  if new.verified_at is not null and coalesce(current_setting('mycen.verifying', true), '') <> 'on' then
    new.verified_at := null;
  end if;
  return new;
end $$;

drop trigger if exists identities_verification_insert_guard on public.identities;
create trigger identities_verification_insert_guard
  before insert on public.identities
  for each row execute function public.mycen_verification_insert_guard();

create table if not exists public.verification_requests (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  identity_id  uuid        not null references public.identities(id) on delete cascade,
  message      text        not null check (char_length(message) between 10 and 1000),
  link         text        check (link is null or (char_length(link) <= 300 and link ~ '^https://')),
  status       text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note   text        check (admin_note is null or char_length(admin_note) <= 300),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

create index if not exists verification_requests_user on public.verification_requests (user_id, created_at desc);
create index if not exists verification_requests_status on public.verification_requests (status, created_at desc);
create unique index if not exists verification_requests_one_pending
  on public.verification_requests (user_id) where status = 'pending';

alter table public.verification_requests enable row level security;
revoke all on public.verification_requests from anon, authenticated;
grant select on public.verification_requests to authenticated;
drop policy if exists verification_requests_own_select on public.verification_requests;
create policy verification_requests_own_select on public.verification_requests
  for select to authenticated using (user_id = auth.uid());

-- Pedir la verificación. Devuelve 'ok' | 'invalid' | 'pending' (ya hay uno) | 'verified' (ya está) | 'limited'
create or replace function public.request_verification(p_message text, p_link text default null)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v_user     uuid := auth.uid();
  v_identity uuid;
  v_message  text := btrim(coalesce(p_message, ''));
  v_link     text := nullif(btrim(coalesce(p_link, '')), '');
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  select id into v_identity from identities where user_id = v_user;
  if v_identity is null then return 'invalid'; end if;
  if char_length(v_message) < 10 or char_length(v_message) > 1000 then return 'invalid'; end if;
  if v_link is not null and (char_length(v_link) > 300 or v_link !~ '^https://') then return 'invalid'; end if;
  if exists (select 1 from identities where id = v_identity and verified_at is not null) then return 'verified'; end if;
  if exists (select 1 from verification_requests where user_id = v_user and status = 'pending') then return 'pending'; end if;
  if (select count(*) from verification_requests where user_id = v_user and created_at > now() - interval '30 days') >= 3 then
    return 'limited';
  end if;
  insert into verification_requests (user_id, identity_id, message, link) values (v_user, v_identity, v_message, v_link);
  return 'ok';
end $$;

revoke all on function public.request_verification(text, text) from public, anon;
grant execute on function public.request_verification(text, text) to authenticated;

-- ─── Super-admin ─────────────────────────────────────────────────────────────

create or replace function public.admin_list_verifications(p_status text default 'pending')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mycen_assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id, 'message', r.message, 'link', r.link, 'status', r.status, 'admin_note', r.admin_note,
             'created_at', r.created_at, 'reviewed_at', r.reviewed_at, 'user_id', r.user_id,
             'email', (select u.email from auth.users u where u.id = r.user_id),
             'verified', i.verified_at is not null,
             'profile', (select jsonb_build_object('username', p.username, 'display_name', p.display_name, 'status', p.status)
                         from profiles p where p.id = i.primary_space_id))
           order by r.created_at desc)
    from (
      select * from verification_requests
      where case coalesce(p_status, 'pending') when 'pending' then status = 'pending'
                                               when 'resolved' then status <> 'pending' else true end
      order by created_at desc limit 200
    ) r
    join identities i on i.id = r.identity_id
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_set_verified(p_user_id uuid, p_verified boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  perform mycen_assert_admin();
  perform set_config('mycen.verifying', 'on', true);
  update identities set verified_at = case when p_verified then coalesce(verified_at, now()) end where user_id = p_user_id;
  perform set_config('mycen.verifying', '', true);
end $$;

create or replace function public.admin_resolve_verification(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_user uuid;
begin
  perform mycen_assert_admin();
  update verification_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         admin_note = left(nullif(btrim(coalesce(p_note, '')), ''), 300),
         reviewed_at = now()
   where id = p_id and status = 'pending'
  returning user_id into v_user;
  if v_user is null then raise exception 'NOT_PENDING' using errcode = 'P0002'; end if;
  if p_approve then perform admin_set_verified(v_user, true); end if;
end $$;

revoke all on function public.admin_list_verifications(text) from public, anon;
revoke all on function public.admin_set_verified(uuid, boolean) from public, anon;
revoke all on function public.admin_resolve_verification(uuid, boolean, text) from public, anon;
grant execute on function public.admin_list_verifications(text) to authenticated;
grant execute on function public.admin_set_verified(uuid, boolean) to authenticated;
grant execute on function public.admin_resolve_verification(uuid, boolean, text) to authenticated;

-- ─── Página pública: el tilde ────────────────────────────────────────────────

create or replace function public.get_public_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v          public.profiles;
  v_id       uuid;
  v_redirect text;
  v_owner    boolean;
  v_base     jsonb;
  v_handle   text;
begin
  select o_id, o_redirect into v_id, v_redirect from mycen_find_space(p_username);
  if v_redirect is not null then return jsonb_build_object('redirect', v_redirect); end if;
  if v_id is null then return null; end if;
  select * into v from profiles where id = v_id;

  -- Suspendido (él o su principal): no lo ve nadie, tampoco el dueño (Studio le muestra el aviso)
  if mycen_space_suspended(v.id) then
    return jsonb_build_object('status', 'unavailable');
  end if;

  v_owner := auth.uid() is not distinct from v.user_id;
  if (v.status <> 'published' or v.visibility = 'private') and not v_owner then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if v.status = 'published' and v.published_version_id is not null then
    select snapshot into v_base from profile_versions where id = v.published_version_id;
  end if;
  v_base := coalesce(v_base, mycen_space_snapshot(v.id));
  v_handle := mycen_space_handle(v.id);

  return (v_base - 'contact_card') || jsonb_build_object(
    'id',          v.id,
    'username',    split_part(v_handle, '/', 1),
    'space_slug',  v.space_slug,
    'handle',      v_handle,
    'status',      v.status,
    'visibility',  v.visibility,
    'is_owner',    v_owner,
    -- Perfil vivo (V1): el estado y "Disponible" se ven al instante, sin volver a publicar
    'status_text', v.status_text,
    'available',   v.available,
    -- Cuenta verificada por Mycen (vale para todos los Spaces de la identidad; se ve al instante)
    'verified',    exists (select 1 from identities i where i.id = v.identity_id and i.verified_at is not null),
    'modules',     mycen_resolve_modules(v.identity_id, split_part(v_handle, '/', 1), v_base -> 'modules'),
    'business', (
      select jsonb_build_object(
        'slug',                 r.slug,
        'business_type',        to_jsonb(r) ->> 'business_type',
        'plan',                 to_jsonb(r) ->> 'plan',
        'reservations_enabled', coalesce((to_jsonb(r) ->> 'reservations_enabled')::boolean, false),
        'timezone',             to_jsonb(r) ->> 'timezone')
      from restaurants r where r.id = v.restaurant_id
    )
  );
end $$;

grant execute on function public.get_public_profile(text) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
