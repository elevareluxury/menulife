-- =============================================================================
-- Panel del equipo (super-admin) — auditoría del panel:
--
--   · admin_overview(p_days): el resumen de Mycen (cuentas, perfiles publicados, Life OS, pendientes) y la serie por
--     día de registros y perfiles publicados.
--   · admin_pending_counts(): denuncias y verificaciones pendientes y errores abiertos (contadores del menú).
--   · admin_search_accounts(p_query, p_limit): buscar personas por email, usuario o nombre.
--   · admin_account_detail(p_user_id): la ficha de una cuenta (sus Spaces, verificación, suspensión, denuncias,
--     uso de Life OS en cantidades; nunca el contenido de su Life OS ni de su diario).
--   · admin_audit_log + triggers: cada suspensión, verificación, denuncia o verificación resuelta, error resuelto o
--     interruptor del sitio queda anotado con quién y cuándo, lo haga la pantalla que lo haga. Nadie lee la tabla
--     directo: admin_list_audit(p_limit, p_before). Sólo se anota lo que hace un super-admin.
--
-- Todo exige super-admin (mycen_assert_admin). Idempotente.
-- Vuelta atrás: drop function public.admin_overview(integer); drop function public.admin_pending_counts();
--   drop function public.admin_search_accounts(text, integer); drop function public.admin_account_detail(uuid);
--   drop function public.admin_list_audit(integer, timestamptz); drop table public.admin_audit_log cascade;
--   drop function public.mycen_audit_change() cascade;
-- =============================================================================

begin;

-- ─── Registro de acciones del equipo ─────────────────────────────────────────
create table if not exists public.admin_audit_log (
  id          uuid        primary key default gen_random_uuid(),
  admin_id    uuid        not null,
  action      text        not null check (char_length(action) between 1 and 64),
  target_type text        not null check (char_length(target_type) between 1 and 32),
  target_id   text,
  details     jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default clock_timestamp()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- Anota los cambios que hace un super-admin en las tablas que maneja el panel. Corre dentro de las RPC de siempre
-- (admin_set_suspension, admin_set_verified, …), así que no hace falta tocarlas.
create or replace function public.mycen_audit_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_action text;
  v_target text;
  v_details jsonb := '{}'::jsonb;
begin
  if v_uid is null or not public.mycen_is_admin() then return new; end if;

  if tg_table_name = 'profiles' then
    if new.suspended_at is not distinct from old.suspended_at then return new; end if;
    v_action := case when new.suspended_at is null then 'space_unsuspended' else 'space_suspended' end;
    v_target := new.id::text;
    v_details := jsonb_build_object('handle', public.mycen_space_handle(new.id), 'reason', new.suspension_reason);
  elsif tg_table_name = 'identities' then
    if new.verified_at is not distinct from old.verified_at then return new; end if;
    v_action := case when new.verified_at is null then 'verification_removed' else 'verified' end;
    v_target := new.user_id::text;
  elsif tg_table_name = 'profile_reports' then
    if new.status is not distinct from old.status then return new; end if;
    v_action := 'report_' || new.status;
    v_target := new.id::text;
    v_details := jsonb_build_object('profile_id', new.profile_id, 'reason', new.reason);
  elsif tg_table_name = 'verification_requests' then
    if new.status is not distinct from old.status then return new; end if;
    v_action := 'verification_' || new.status;
    v_target := new.user_id::text;
  elsif tg_table_name = 'app_errors' then
    if new.status is not distinct from old.status then return new; end if;
    v_action := 'error_' || new.status;
    v_target := new.id::text;
    v_details := jsonb_build_object('message', left(new.message, 120));
  elsif tg_table_name = 'mycen_site_flags' then
    if tg_op = 'UPDATE' and new.enabled is not distinct from old.enabled then return new; end if;
    v_action := case when new.enabled then 'flag_on' else 'flag_off' end;
    v_target := new.key;
  else
    return new;
  end if;

  insert into admin_audit_log (admin_id, action, target_type, target_id, details)
  values (v_uid, v_action, tg_table_name, v_target, v_details);
  return new;
end $$;

revoke all on function public.mycen_audit_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'identities', 'profile_reports', 'verification_requests', 'app_errors', 'mycen_site_flags'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists mycen_audit on public.%I', t);
      execute format('create trigger mycen_audit after %s on public.%I for each row execute function public.mycen_audit_change()',
                     case when t = 'mycen_site_flags' then 'insert or update' else 'update' end, t);
    end if;
  end loop;
end $$;

create or replace function public.admin_list_audit(p_limit integer default 100, p_before timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mycen_assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', l.id, 'action', l.action, 'target_type', l.target_type, 'target_id', l.target_id, 'details', l.details,
      'created_at', l.created_at, 'admin_email', u.email) order by l.created_at desc)
    from (
      select * from admin_audit_log
      where p_before is null or created_at < p_before
      order by created_at desc
      limit least(greatest(coalesce(p_limit, 100), 1), 500)
    ) l
    left join auth.users u on u.id = l.admin_id
  ), '[]'::jsonb);
end $$;

revoke all on function public.admin_list_audit(integer, timestamptz) from public, anon;
grant execute on function public.admin_list_audit(integer, timestamptz) to authenticated;

-- ─── Contadores del menú ─────────────────────────────────────────────────────
create or replace function public.admin_pending_counts()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mycen_assert_admin();
  return jsonb_build_object(
    'reports',       (select count(*) from profile_reports where status = 'open'),
    'verifications', (select count(*) from verification_requests where status = 'pending'),
    'errors',        (select count(*) from app_errors where status = 'open')
  );
end $$;

revoke all on function public.admin_pending_counts() from public, anon;
grant execute on function public.admin_pending_counts() to authenticated;

-- ─── Resumen de Mycen ────────────────────────────────────────────────────────
create or replace function public.admin_overview(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_days  integer := least(greatest(coalesce(p_days, 30), 7), 180);
  v_since timestamptz;
  v_life  bigint := 0;
begin
  perform mycen_assert_admin();
  v_since := date_trunc('day', now()) - make_interval(days => v_days - 1);

  -- Personas que usaron Life OS en los últimos 7 días (algo creado o tildado), sin mirar contenido
  select count(distinct x.user_id) into v_life from (
    select user_id from life_brain_items where created_at > now() - interval '7 days'
    union select user_id from life_transactions where created_at > now() - interval '7 days'
    union select user_id from life_habit_logs where created_at > now() - interval '7 days'
  ) x;

  return jsonb_build_object(
    'days', v_days,
    'accounts',          (select count(*) from auth.users),
    'accounts_7d',       (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'accounts_30d',      (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'published',         (select count(*) from profiles where status = 'published' and suspended_at is null),
    'published_7d',      (select count(*) from profiles where status = 'published' and published_at > now() - interval '7 days'),
    'suspended',         (select count(*) from profiles where suspended_at is not null),
    'verified',          (select count(*) from identities where verified_at is not null),
    'life_active_7d',    v_life,
    'pending_reports',   (select count(*) from profile_reports where status = 'open'),
    'pending_verifications', (select count(*) from verification_requests where status = 'pending'),
    'open_errors',       (select count(*) from app_errors where status = 'open'),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d::date,
        'signups',   (select count(*) from auth.users u where u.created_at >= d and u.created_at < d + interval '1 day'),
        'published', (select count(*) from profiles p where p.published_at >= d and p.published_at < d + interval '1 day')
      ) order by d), '[]'::jsonb)
      from generate_series(v_since, date_trunc('day', now()), interval '1 day') d
    )
  );
end $$;

revoke all on function public.admin_overview(integer) from public, anon;
grant execute on function public.admin_overview(integer) to authenticated;

-- ─── Buscar personas ─────────────────────────────────────────────────────────
create or replace function public.admin_search_accounts(p_query text, p_limit integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_q text := lower(btrim(coalesce(p_query, '')));
  v_like text;
begin
  perform mycen_assert_admin();
  if char_length(v_q) < 2 then return '[]'::jsonb; end if;
  -- Los comodines que escriba la persona se toman como texto
  v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return coalesce((
    select jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc)
    from (
      select u.id as user_id, u.email, u.created_at, u.last_sign_in_at,
             p.display_name, p.username, p.status, p.suspended_at is not null as suspended,
             (i.verified_at is not null) as verified,
             (select count(*) from profiles s where s.user_id = u.id and s.status <> 'archived') as spaces,
             exists (select 1 from restaurants r2 where r2.owner_id = u.id) as has_business
      from auth.users u
      left join profiles p on p.user_id = u.id and p.is_primary
      left join identities i on i.user_id = u.id
      where lower(u.email) like v_like
         or exists (select 1 from profiles s where s.user_id = u.id
                    and (lower(coalesce(s.username, '')) like v_like or lower(coalesce(s.space_slug, '')) like v_like
                         or lower(s.display_name) like v_like))
         or u.id::text = v_q
      order by u.created_at desc
      limit least(greatest(coalesce(p_limit, 30), 1), 100)
    ) r
  ), '[]'::jsonb);
end $$;

revoke all on function public.admin_search_accounts(text, integer) from public, anon;
grant execute on function public.admin_search_accounts(text, integer) to authenticated;

-- ─── Ficha de una cuenta ─────────────────────────────────────────────────────
create or replace function public.admin_account_detail(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_user record;
begin
  perform mycen_assert_admin();
  select id, email, created_at, last_sign_in_at into v_user from auth.users where id = p_user_id;
  if not found then return null; end if;

  return jsonb_build_object(
    'user_id', v_user.id, 'email', v_user.email, 'created_at', v_user.created_at, 'last_sign_in_at', v_user.last_sign_in_at,
    'is_admin', exists (select 1 from super_admins where user_id = v_user.id),
    'verified_at', (select verified_at from identities where user_id = v_user.id),
    'has_business', exists (select 1 from restaurants where owner_id = v_user.id),
    'spaces', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'handle', public.mycen_space_handle(s.id), 'display_name', s.display_name, 'status', s.status,
        'is_primary', s.is_primary, 'visibility', s.visibility, 'published_at', s.published_at,
        'suspended_at', s.suspended_at, 'suspension_reason', s.suspension_reason,
        'open_reports', (select count(*) from profile_reports r where r.profile_id = s.id and r.status = 'open'),
        'messages', (select count(*) from profile_messages m where m.profile_id = s.id),
        'subscribers', (select count(*) from profile_subscribers b where b.profile_id = s.id)
      ) order by s.is_primary desc, s.created_at)
      from profiles s where s.user_id = v_user.id
    ), '[]'::jsonb),
    -- Life OS: sólo cuántas cosas tiene y cuándo usó algo por última vez (nunca el contenido)
    'life', jsonb_build_object(
      'tasks',        (select count(*) from life_brain_items where user_id = v_user.id and type = 'task'),
      'captures',     (select count(*) from life_brain_items where user_id = v_user.id and type <> 'task'),
      'habits',       (select count(*) from life_habits where user_id = v_user.id),
      'transactions', (select count(*) from life_transactions where user_id = v_user.id),
      'last_activity', greatest(
        (select max(created_at) from life_brain_items where user_id = v_user.id),
        (select max(created_at) from life_transactions where user_id = v_user.id))
    ),
    'verification_pending', exists (select 1 from verification_requests where user_id = v_user.id and status = 'pending')
  );
end $$;

revoke all on function public.admin_account_detail(uuid) from public, anon;
grant execute on function public.admin_account_detail(uuid) to authenticated;

commit;
