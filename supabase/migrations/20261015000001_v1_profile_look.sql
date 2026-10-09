-- =============================================================================
-- Mycen V1 · Etapa 03 — Perfil: cinco estructuras, temas Universo / Amanecer, huella y perfil vivo
--
--   · profiles.theme suma: layout (credencial|portada|editorial|bento|clasica), mode (universo|amanecer),
--     accent (plasma|ion|nebulosa|aurora), huella_variant (orbitas|hilos|constelacion|pulso) y
--     cover ({ type: 'huella'|'imagen', url? }, sólo Portada). Se validan en la base.
--   · profiles.huella_salt: cambia con "Generar otra" (se publica con la versión).
--   · profiles.status_text (≤ 60) y profiles.available: el "perfil vivo". Se ven al instante, sin volver a
--     publicar (get_public_profile los lee de la fila, no de la versión congelada).
--   · Perfiles existentes: estructura Clásica, tema Universo (Amanecer si eligieron modo claro) y el acento de
--     la paleta más cercano a su color. Las versiones ya publicadas no se tocan (son inmutables): la app
--     interpreta los valores viejos con la misma regla (src/modules/profile/lib/profileLook.ts).
--
-- Requiere las migraciones de Identity hasta 20261014000001. Idempotente.
-- Vuelta atrás: docs/v1/sql/03_rollback.sql
-- =============================================================================

begin;

-- ─── 1. Columnas nuevas ──────────────────────────────────────────────────────

alter table public.profiles add column if not exists huella_salt text;
alter table public.profiles add column if not exists status_text text;
alter table public.profiles add column if not exists available boolean not null default false;

alter table public.profiles drop constraint if exists profiles_huella_salt_check;
alter table public.profiles add constraint profiles_huella_salt_check
  check (huella_salt is null or huella_salt ~ '^[A-Za-z0-9_-]{1,40}$');

alter table public.profiles drop constraint if exists profiles_status_text_check;
alter table public.profiles add constraint profiles_status_text_check
  check (status_text is null or char_length(status_text) <= 60);

-- Un estado vacío o sólo con espacios es "sin estado"
create or replace function public.mycen_profile_status_text()
returns trigger language plpgsql as $$
begin
  new.status_text := nullif(btrim(new.status_text), '');
  return new;
end $$;

drop trigger if exists profiles_status_text on public.profiles;
create trigger profiles_status_text
  before insert or update of status_text on public.profiles
  for each row execute function public.mycen_profile_status_text();

-- ─── 2. Acento más cercano (perfiles con un color libre de antes) ───────────
-- Misma regla que nearestAccent() en src/modules/profile/lib/profileLook.ts: el tono (hue) más cercano entre los
-- de la paleta (Plasma 12°, Aurora 171°, Ion 199°, Nebulosa 252°). Los grises (poca saturación) quedan en Plasma.

create or replace function public.mycen_nearest_accent(p_hex text)
returns text language plpgsql immutable as $$
declare
  r numeric; g numeric; b numeric; mx numeric; mn numeric; d numeric; h numeric;
  v_best text := 'plasma';
  v_min numeric := 999;
  v_dist numeric;
  c record;
begin
  if p_hex is null or p_hex !~ '^#?[0-9A-Fa-f]{6}$' then return 'plasma'; end if;
  p_hex := ltrim(p_hex, '#');
  r := ('x' || substr(p_hex, 1, 2))::bit(8)::int / 255.0;
  g := ('x' || substr(p_hex, 3, 2))::bit(8)::int / 255.0;
  b := ('x' || substr(p_hex, 5, 2))::bit(8)::int / 255.0;
  mx := greatest(r, g, b); mn := least(r, g, b); d := mx - mn;
  -- Saturación (HSL) baja: gris, blanco o negro
  if d = 0 or d / (1 - abs(mx + mn - 1)) < 0.15 then return 'plasma'; end if;
  if mx = r then h := 60 * (((g - b) / d) + 6);
  elsif mx = g then h := 60 * (((b - r) / d) + 2);
  else h := 60 * (((r - g) / d) + 4);
  end if;
  h := h - 360 * floor(h / 360);
  for c in select * from (values ('plasma', 12), ('aurora', 171), ('ion', 199), ('nebulosa', 252)) as t(name, hue) loop
    v_dist := least(abs(h - c.hue), 360 - abs(h - c.hue));
    if v_dist < v_min then v_min := v_dist; v_best := c.name; end if;
  end loop;
  return v_best;
end $$;

-- ─── 3. Validación del aspecto (profiles.theme) ─────────────────────────────
-- mode y accent aceptan todavía los valores de antes (dark/light/auto y un color #RRGGBB): Studio → Apariencia
-- los sigue escribiendo hasta la etapa 06, y la app los interpreta igual que la migración de abajo.

create or replace function public.mycen_valid_profile_look(p_theme jsonb)
returns boolean language sql immutable as $$
  select p_theme is null or (
    jsonb_typeof(p_theme) = 'object'
    and (p_theme -> 'layout' is null
         or p_theme ->> 'layout' in ('credencial', 'portada', 'editorial', 'bento', 'clasica'))
    and (p_theme -> 'mode' is null
         or p_theme ->> 'mode' in ('universo', 'amanecer', 'dark', 'light', 'auto'))
    and (p_theme -> 'accent' is null
         or p_theme ->> 'accent' in ('plasma', 'ion', 'nebulosa', 'aurora')
         or p_theme ->> 'accent' ~ '^#[0-9A-Fa-f]{6}$')
    and (p_theme -> 'huella_variant' is null
         or p_theme ->> 'huella_variant' in ('orbitas', 'hilos', 'constelacion', 'pulso'))
    and (p_theme -> 'cover' is null or jsonb_typeof(p_theme -> 'cover') = 'null' or (
         jsonb_typeof(p_theme -> 'cover') = 'object'
         and p_theme -> 'cover' ->> 'type' in ('huella', 'imagen')
         and (p_theme -> 'cover' -> 'url' is null or jsonb_typeof(p_theme -> 'cover' -> 'url') = 'null' or (
              jsonb_typeof(p_theme -> 'cover' -> 'url') = 'string'
              and char_length(p_theme -> 'cover' ->> 'url') <= 2048
              and p_theme -> 'cover' ->> 'url' ~ '^https://')))))
$$;

-- ─── 4. Perfiles existentes: Clásica, Universo (o Amanecer) y el acento más cercano ──

-- Misma regla que profileLook() en la app (que la aplica a las versiones ya publicadas, que no se tocan)
create or replace function public.mycen_upgrade_theme(p_theme jsonb)
returns jsonb language sql immutable as $$
  select coalesce(p_theme, '{}'::jsonb) || jsonb_build_object(
    'layout', case when p_theme ->> 'layout' in ('credencial', 'portada', 'editorial', 'bento', 'clasica')
                   then p_theme ->> 'layout' else 'clasica' end,
    'mode', case when p_theme ->> 'mode' in ('light', 'amanecer') then 'amanecer' else 'universo' end,
    'accent', case
      when p_theme ->> 'accent' in ('plasma', 'ion', 'nebulosa', 'aurora') then p_theme ->> 'accent'
      when p_theme ->> 'accent' ~ '^#?[0-9A-Fa-f]{6}$' then public.mycen_nearest_accent(p_theme ->> 'accent')
      else 'plasma' end)
$$;

update public.profiles set theme = public.mycen_upgrade_theme(theme)
where coalesce(theme ->> 'layout', '') not in ('credencial', 'portada', 'editorial', 'bento', 'clasica')
   or coalesce(theme ->> 'mode', '') not in ('universo', 'amanecer')
   or coalesce(theme ->> 'accent', '') not in ('plasma', 'ion', 'nebulosa', 'aurora');

-- Valores que la etapa no conoce (ej. una estructura escrita a mano) vuelven a los de por defecto
update public.profiles set theme = theme - 'huella_variant'
where not public.mycen_valid_profile_look(theme) and theme ? 'huella_variant';
update public.profiles set theme = theme - 'cover'
where not public.mycen_valid_profile_look(theme) and theme ? 'cover';

alter table public.profiles drop constraint if exists profiles_theme_look_check;
alter table public.profiles add constraint profiles_theme_look_check check (public.mycen_valid_profile_look(theme));

-- ─── 5. La versión publicada incluye la huella ──────────────────────────────

create or replace function public.mycen_space_snapshot(p_profile_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id',               v.id,
    'username',         v.username,
    'display_name',     v.display_name,
    'descriptor',       v.descriptor,
    'bio',              v.bio,
    'avatar_url',       v.avatar_url,
    'cover_url',        v.cover_url,
    'purpose',          v.purpose,
    'tags',             to_jsonb(v.tags),
    'theme',            v.theme,
    'huella_salt',      v.huella_salt,
    'primary_action',   v.primary_action,
    'default_locale',   v.default_locale,
    'translations',     v.translations,
    'has_contact_card', coalesce((v.contact_card ->> 'enabled')::boolean, false),
    'contact_card',     v.contact_card,
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'type', m.type, 'title', m.title,
               'content', m.content, 'config', m.config - 'legacy_source' - 'legacy_id' - 'legacy_click_count',
               'translations', m.translations)
             order by m.position, m.created_at)
      from profile_modules m
      where m.profile_id = v.id and m.visibility = 'active' and m.deleted_at is null
    ), '[]'::jsonb)
  )
  from profiles v where v.id = p_profile_id;
$$;

revoke all on function public.mycen_space_snapshot(uuid) from public, anon, authenticated;

-- Restaurar una versión trae también su huella (las versiones viejas no la tienen: queda la actual)
create or replace function public.mycen_apply_snapshot(p_profile_id uuid, p_snapshot jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
begin
  update profiles set
    display_name   = coalesce(p_snapshot ->> 'display_name', display_name),
    descriptor     = p_snapshot ->> 'descriptor',
    bio            = p_snapshot ->> 'bio',
    avatar_url     = p_snapshot ->> 'avatar_url',
    cover_url      = p_snapshot ->> 'cover_url',
    purpose        = coalesce(p_snapshot ->> 'purpose', purpose),
    tags           = coalesce(array(select jsonb_array_elements_text(p_snapshot -> 'tags')), '{}'),
    theme          = coalesce(p_snapshot -> 'theme', '{}'::jsonb),
    huella_salt    = case when p_snapshot ? 'huella_salt' then p_snapshot ->> 'huella_salt' else huella_salt end,
    primary_action = case when jsonb_typeof(p_snapshot -> 'primary_action') = 'object' then p_snapshot -> 'primary_action' end,
    default_locale = coalesce(p_snapshot ->> 'default_locale', default_locale),
    translations   = coalesce(p_snapshot -> 'translations', '{}'::jsonb),
    contact_card   = coalesce(p_snapshot -> 'contact_card', contact_card)
  where id = p_profile_id;

  select coalesce(array_agg((m ->> 'id')::uuid), '{}') into v_ids
  from jsonb_array_elements(coalesce(p_snapshot -> 'modules', '[]'::jsonb)) m;

  insert into profile_modules (id, profile_id, type, title, content, config, translations, position, visibility, deleted_at)
  select (m ->> 'id')::uuid, p_profile_id, m ->> 'type', m ->> 'title',
         coalesce(m -> 'content', '{}'::jsonb), coalesce(m -> 'config', '{}'::jsonb),
         coalesce(m -> 'translations', '{}'::jsonb), (o * 10)::integer, 'active', null
  from jsonb_array_elements(coalesce(p_snapshot -> 'modules', '[]'::jsonb)) with ordinality as t(m, o)
  on conflict (id) do update set
    type         = excluded.type,
    title        = excluded.title,
    content      = excluded.content,
    config       = profile_modules.config || excluded.config,
    translations = excluded.translations,
    position     = excluded.position,
    visibility   = 'active',
    deleted_at   = null
  where profile_modules.profile_id = p_profile_id;

  update profile_modules set visibility = 'hidden'
  where profile_id = p_profile_id and deleted_at is null and visibility = 'active' and not (id = any(v_ids));
end $$;

revoke all on function public.mycen_apply_snapshot(uuid, jsonb) from public, anon, authenticated;

-- ─── 6. Página pública: la versión publicada + el perfil vivo ───────────────

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
