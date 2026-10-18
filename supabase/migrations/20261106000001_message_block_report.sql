-- =============================================================================
-- Tiendas (App Store 1.2, contenido de otras personas): en Studio → Mensajes la persona dueña del perfil puede
-- reportar un mensaje al equipo y bloquear a quien lo escribió.
--
--   · profile_blocked_senders: contactos bloqueados por perfil (email en minúsculas; un teléfono, sólo sus dígitos).
--     Un trigger en profile_messages descarta en silencio lo que llega de un contacto bloqueado (formulario de
--     contacto y Colaboraciones): al visitante se le responde "ok", como a los bots.
--   · block_message_sender(p_message_id): bloquea al remitente y borra sus mensajes de ese perfil.
--   · report_profile_message(p_message_id, p_reason): guarda una copia para el equipo (profile_message_reports),
--     bloquea al remitente y borra sus mensajes. Nadie lee la tabla directo.
--   · admin_list_message_reports(p_status) / admin_resolve_message_report(p_report_id, p_action, p_note): el equipo
--     las revisa en el panel (Denuncias).
--
-- Deshacer:
--   drop trigger if exists profile_messages_blocked on public.profile_messages;
--   drop function if exists public.mycen_drop_blocked_message(), public.block_message_sender(uuid),
--     public.report_profile_message(uuid, text), public.admin_list_message_reports(text),
--     public.admin_resolve_message_report(uuid, text, text), public.mycen_contact_key(text);
--   drop table if exists public.profile_message_reports, public.profile_blocked_senders;
--   delete from public.reserved_usernames where username = 'eliminar-cuenta';
-- =============================================================================
begin;

-- ─── 1. Clave de un contacto (email o teléfono) ─────────────────────────────
create or replace function public.mycen_contact_key(p text)
returns text language sql immutable set search_path = public as $$
  select case
    when position('@' in coalesce(p, '')) > 0 then lower(btrim(p))
    when char_length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 6 then regexp_replace(p, '\D', '', 'g')
    else lower(btrim(coalesce(p, '')))
  end
$$;

-- ─── 2. Contactos bloqueados ────────────────────────────────────────────────
create table if not exists public.profile_blocked_senders (
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  contact_key text not null check (char_length(contact_key) between 1 and 120),
  created_at  timestamptz not null default now(),
  primary key (profile_id, contact_key)
);

alter table public.profile_blocked_senders enable row level security;

-- La persona dueña ve y desbloquea; bloquear pasa por block_message_sender / report_profile_message
drop policy if exists profile_blocked_senders_owner_select on public.profile_blocked_senders;
create policy profile_blocked_senders_owner_select on public.profile_blocked_senders for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
drop policy if exists profile_blocked_senders_owner_delete on public.profile_blocked_senders;
create policy profile_blocked_senders_owner_delete on public.profile_blocked_senders for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

revoke all on public.profile_blocked_senders from anon, authenticated;
grant select, delete on public.profile_blocked_senders to authenticated;

-- ─── 3. Mensajes reportados (sólo por RPC) ──────────────────────────────────
create table if not exists public.profile_message_reports (
  id                 uuid        primary key default gen_random_uuid(),
  profile_id         uuid        not null references public.profiles(id) on delete cascade,
  reporter_user_id   uuid        references auth.users(id) on delete set null,
  reason             text        not null check (reason in
                       ('spam', 'scam', 'impersonation', 'hate', 'violence', 'sexual', 'illegal', 'other')),
  sender_name        text        not null check (char_length(sender_name) <= 80),
  sender_contact     text        not null check (char_length(sender_contact) <= 120),
  message            text        not null check (char_length(message) <= 2000),
  details            jsonb,
  message_created_at timestamptz,
  status             text        not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  resolution_note    text        check (char_length(coalesce(resolution_note, '')) <= 500),
  resolved_by        uuid        references auth.users(id) on delete set null,
  resolved_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists profile_message_reports_status_idx on public.profile_message_reports (status, created_at desc);

alter table public.profile_message_reports enable row level security;
revoke all on public.profile_message_reports from anon, authenticated;

-- ─── 4. Lo que llega de un contacto bloqueado no se guarda ──────────────────
create or replace function public.mycen_drop_blocked_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from profile_blocked_senders b
             where b.profile_id = new.profile_id and b.contact_key = mycen_contact_key(new.contact)) then
    return null;
  end if;
  return new;
end $$;

drop trigger if exists profile_messages_blocked on public.profile_messages;
create trigger profile_messages_blocked before insert on public.profile_messages
  for each row execute function public.mycen_drop_blocked_message();

-- ─── 5. Bloquear y reportar (persona dueña del perfil) ──────────────────────
create or replace function public.block_message_sender(p_message_id uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  m public.profile_messages;
  k text;
begin
  select pm.* into m from profile_messages pm join profiles p on p.id = pm.profile_id
  where pm.id = p_message_id and p.user_id = auth.uid();
  if not found then raise exception 'NOT_OWNER' using errcode = '42501'; end if;
  k := mycen_contact_key(m.contact);
  insert into profile_blocked_senders (profile_id, contact_key) values (m.profile_id, left(k, 120))
  on conflict do nothing;
  delete from profile_messages where profile_id = m.profile_id and mycen_contact_key(contact) = k;
  return 'ok';
end $$;

create or replace function public.report_profile_message(p_message_id uuid, p_reason text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  m public.profile_messages;
begin
  if p_reason is null or p_reason not in ('spam', 'scam', 'impersonation', 'hate', 'violence', 'sexual', 'illegal', 'other') then
    return 'invalid';
  end if;
  select pm.* into m from profile_messages pm join profiles p on p.id = pm.profile_id
  where pm.id = p_message_id and p.user_id = auth.uid();
  if not found then raise exception 'NOT_OWNER' using errcode = '42501'; end if;
  insert into profile_message_reports (profile_id, reporter_user_id, reason, sender_name, sender_contact, message, details, message_created_at)
  values (m.profile_id, auth.uid(), p_reason, m.name, m.contact, m.message, m.details, m.created_at);
  return block_message_sender(p_message_id);
end $$;

revoke all on function public.block_message_sender(uuid) from public, anon;
revoke all on function public.report_profile_message(uuid, text) from public, anon;
grant execute on function public.block_message_sender(uuid) to authenticated;
grant execute on function public.report_profile_message(uuid, text) to authenticated;

-- ─── 6. El equipo los revisa (panel → Denuncias) ────────────────────────────
create or replace function public.admin_list_message_reports(p_status text default 'open')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform mycen_assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id, 'reason', r.reason, 'status', r.status, 'created_at', r.created_at,
             'sender_name', r.sender_name, 'sender_contact', r.sender_contact, 'message', r.message, 'details', r.details,
             'message_created_at', r.message_created_at, 'resolution_note', r.resolution_note, 'resolved_at', r.resolved_at,
             'profile', jsonb_build_object('id', p.id, 'handle', mycen_space_handle(p.id), 'display_name', p.display_name))
           order by r.created_at desc)
    from (
      select * from profile_message_reports
      where case coalesce(p_status, 'open')
              when 'open' then status = 'open'
              when 'resolved' then status <> 'open'
              else true end
      order by created_at desc
      limit 200
    ) r
    join profiles p on p.id = r.profile_id
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_resolve_message_report(p_report_id uuid, p_action text, p_note text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  perform mycen_assert_admin();
  if p_action not in ('dismiss', 'action') then raise exception 'INVALID' using errcode = '22023'; end if;
  update profile_message_reports
  set status = case p_action when 'dismiss' then 'dismissed' else 'actioned' end,
      resolution_note = left(nullif(btrim(coalesce(p_note, '')), ''), 500), resolved_by = auth.uid(), resolved_at = now()
  where id = p_report_id and status = 'open';
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
end $$;

revoke all on function public.admin_list_message_reports(text) from public, anon;
revoke all on function public.admin_resolve_message_report(uuid, text, text) from public, anon;
grant execute on function public.admin_list_message_reports(text) to authenticated;
grant execute on function public.admin_resolve_message_report(uuid, text, text) to authenticated;

-- ─── 7. /eliminar-cuenta es una página (el link de Google Play): nadie puede tomarla como username ───
insert into public.reserved_usernames (username, reason) values ('eliminar-cuenta', 'route') on conflict (username) do nothing;

commit;
