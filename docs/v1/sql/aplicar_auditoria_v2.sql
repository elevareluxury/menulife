-- Auditoría V2 (base de datos). Pegar entero en Supabase → SQL Editor y tocar Run. Se puede correr más de una vez.

-- =============================================================================
-- Auditoría de seguridad de la base (V2, docs/seguridad/auditoria-v2-db.md).
--
--   1. profiles.published_version_id: sólo una versión del mismo Space. Antes una cuenta podía apuntar su Space a la
--      versión publicada de otra persona (con su id): mostraba esa página (y su tarjeta de contacto) en su dirección,
--      también versiones viejas o de un perfil suspendido.
--   2. identities.primary_space_id: sólo un Space de la misma identidad. Antes una cuenta podía poner el Space de otra
--      persona (el id de perfil sale en la respuesta pública) y el panel de verificaciones mostraba ese perfil junto a
--      su pedido de verificación.
--   3. life_habit_logs.habit_id: sólo un hábito propio. Antes se podía marcar un día de un hábito ajeno y, por el
--      índice único (hábito, día), la dueña ya no podía marcar ese día.
--   4. life_transactions.recurring_id / installment_plan_id: sólo un fijo o una compra en cuotas propios. Antes un
--      movimiento ajeno podía ocupar el lugar (fijo, mes) o (compra, cuota) y la carga automática de la dueña lo
--      salteaba para siempre.
--   5. track_profile_event: no cuenta visitas ni toques de Spaces privados o suspendidos (como las demás RPC públicas).
--   6. submit_profile_message / submit_profile_collab: el formulario tiene que estar en su horario (mycen_module_live),
--      igual que "Suscribirse"; antes un formulario programado o vencido seguía recibiendo mensajes por la API.
--
-- Las filas que ya existan y no cumplan se corrigen (ver cada sección). Idempotente.
-- Vuelta atrás: drop trigger profiles_published_version_owner on profiles; drop trigger identities_primary_space_owner
--   on identities; drop trigger life_habit_logs_habit_owner on life_habit_logs; drop trigger
--   life_transactions_links_owner on life_transactions; y volver a correr las funciones de 20261101000001
--   (track_profile_event), 20261017000001 (submit_profile_message) y 20261031000002 (submit_profile_collab).
-- =============================================================================

begin;

-- ─── 1. Versión publicada: del mismo Space ──────────────────────────────────

create or replace function public.mycen_check_published_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.published_version_id is not null and not exists (
    select 1 from public.profile_versions pv where pv.id = new.published_version_id and pv.profile_id = new.id
  ) then
    raise exception 'VERSION_NOT_OWNED' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.mycen_check_published_version() from public, anon, authenticated;

-- Lo que ya exista apuntando a una versión ajena vuelve a la última versión propia (o a ninguna)
update public.profiles p
set published_version_id = (select pv.id from public.profile_versions pv
                            where pv.profile_id = p.id order by pv.version_number desc limit 1)
where p.published_version_id is not null
  and not exists (select 1 from public.profile_versions pv where pv.id = p.published_version_id and pv.profile_id = p.id);

drop trigger if exists profiles_published_version_owner on public.profiles;
create trigger profiles_published_version_owner
  before insert or update of published_version_id on public.profiles
  for each row execute function public.mycen_check_published_version();

-- ─── 2. Space principal: de la misma identidad ──────────────────────────────

create or replace function public.mycen_check_primary_space()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.primary_space_id is not null and not exists (
    select 1 from public.profiles p where p.id = new.primary_space_id and p.identity_id = new.id
  ) then
    raise exception 'SPACE_NOT_OWNED' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.mycen_check_primary_space() from public, anon, authenticated;

update public.identities i
set primary_space_id = (select p.id from public.profiles p
                        where p.identity_id = i.id and p.is_primary order by p.created_at limit 1)
where i.primary_space_id is not null
  and not exists (select 1 from public.profiles p where p.id = i.primary_space_id and p.identity_id = i.id);

drop trigger if exists identities_primary_space_owner on public.identities;
create trigger identities_primary_space_owner
  before insert or update of primary_space_id on public.identities
  for each row execute function public.mycen_check_primary_space();

-- ─── 3. Registro de un hábito: hábito propio ────────────────────────────────

create or replace function public.life_check_habit_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.life_habits h where h.id = new.habit_id and h.user_id = new.user_id) then
    raise exception 'habit_not_owned' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.life_check_habit_owner() from public, anon, authenticated;

do $$
begin
  if to_regclass('public.life_habit_logs') is null or to_regclass('public.life_habits') is null then return; end if;
  -- Registros que apuntan a un hábito de otra cuenta: no le sirven a nadie y le bloquean el día a la dueña
  delete from public.life_habit_logs l
  where not exists (select 1 from public.life_habits h where h.id = l.habit_id and h.user_id = l.user_id);
  drop trigger if exists life_habit_logs_habit_owner on public.life_habit_logs;
  create trigger life_habit_logs_habit_owner
    before insert or update of habit_id, user_id on public.life_habit_logs
    for each row execute function public.life_check_habit_owner();
end $$;

-- ─── 4. Movimiento generado: fijo o compra en cuotas propios ────────────────

create or replace function public.life_check_tx_links()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.recurring_id is not null and not exists (
    select 1 from public.life_recurring_transactions r where r.id = new.recurring_id and r.user_id = new.user_id
  ) then
    raise exception 'recurring_not_owned' using errcode = '42501';
  end if;
  if new.installment_plan_id is not null and not exists (
    select 1 from public.life_installment_plans p where p.id = new.installment_plan_id and p.user_id = new.user_id
  ) then
    raise exception 'installment_not_owned' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.life_check_tx_links() from public, anon, authenticated;

-- Lo que ya exista apuntando a un fijo o una compra ajenos se desvincula (el movimiento queda, sin marca)
update public.life_transactions t set recurring_id = null, recurring_period = null
where t.recurring_id is not null
  and not exists (select 1 from public.life_recurring_transactions r where r.id = t.recurring_id and r.user_id = t.user_id);
update public.life_transactions t set installment_plan_id = null, installment_no = null
where t.installment_plan_id is not null
  and not exists (select 1 from public.life_installment_plans p where p.id = t.installment_plan_id and p.user_id = t.user_id);

drop trigger if exists life_transactions_links_owner on public.life_transactions;
create trigger life_transactions_links_owner
  before insert or update of recurring_id, installment_plan_id, user_id on public.life_transactions
  for each row execute function public.life_check_tx_links();

-- ─── 5. Analítica: sólo Spaces que el visitante puede ver ───────────────────
-- Igual que en 20261101000001, más: visibilidad distinta de 'private' y sin suspensión (propia o del principal).

create or replace function public.track_profile_event(
  p_profile_id uuid,
  p_event_type text,
  p_module_id  uuid default null,
  p_referrer   text default null,
  p_source     text default null,
  p_item_key   text default null
) returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_headers json;
  v_ua      text;
  v_ip      text;
  v_salt    text;
  v_hash    text;
  v_owner   uuid;
begin
  if p_event_type not in ('view','module_click','primary_action_click','share','copy_link','qr_download','vcard_download') then
    return;
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ua := coalesce(v_headers ->> 'user-agent', '');
  v_ip := coalesce(btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), v_headers ->> 'x-real-ip', '');

  -- Bots y previsualizadores de links
  if v_ua ~* '(bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|headless|lighthouse|pingdom|curl|wget|python-requests)' then
    return;
  end if;

  select user_id into v_owner from profiles
  where id = p_profile_id and status = 'published' and visibility <> 'private';
  if v_owner is null then return; end if;
  if mycen_space_suspended(p_profile_id) then return; end if;
  if auth.uid() is not distinct from v_owner then return; end if;  -- no contar al dueño

  if p_module_id is not null
     and not exists (select 1 from profile_modules where id = p_module_id and profile_id = p_profile_id) then
    p_module_id := null;
  end if;

  -- Clave del botón: sólo para toques y con el formato acordado; si no, el evento cuenta sin clave
  if p_event_type = 'view' or p_item_key is null or p_item_key !~ '^[A-Za-z0-9:_.-]{1,64}$' then
    p_item_key := null;
  end if;

  select value into v_salt from mycen_private.secrets where key = 'visitor_salt';
  v_hash := left(encode(sha256(convert_to(
              v_ip || '|' || v_ua || '|' || p_profile_id::text || '|' || current_date::text || '|' || coalesce(v_salt, ''),
              'UTF8')), 'hex'), 32);

  -- Deduplicación: mismo visitante + evento + módulo + botón en 30 minutos
  if exists (select 1 from profile_events e
             where e.profile_id = p_profile_id and e.visitor_hash = v_hash
               and e.event_type = p_event_type and e.module_id is not distinct from p_module_id
               and e.item_key is not distinct from p_item_key
               and e.created_at > now() - interval '30 minutes') then
    return;
  end if;

  -- Límite anti-abuso: 300 eventos por visitante por día y perfil
  if (select count(*) from profile_events e
      where e.profile_id = p_profile_id and e.visitor_hash = v_hash
        and e.created_at > now() - interval '1 day') >= 300 then
    return;
  end if;

  insert into profile_events (profile_id, module_id, event_type, visitor_hash, referrer_host, source, item_key)
  values (
    p_profile_id, p_module_id, p_event_type, v_hash,
    left(lower(substring(coalesce(p_referrer, '') from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/:?#]+)')), 120),
    left(nullif(btrim(p_source), ''), 32),
    p_item_key
  );
end $$;

revoke all on function public.track_profile_event(uuid, text, uuid, text, text, text) from public;
grant execute on function public.track_profile_event(uuid, text, uuid, text, text, text) to anon, authenticated;

-- ─── 6. Formularios: sólo en su horario ─────────────────────────────────────
-- Igual que en 20261017000001, más mycen_module_live (como subscribe_profile).

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
  -- Sólo si la versión publicada tiene el formulario y está en su horario
  select snapshot into v_snap from profile_versions where id = v.published_version_id;
  if not exists (select 1 from jsonb_array_elements(coalesce(v_snap -> 'modules', '[]'::jsonb)) m
                 where m ->> 'type' = 'contact_form' and mycen_module_live(m -> 'config')) then
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

-- Igual que en 20261031000002, más mycen_module_live
create or replace function public.submit_profile_collab(
  p_handle      text,
  p_name        text,
  p_email       text,
  p_company     text,
  p_website     text,
  p_deliverable text,
  p_budget      text,
  p_deadline    text,
  p_message     text,
  p_trap        text default null,
  p_elapsed_ms  integer default null
) returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v          public.profiles;
  v_id       uuid;
  v_snap     jsonb;
  v_name     text := btrim(coalesce(p_name, ''));
  v_email    text := btrim(coalesce(p_email, ''));
  v_company  text := btrim(coalesce(p_company, ''));
  v_website  text := nullif(btrim(coalesce(p_website, '')), '');
  v_budget   text := nullif(btrim(coalesce(p_budget, '')), '');
  v_deadline text := nullif(btrim(coalesce(p_deadline, '')), '');
  v_message  text := btrim(coalesce(p_message, ''));
  v_details  jsonb;
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
  -- Sólo si la versión publicada tiene el módulo de colaboraciones y está en su horario
  select snapshot into v_snap from profile_versions where id = v.published_version_id;
  if not exists (select 1 from jsonb_array_elements(coalesce(v_snap -> 'modules', '[]'::jsonb)) m
                 where m ->> 'type' = 'collab' and mycen_module_live(m -> 'config')) then
    return 'not_found';
  end if;

  v_details := jsonb_strip_nulls(jsonb_build_object(
    'company', v_company, 'website', v_website, 'deliverable', p_deliverable, 'budget', v_budget, 'deadline', v_deadline));
  if char_length(v_name) not between 1 and 80
     or char_length(v_email) not between 3 and 120
     or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
     or char_length(v_message) not between 1 and 2000
     or not mycen_valid_collab_details(v_details) then
    return 'invalid';
  end if;
  -- La fecha límite no puede haber pasado (un día de margen por la zona horaria) ni estar a más de 5 años
  if v_deadline is not null and (v_deadline::date < current_date - 1 or v_deadline::date > current_date + interval '5 years') then
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

  -- Mismo hash diario que submit_profile_message: los límites cuentan mensajes y propuestas juntos
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

  insert into profile_messages (profile_id, kind, name, contact, message, details, sender_hash)
  values (v.id, 'collab', v_name, v_email, v_message, v_details, v_hash);
  return 'ok';
end $$;

revoke all on function public.submit_profile_collab(text, text, text, text, text, text, text, text, text, text, integer) from public;
grant execute on function public.submit_profile_collab(text, text, text, text, text, text, text, text, text, text, integer) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
