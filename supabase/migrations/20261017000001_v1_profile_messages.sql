-- =============================================================================
-- Mycen V1 · Etapa 05 — Formulario de contacto y bandeja de mensajes
--
--   · Módulo 'contact_form': un visitante deja su nombre, "Email o WhatsApp" y un mensaje sin salir del perfil.
--   · profile_messages: los mensajes viven sólo en Studio (no se manda ningún email). El dueño lee, marca como
--     leído y borra; nadie inserta directo: sólo submit_profile_message (security definer).
--   · No se guarda IP ni datos del navegador. Para limitar la frecuencia se guarda un hash del visitante que cambia
--     cada día (misma sal que la analítica y las denuncias): no permite saber quién es ni seguirlo de un día a otro.
--   · Límites: nombre ≤ 80, contacto ≤ 120, mensaje ≤ 2000, como mucho 3 links, 5 mensajes por visitante por
--     perfil por día y 200 por perfil por día. Los bots (agente conocido, campo trampa o < 3 s para completar)
--     reciben "ok" pero no se guarda nada.
--
-- Requiere las migraciones de Identity y V1 hasta 20261016000001. Idempotente.
-- Vuelta atrás: docs/v1/sql/05_rollback.sql
-- =============================================================================

begin;

-- ─── 1. Tipo de módulo ───────────────────────────────────────────────────────

alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards','project','portfolio','link_group','media','contact_form'
));

-- ─── 2. Mensajes ─────────────────────────────────────────────────────────────

create table if not exists public.profile_messages (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  contact     text not null check (char_length(contact) between 3 and 120),
  message     text not null check (char_length(message) between 1 and 2000),
  -- Hash diario del visitante: sólo para el límite de frecuencia (no identifica a nadie)
  sender_hash text not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists profile_messages_profile_idx on public.profile_messages (profile_id, created_at desc);
create index if not exists profile_messages_unread_idx on public.profile_messages (profile_id) where read_at is null;
create index if not exists profile_messages_sender_idx on public.profile_messages (sender_hash, profile_id, created_at);

alter table public.profile_messages enable row level security;

-- El dueño del perfil lee, marca como leído y borra. Nadie inserta directo (no hay política de insert).
drop policy if exists profile_messages_owner_select on public.profile_messages;
create policy profile_messages_owner_select on public.profile_messages for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
drop policy if exists profile_messages_owner_update on public.profile_messages;
create policy profile_messages_owner_update on public.profile_messages for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
drop policy if exists profile_messages_owner_delete on public.profile_messages;
create policy profile_messages_owner_delete on public.profile_messages for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

revoke all on public.profile_messages from anon, authenticated;
grant select, delete on public.profile_messages to authenticated;
-- Lo único que el dueño cambia es si lo leyó
grant update (read_at) on public.profile_messages to authenticated;

-- ─── 3. Enviar un mensaje (visitante, sin cuenta) ────────────────────────────

create or replace function public.submit_profile_message(
  p_handle     text,
  p_name       text,
  p_contact    text,
  p_message    text,
  p_trap       text default null,
  p_elapsed_ms integer default null
) returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v          public.profiles;
  v_id       uuid;
  v_snap     jsonb;
  v_name     text := btrim(coalesce(p_name, ''));
  v_contact  text := btrim(coalesce(p_contact, ''));
  v_message  text := btrim(coalesce(p_message, ''));
  v_headers  json;
  v_ua       text;
  v_ip       text;
  v_salt     text;
  v_hash     text;
begin
  select o_id into v_id from mycen_find_space(p_handle);
  select * into v from profiles where id = v_id;
  if not found or v.status <> 'published' or v.visibility = 'private' or mycen_space_suspended(v.id) then
    return 'not_found';
  end if;
  -- Sólo si la versión publicada tiene el formulario
  select snapshot into v_snap from profile_versions where id = v.published_version_id;
  if not exists (select 1 from jsonb_array_elements(coalesce(v_snap -> 'modules', '[]'::jsonb)) m where m ->> 'type' = 'contact_form') then
    return 'not_found';
  end if;

  if char_length(v_name) not between 1 and 80
     or char_length(v_contact) not between 3 and 120
     or char_length(v_message) not between 1 and 2000 then
    return 'invalid';
  end if;
  if (select count(*) from regexp_matches(v_message, '(https?://|www\.)', 'gi')) > 3 then
    return 'too_many_links';
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ua := coalesce(v_headers ->> 'user-agent', '');
  v_ip := coalesce(btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), v_headers ->> 'x-real-ip', '');

  -- Bots: campo trampa completo, menos de 3 segundos o agente conocido. Se les responde "ok" y no se guarda nada.
  if nullif(btrim(coalesce(p_trap, '')), '') is not null
     or coalesce(p_elapsed_ms, 0) < 3000
     or v_ua ~* '(bot|crawl|spider|slurp|headless|lighthouse|curl|wget|python-requests)' then
    return 'ok';
  end if;

  select value into v_salt from mycen_private.secrets where key = 'visitor_salt';
  v_hash := left(encode(sha256(convert_to(
              v_ip || '|' || v_ua || '|' || coalesce(auth.uid()::text, '') || '|' || current_date::text || '|' || coalesce(v_salt, ''),
              'UTF8')), 'hex'), 32);

  if (select count(*) from profile_messages m
      where m.sender_hash = v_hash and m.profile_id = v.id and m.created_at > now() - interval '1 day') >= 5
     or (select count(*) from profile_messages m
         where m.profile_id = v.id and m.created_at > now() - interval '1 day') >= 200 then
    return 'rate_limited';
  end if;

  insert into profile_messages (profile_id, name, contact, message, sender_hash)
  values (v.id, v_name, v_contact, v_message, v_hash);
  return 'ok';
end $$;

revoke all on function public.submit_profile_message(text, text, text, text, text, integer) from public;
grant execute on function public.submit_profile_message(text, text, text, text, text, integer) to anon, authenticated;

commit;
