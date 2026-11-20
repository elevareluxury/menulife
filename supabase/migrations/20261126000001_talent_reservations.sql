-- =============================================================================
-- Nombres reservados para talentos (PR E)
--
-- El equipo reserva desde el panel (Super-admin → Nombres reservados) el username de un talento antes de que abra su
-- Mycen: nadie más lo puede elegir. Si se carga el email del talento, esa persona (con ese email confirmado) lo toma
-- como cualquier nombre libre al crear su perfil; queda anotado quién lo tomó y cuándo. Sin email, nadie lo puede usar
-- hasta que el equipo lo cargue o borre la reserva.
--
--   · talent_reservations: nadie la lee directo; admin_list_talent_reservations / admin_save_talent_reservation /
--     admin_delete_talent_reservation (sólo super-admins, quedan en la bitácora).
--   · check_username y mycen_validate_username: una reserva ajena = 'reserved'; la propia (mismo email) = libre.
--
-- Idempotente. Se aplica pegándola en Supabase → SQL Editor. Tests: tests/db/talent_reservations.test.sql.
-- =============================================================================
begin;

create table if not exists public.talent_reservations (
  username    text        primary key check (username ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' and username not like '%--%'),
  talent_name text        not null check (char_length(btrim(talent_name)) between 1 and 120),
  email       text        check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  note        text        check (char_length(coalesce(note, '')) <= 300),
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  claimed_by  uuid        references auth.users(id) on delete set null,
  claimed_at  timestamptz
);
alter table public.talent_reservations enable row level security;
revoke all on table public.talent_reservations from public, anon, authenticated;
create index if not exists talent_reservations_email_idx on public.talent_reservations (lower(email));

-- ¿La reserva es de otra persona? (sin reserva o reservada para el email confirmado de quien pregunta = no)
create or replace function public.mycen_talent_reserved_for_other(p_username text)
returns boolean language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  r record;
  v_email text;
begin
  select * into r from talent_reservations where username = lower(btrim(coalesce(p_username, '')));
  if not found then return false; end if;
  if r.claimed_by is not null then return r.claimed_by is distinct from auth.uid(); end if;
  if r.email is null or auth.uid() is null then return true; end if;
  select lower(u.email) into v_email from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
  return v_email is distinct from lower(r.email);
end $$;
revoke all on function public.mycen_talent_reserved_for_other(text) from public, anon;
grant execute on function public.mycen_talent_reserved_for_other(text) to authenticated;

-- Mismo validador que 20261123000001 + las reservas de talentos (la propia se toma y queda anotada)
create or replace function public.mycen_validate_username()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_legacy boolean := coalesce(current_setting('mycen.legacy_import', true), '') = 'on';
begin
  new.username := lower(btrim(new.username));
  if new.username is null then return new; end if;

  if tg_op = 'UPDATE' and new.username is not distinct from old.username then
    return new;
  end if;

  if not v_legacy then
    if new.username !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' or new.username like '%--%' then
      raise exception 'USERNAME_INVALID' using errcode = '22023';
    end if;
    if exists (select 1 from reserved_usernames r where r.username = new.username)
       or mycen_username_impersonates(new.username)
       or mycen_talent_reserved_for_other(new.username) then
      raise exception 'USERNAME_RESERVED' using errcode = '22023';
    end if;
  end if;

  if exists (select 1 from profile_username_history h
             where h.old_username = new.username and h.profile_id <> new.id) then
    raise exception 'USERNAME_TAKEN' using errcode = '23505';
  end if;

  if tg_op = 'UPDATE' and old.username is not null then
    insert into profile_username_history (old_username, profile_id)
    values (old.username, old.id)
    on conflict (old_username) do update set profile_id = excluded.profile_id, changed_at = now();
    delete from profile_username_history where old_username = new.username and profile_id = new.id;
    new.username_changed_at := now();
  end if;

  -- La persona tomó el nombre que le reservaron
  update talent_reservations set claimed_by = new.user_id, claimed_at = now()
  where username = new.username and claimed_by is null;

  return new;
end $$;

create or replace function public.check_username(p_username text)
returns text language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v text := lower(btrim(coalesce(p_username, '')));
begin
  if v !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' or v like '%--%' then
    return 'invalid';
  end if;
  if exists (select 1 from reserved_usernames where username = v) or mycen_username_impersonates(v)
     or mycen_talent_reserved_for_other(v) then
    return 'reserved';
  end if;
  if exists (select 1 from profiles p where p.username = v and p.user_id is distinct from auth.uid())
     or exists (select 1 from profile_username_history h join profiles p on p.id = h.profile_id
                where h.old_username = v and p.user_id is distinct from auth.uid()) then
    return 'taken';
  end if;
  return 'available';
end $$;
revoke all on function public.check_username(text) from public;
grant execute on function public.check_username(text) to anon, authenticated;

-- ─── Panel ────────────────────────────────────────────────────────────────────

create or replace function public.admin_list_talent_reservations(p_q text default null)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  perform mycen_assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'username', r.username, 'talent_name', r.talent_name, 'email', r.email, 'note', r.note,
      'created_at', r.created_at, 'claimed_at', r.claimed_at,
      'claimed_username', (select p.username from profiles p where p.user_id = r.claimed_by and p.is_primary limit 1))
      order by r.created_at desc)
    from talent_reservations r
    where v_q is null
       or r.username ilike '%' || replace(replace(v_q, '%', '\%'), '_', '\_') || '%'
       or r.talent_name ilike '%' || replace(replace(v_q, '%', '\%'), '_', '\_') || '%'
       or coalesce(r.email, '') ilike '%' || replace(replace(v_q, '%', '\%'), '_', '\_') || '%'
    limit 1000), '[]'::jsonb);
end $$;

-- 'saved' | 'invalid' | 'taken' (ya es de un perfil) | 'system' (nombre del sistema o que imita una marca)
create or replace function public.admin_save_talent_reservation(p_username text, p_talent_name text, p_email text default null, p_note text default null)
returns text language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v text := lower(btrim(coalesce(p_username, '')));
  v_name text := btrim(coalesce(p_talent_name, ''));
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
begin
  perform mycen_assert_admin();
  if v !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' or v like '%--%' or char_length(v_name) not between 1 and 120
     or (v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')) then
    return 'invalid';
  end if;
  if exists (select 1 from reserved_usernames where username = v) or mycen_username_impersonates(v) then
    return 'system';
  end if;
  if exists (select 1 from profiles where username = v)
     and not exists (select 1 from talent_reservations where username = v and claimed_by is not null) then
    return 'taken';
  end if;
  insert into talent_reservations (username, talent_name, email, note, created_by)
  values (v, v_name, v_email, left(nullif(btrim(coalesce(p_note, '')), ''), 300), auth.uid())
  on conflict (username) do update set talent_name = excluded.talent_name, email = excluded.email,
    note = excluded.note, updated_at = now();
  insert into admin_audit_log (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'talent_reserved', 'talent_reservations', v, jsonb_build_object('has_email', v_email is not null));
  return 'saved';
end $$;

create or replace function public.admin_delete_talent_reservation(p_username text)
returns void language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v text := lower(btrim(coalesce(p_username, '')));
begin
  perform mycen_assert_admin();
  delete from talent_reservations where username = v;
  if found then
    insert into admin_audit_log (admin_id, action, target_type, target_id, details)
    values (auth.uid(), 'talent_unreserved', 'talent_reservations', v, '{}'::jsonb);
  end if;
end $$;

revoke all on function public.admin_list_talent_reservations(text) from public, anon;
revoke all on function public.admin_save_talent_reservation(text, text, text, text) from public, anon;
revoke all on function public.admin_delete_talent_reservation(text) from public, anon;
grant execute on function public.admin_list_talent_reservations(text) to authenticated;
grant execute on function public.admin_save_talent_reservation(text, text, text, text) to authenticated;
grant execute on function public.admin_delete_talent_reservation(text) to authenticated;

notify pgrst, 'reload schema';

commit;
