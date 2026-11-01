-- =============================================================================
-- Identity · entrega 2 (módulos nuevos). Idempotente.
--
--   1. Tipos nuevos: encuesta (poll), descargables (downloads), cupón (coupon), galería de videos (video_gallery) y
--      podcast. Cupón, galería de videos y podcast no guardan nada más que su contenido.
--   2. Encuesta: profile_poll_votes (nadie la lee directo). Votar con vote_profile_poll (anónimo, un voto por
--      visitante, poll y día con el hash diario de siempre, sin IP; se puede cambiar el voto ese día) y ver
--      resultados con get_poll_results (sólo cantidades, sólo de una encuesta publicada).
--   3. Descargables: bucket profile-files (sólo PDF, hasta 10 MB, cada cuenta escribe en su carpeta, sin listado
--      público: los archivos se bajan por su link).
--   4. Segunda foto de perfil: theme.avatar_alt = { url (https), when: 'amanecer' | 'noche' } (la foto que se ve
--      con el tema Amanecer, o de noche). Se valida como el resto del tema.
-- =============================================================================

begin;

-- ─── 1. Tipos de módulo ──────────────────────────────────────────────────────
alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards','project','portfolio','link_group','media','contact_form',
  'support','subscribe','latest_video','listen_on','collab',
  'poll','downloads','coupon','video_gallery','podcast'
));

-- ─── 2. Encuesta ─────────────────────────────────────────────────────────────
create table if not exists public.profile_poll_votes (
  module_id  uuid not null references public.profile_modules(id) on delete cascade,
  voter_hash text not null check (char_length(voter_hash) between 16 and 64),
  option_id  text not null check (option_id ~ '^[a-z0-9]{1,16}$'),
  day        date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (module_id, voter_hash)
);
alter table public.profile_poll_votes enable row level security;
revoke all on public.profile_poll_votes from anon, authenticated;
create index if not exists profile_poll_votes_module_idx on public.profile_poll_votes (module_id, option_id);

/** Encuesta publicada y en horario de un Space (null si no existe) */
create or replace function public.mycen_published_poll(p_handle text, p_module_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v      public.profiles;
  v_id   uuid;
  v_snap jsonb;
  v_mod  jsonb;
begin
  if p_module_id is null then return null; end if;
  select o_id into v_id from mycen_find_space(p_handle);
  select * into v from profiles where id = v_id;
  if not found or v.status <> 'published' or v.visibility = 'private' or mycen_space_suspended(v.id) then
    return null;
  end if;
  select snapshot into v_snap from profile_versions where id = v.published_version_id;
  select m into v_mod
  from jsonb_array_elements(coalesce(v_snap -> 'modules', '[]'::jsonb)) m
  where m ->> 'type' = 'poll' and m ->> 'id' = p_module_id::text and mycen_module_live(m -> 'config')
  limit 1;
  return v_mod;
end $$;

/** Resultados: total y votos por opción (sólo de las opciones que tiene hoy la encuesta) */
create or replace function public.get_poll_results(p_handle text, p_module_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_mod    jsonb := mycen_published_poll(p_handle, p_module_id);
  v_counts jsonb;
begin
  if v_mod is null then return null; end if;
  select coalesce(jsonb_object_agg(option_id, n), '{}'::jsonb) into v_counts
  from (
    select option_id, count(*) as n from profile_poll_votes
    where module_id = p_module_id
      and option_id in (select o ->> 'id' from jsonb_array_elements(coalesce(v_mod -> 'content' -> 'options', '[]'::jsonb)) o)
    group by option_id
  ) c;
  return jsonb_build_object('counts', v_counts,
    'total', (select coalesce(sum(value::int), 0) from jsonb_each_text(v_counts)));
end $$;

/** Votar (anónimo). Devuelve 'ok' con los resultados, 'not_found' o 'invalid'. Bots: 'ok' sin guardar. */
create or replace function public.vote_profile_poll(p_handle text, p_module_id uuid, p_option text)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v_mod     jsonb := mycen_published_poll(p_handle, p_module_id);
  v_headers json;
  v_ua      text;
  v_ip      text;
  v_salt    text;
  v_hash    text;
begin
  if v_mod is null then return jsonb_build_object('status', 'not_found'); end if;
  if p_option is null or not exists (
    select 1 from jsonb_array_elements(coalesce(v_mod -> 'content' -> 'options', '[]'::jsonb)) o where o ->> 'id' = p_option
  ) then
    return jsonb_build_object('status', 'invalid');
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ua := coalesce(v_headers ->> 'user-agent', '');
  v_ip := coalesce(btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), v_headers ->> 'x-real-ip', '');
  if v_ua ~* '(bot|crawl|spider|slurp|headless|lighthouse|curl|wget|python-requests)' then
    return jsonb_build_object('status', 'ok', 'results', get_poll_results(p_handle, p_module_id));
  end if;

  select value into v_salt from mycen_private.secrets where key = 'visitor_salt';
  v_hash := left(encode(sha256(convert_to(
              v_ip || '|' || v_ua || '|' || coalesce(auth.uid()::text, '') || '|' || current_date::text || '|' || coalesce(v_salt, ''),
              'UTF8')), 'hex'), 32);

  -- Tope por encuesta y día (evita que alguien la llene a mano cambiando de red)
  if (select count(*) from profile_poll_votes where module_id = p_module_id and day = current_date) >= 5000 then
    return jsonb_build_object('status', 'ok', 'results', get_poll_results(p_handle, p_module_id));
  end if;

  insert into profile_poll_votes (module_id, voter_hash, option_id)
  values (p_module_id, v_hash, p_option)
  on conflict (module_id, voter_hash) do update set option_id = excluded.option_id, created_at = now();

  return jsonb_build_object('status', 'ok', 'results', get_poll_results(p_handle, p_module_id));
end $$;

revoke all on function public.mycen_published_poll(text, uuid) from public, anon, authenticated;
revoke all on function public.get_poll_results(text, uuid) from public;
revoke all on function public.vote_profile_poll(text, uuid, text) from public;
grant execute on function public.get_poll_results(text, uuid) to anon, authenticated;
grant execute on function public.vote_profile_poll(text, uuid, text) to anon, authenticated;

-- ─── 3. Descargables (PDF) ───────────────────────────────────────────────────
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('profile-files', 'profile-files', true, 10485760, array['application/pdf'])
  on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

  drop policy if exists "profile_files_owner_select" on storage.objects;
  create policy "profile_files_owner_select" on storage.objects for select to authenticated
    using (bucket_id = 'profile-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
  drop policy if exists "profile_files_owner_insert" on storage.objects;
  create policy "profile_files_owner_insert" on storage.objects for insert to authenticated
    with check (bucket_id = 'profile-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
  drop policy if exists "profile_files_owner_update" on storage.objects;
  create policy "profile_files_owner_update" on storage.objects for update to authenticated
    using (bucket_id = 'profile-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
  drop policy if exists "profile_files_owner_delete" on storage.objects;
  create policy "profile_files_owner_delete" on storage.objects for delete to authenticated
    using (bucket_id = 'profile-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
end $$;

-- ─── 4. Segunda foto de perfil en el tema ────────────────────────────────────
create or replace function public.mycen_valid_profile_look(p_theme jsonb)
returns boolean language sql immutable set search_path = public, extensions, pg_temp as $$
  select p_theme is null or (
    jsonb_typeof(p_theme) = 'object'
    and (p_theme -> 'layout' is null
         or p_theme ->> 'layout' in ('credencial', 'portada', 'editorial', 'bento', 'clasica'))
    and (p_theme -> 'mode' is null
         or p_theme ->> 'mode' in ('universo', 'amanecer', 'dark', 'light', 'auto'))
    and (p_theme -> 'accent' is null
         or p_theme ->> 'accent' in ('plasma', 'ion', 'nebulosa', 'aurora', 'sol', 'rosa', 'lima', 'luna', 'mono', 'grafito', 'pizarra', 'arena')
         or p_theme ->> 'accent' ~ '^#[0-9A-Fa-f]{6}$')
    and (p_theme -> 'huella_variant' is null
         or p_theme ->> 'huella_variant' in ('orbitas', 'hilos', 'constelacion', 'pulso'))
    and (p_theme -> 'cover' is null or jsonb_typeof(p_theme -> 'cover') = 'null' or (
         jsonb_typeof(p_theme -> 'cover') = 'object'
         and p_theme -> 'cover' ->> 'type' in ('huella', 'imagen')
         and (p_theme -> 'cover' -> 'url' is null or jsonb_typeof(p_theme -> 'cover' -> 'url') = 'null' or (
              jsonb_typeof(p_theme -> 'cover' -> 'url') = 'string'
              and char_length(p_theme -> 'cover' ->> 'url') <= 2048
              and p_theme -> 'cover' ->> 'url' ~ '^https://'))))
    and (p_theme -> 'avatar_alt' is null or jsonb_typeof(p_theme -> 'avatar_alt') = 'null' or (
         jsonb_typeof(p_theme -> 'avatar_alt') = 'object'
         and p_theme -> 'avatar_alt' ->> 'when' in ('amanecer', 'noche')
         and jsonb_typeof(p_theme -> 'avatar_alt' -> 'url') = 'string'
         and char_length(p_theme -> 'avatar_alt' ->> 'url') <= 2048
         and p_theme -> 'avatar_alt' ->> 'url' ~ '^https://')))
$$;

commit;

notify pgrst, 'reload schema';
