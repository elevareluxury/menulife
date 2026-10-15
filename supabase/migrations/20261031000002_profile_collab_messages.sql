-- =============================================================================
-- Mycen V1.1 · Módulos de bio — Colaboraciones (módulo 'collab')
--
--   · Una marca propone una colaboración desde el perfil: nombre, email, empresa, web (opcional), qué formato busca
--     (post, video, historia, evento, UGC u otro), presupuesto (texto libre, opcional), fecha límite (opcional) y mensaje.
--   · Llega a la misma bandeja que el formulario de contacto (Studio → Mensajes), separada por `kind`:
--       profile_messages.kind    'message' (formulario de contacto, como siempre) | 'collab'
--       profile_messages.details sólo en 'collab': { company, website?, deliverable, budget?, deadline? }
--     `contact` guarda el email de la marca. Sin emails ni servicios externos.
--   · RPC nueva submit_profile_collab: sólo si la versión publicada tiene un módulo 'collab'. Mismos controles que
--     submit_profile_message (campo trampa, < 3 s, agente de bot → "ok" sin guardar; hash diario del visitante, sin
--     IP) y los mismos límites, que cuentan junto con los mensajes: 5 por visitante por perfil por día y 200 por perfil
--     por día. submit_profile_message no cambia (sigue sirviendo sólo a contact_form).
--
-- Requiere 20261017000001_v1_profile_messages y 20261031000001_bio_module_types. Idempotente.
-- Vuelta atrás:
--   drop function if exists public.submit_profile_collab(text, text, text, text, text, text, text, text, text, text, integer);
--   delete from public.profile_messages where kind = 'collab';
--   alter table public.profile_messages drop constraint if exists profile_messages_kind_details_check;
--   alter table public.profile_messages drop column if exists details, drop column if exists kind;
--   drop function if exists public.mycen_valid_collab_details(jsonb);
-- =============================================================================

begin;

-- ─── 1. Formatos de colaboración y validación de los detalles ────────────────

-- Lista cerrada: la misma está en src/modules/profile/lib/collab.ts (COLLAB_DELIVERABLES)
create or replace function public.mycen_valid_collab_details(p jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  v_deadline text;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  -- Sólo claves conocidas
  if exists (select 1 from jsonb_object_keys(p) k where k not in ('company', 'website', 'deliverable', 'budget', 'deadline')) then
    return false;
  end if;
  -- Empresa o marca: obligatoria, 1–120
  if jsonb_typeof(p -> 'company') is distinct from 'string'
     or char_length(btrim(p ->> 'company')) not between 1 and 120 then
    return false;
  end if;
  -- Qué busca: lista cerrada
  if jsonb_typeof(p -> 'deliverable') is distinct from 'string'
     or (p ->> 'deliverable') not in ('post', 'video', 'story', 'event', 'ugc', 'other') then
    return false;
  end if;
  -- Web: opcional, https y ≤ 300, sin espacios
  if p ? 'website' and jsonb_typeof(p -> 'website') <> 'null' then
    if jsonb_typeof(p -> 'website') <> 'string'
       or char_length(p ->> 'website') > 300
       or (p ->> 'website') !~* '^https://[^\s/?#]+\.[^\s/?#]+([/?#]\S*)?$' then
      return false;
    end if;
  end if;
  -- Presupuesto: opcional, texto libre ≤ 60 ("USD 500", "a convenir")
  if p ? 'budget' and jsonb_typeof(p -> 'budget') <> 'null' then
    if jsonb_typeof(p -> 'budget') <> 'string' or char_length(btrim(p ->> 'budget')) not between 1 and 60 then
      return false;
    end if;
  end if;
  -- Fecha límite: opcional, AAAA-MM-DD válida
  if p ? 'deadline' and jsonb_typeof(p -> 'deadline') <> 'null' then
    v_deadline := p ->> 'deadline';
    if jsonb_typeof(p -> 'deadline') <> 'string' or v_deadline !~ '^\d{4}-\d{2}-\d{2}$' then
      return false;
    end if;
    begin
      if to_char(to_date(v_deadline, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> v_deadline then return false; end if;
    exception when others then
      return false;
    end;
  end if;
  return true;
end $$;

-- ─── 2. Tipo de mensaje ──────────────────────────────────────────────────────

alter table public.profile_messages add column if not exists kind text not null default 'message';
alter table public.profile_messages add column if not exists details jsonb;

alter table public.profile_messages drop constraint if exists profile_messages_kind_check;
alter table public.profile_messages add constraint profile_messages_kind_check check (kind in ('message', 'collab'));
alter table public.profile_messages drop constraint if exists profile_messages_kind_details_check;
alter table public.profile_messages add constraint profile_messages_kind_details_check check (
  (kind = 'message' and details is null) or (kind = 'collab' and mycen_valid_collab_details(details))
);

-- El dueño sigue pudiendo cambiar sólo read_at (los permisos por columna de la etapa 05 no incluyen kind ni details)

-- ─── 3. Proponer una colaboración (visitante, sin cuenta) ────────────────────

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
  -- Sólo si la versión publicada tiene el módulo de colaboraciones
  select snapshot into v_snap from profile_versions where id = v.published_version_id;
  if not exists (select 1 from jsonb_array_elements(coalesce(v_snap -> 'modules', '[]'::jsonb)) m where m ->> 'type' = 'collab') then
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

commit;
