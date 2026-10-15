-- =============================================================================
-- Módulos de bio (V1.1) — "Suscribirse": un visitante deja su email para que la persona dueña del perfil le escriba.
--
--   · profile_subscribers: la lista vive en Studio → Suscriptores. Mycen no manda ningún email a la lista.
--     El dueño lee y borra (y exporta CSV desde Studio); nadie inserta directo: sólo subscribe_profile (security definer).
--   · Consentimiento obligatorio (consent_at): sin la casilla marcada no se guarda nada.
--   · No se guarda IP ni datos del navegador. Para limitar la frecuencia se guarda un hash del visitante que cambia
--     cada día (misma sal que la analítica, las denuncias y los mensajes); el dueño no lo puede leer.
--   · Límites: email ≤ 254, nombre ≤ 80 (sólo si el módulo lo pide), 5 por visitante por perfil por día, 500 por perfil
--     por día y 50.000 por perfil. Los bots (agente conocido, campo trampa o < 3 s) reciben "ok" sin guardar nada.
--     Un email repetido responde "ok" (no se revela si ya estaba en la lista).
--
-- Requiere 20261031000001_bio_module_types (tipo 'subscribe'). Idempotente.
-- Vuelta atrás: drop function public.subscribe_profile(text, uuid, text, text, boolean, text, integer, text);
--               drop table public.profile_subscribers;
-- =============================================================================

begin;

create table if not exists public.profile_subscribers (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  email       text not null check (
                char_length(email) between 3 and 254
                and email = lower(email)
                and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  name        text check (name is null or char_length(name) between 1 and 80),
  consent_at  timestamptz not null,
  locale      text check (locale is null or locale in ('es','en','pt','fr','de','it','zh','ja','ko','hi','ar','ru')),
  -- Módulo "Suscribirse" desde el que llegó (sin FK: el módulo puede borrarse y la persona sigue en la lista)
  module_id   uuid,
  -- Hash diario del visitante: sólo para el límite de frecuencia (no identifica a nadie; el dueño no lo lee)
  sender_hash text not null,
  created_at  timestamptz not null default now()
);

create unique index if not exists profile_subscribers_email_uq on public.profile_subscribers (profile_id, lower(email));
create index if not exists profile_subscribers_profile_idx on public.profile_subscribers (profile_id, created_at desc);
create index if not exists profile_subscribers_sender_idx on public.profile_subscribers (sender_hash, profile_id, created_at);

alter table public.profile_subscribers enable row level security;

-- El dueño del perfil lee y borra. Nadie inserta ni modifica directo (no hay políticas de insert ni update).
drop policy if exists profile_subscribers_owner_select on public.profile_subscribers;
create policy profile_subscribers_owner_select on public.profile_subscribers for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
drop policy if exists profile_subscribers_owner_delete on public.profile_subscribers;
create policy profile_subscribers_owner_delete on public.profile_subscribers for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

revoke all on public.profile_subscribers from anon, authenticated;
-- Sin sender_hash: no le sirve al dueño
grant select (id, profile_id, email, name, consent_at, locale, module_id, created_at) on public.profile_subscribers to authenticated;
grant delete on public.profile_subscribers to authenticated;

-- ─── Suscribirse (visitante, sin cuenta) ─────────────────────────────────────
-- Respuestas: ok | not_found | consent_required | invalid | rate_limited | full

create or replace function public.subscribe_profile(
  p_handle     text,
  p_module_id  uuid,
  p_email      text,
  p_name       text default null,
  p_consent    boolean default false,
  p_hp         text default null,
  p_elapsed_ms integer default null,
  p_locale     text default null
) returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v          public.profiles;
  v_id       uuid;
  v_snap     jsonb;
  v_module   jsonb;
  v_email    text := lower(btrim(coalesce(p_email, '')));
  v_name     text := nullif(btrim(coalesce(p_name, '')), '');
  v_locale   text := lower(btrim(coalesce(p_locale, '')));
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
  -- Sólo si la versión publicada tiene ese módulo "Suscribirse" y está en su horario
  select snapshot into v_snap from profile_versions where id = v.published_version_id;
  select m into v_module
  from jsonb_array_elements(coalesce(v_snap -> 'modules', '[]'::jsonb)) m
  where m ->> 'type' = 'subscribe' and m ->> 'id' = p_module_id::text and mycen_module_live(m -> 'config')
  limit 1;
  if p_module_id is null or v_module is null then
    return 'not_found';
  end if;

  if not coalesce(p_consent, false) then
    return 'consent_required';
  end if;
  -- El nombre se guarda sólo si el módulo lo pide
  if coalesce(v_module -> 'content' ->> 'ask_name', '') <> 'true' then
    v_name := null;
  end if;
  if char_length(v_email) not between 3 and 254
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or (v_name is not null and char_length(v_name) > 80) then
    return 'invalid';
  end if;
  if v_locale not in ('es','en','pt','fr','de','it','zh','ja','ko','hi','ar','ru') then
    v_locale := null;
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ua := coalesce(v_headers ->> 'user-agent', '');
  v_ip := coalesce(btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), v_headers ->> 'x-real-ip', '');

  -- Bots: campo trampa completo, menos de 3 segundos o agente conocido. Se les responde "ok" y no se guarda nada.
  if nullif(btrim(coalesce(p_hp, '')), '') is not null
     or coalesce(p_elapsed_ms, 0) < 3000
     or v_ua ~* '(bot|crawl|spider|slurp|headless|lighthouse|curl|wget|python-requests)' then
    return 'ok';
  end if;

  select value into v_salt from mycen_private.secrets where key = 'visitor_salt';
  v_hash := left(encode(sha256(convert_to(
              v_ip || '|' || v_ua || '|' || coalesce(auth.uid()::text, '') || '|' || current_date::text || '|' || coalesce(v_salt, ''),
              'UTF8')), 'hex'), 32);

  if (select count(*) from profile_subscribers s
      where s.sender_hash = v_hash and s.profile_id = v.id and s.created_at > now() - interval '1 day') >= 5
     or (select count(*) from profile_subscribers s
         where s.profile_id = v.id and s.created_at > now() - interval '1 day') >= 500 then
    return 'rate_limited';
  end if;

  -- Ya estaba: "ok" sin decir nada más
  if exists (select 1 from profile_subscribers s where s.profile_id = v.id and lower(s.email) = v_email) then
    return 'ok';
  end if;
  if (select count(*) from profile_subscribers s where s.profile_id = v.id) >= 50000 then
    return 'full';
  end if;

  insert into profile_subscribers (profile_id, email, name, consent_at, locale, module_id, sender_hash)
  values (v.id, v_email, v_name, now(), v_locale, p_module_id, v_hash)
  on conflict (profile_id, lower(email)) do nothing;
  return 'ok';
end $$;

revoke all on function public.subscribe_profile(text, uuid, text, text, boolean, text, integer, text) from public;
grant execute on function public.subscribe_profile(text, uuid, text, text, boolean, text, integer, text) to anon, authenticated;

commit;
