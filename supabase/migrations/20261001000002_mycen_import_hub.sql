-- =============================================================================
-- MYCEN · Fase 0 · Paso 3 — Importar el Hub actual a Mycen Profile
-- =============================================================================
-- "Un solo sistema": todo lo cargado en el Hub (restaurants.hub_*, hub_config,
-- hub_links, hub_stories, hub_featured_product, hub_gallery, hub_reviews,
-- hub_analytics) pasa a profiles + profile_modules + profile_events.
--
-- • NO borra ni modifica las tablas hub_* (el Hub actual sigue funcionando
--   hasta que Studio lo reemplace).
-- • El username = slug actual → las URLs y QRs impresos no cambian.
-- • Idempotente: correrla dos veces no duplica nada.
-- • mycen_import_hub(null, true) re-sincroniza todo (usar el día del cambio
--   a Studio, antes de apagar el editor viejo). Sólo reemplaza módulos
--   importados (config.legacy_source), nunca los creados en Studio.
--
-- Uso:   select * from public.mycen_import_hub();
-- =============================================================================

begin;

-- Registro de qué negocios ya se importaron
create table if not exists mycen_private.hub_imports (
  restaurant_id uuid        primary key,
  profile_id    uuid        not null,
  imported_at   timestamptz not null default now()
);

create or replace function public.mycen_import_hub(
  p_restaurant_id    uuid    default null,
  p_replace          boolean default false,
  p_import_analytics boolean default true
)
returns table (restaurant_slug text, profile_username text, result text)
language plpgsql security definer set search_path = public as $$
declare
  r          record;
  rj         jsonb;
  hc         jsonb;
  v_owner    uuid;
  v_profile  public.profiles;
  v_username text;
  v_new      boolean;
  v_first    boolean;
  v_note     text;
  v_cta_url  text;
  v_cta_txt  text;
  v_btype    text;
  v_plan     text;
  v_social   jsonb;
  v_key      text;
  v_val      text;
  v_url      text;
  v_pos      integer;
  v_items    jsonb;
  v_salt     text;
begin
  perform set_config('mycen.legacy_import', 'on', true);
  select value into v_salt from mycen_private.secrets where key = 'visitor_salt';

  for r in
    select * from restaurants x
    where p_restaurant_id is null or x.id = p_restaurant_id
    order by x.created_at nulls last, x.id
  loop
    begin
      rj        := to_jsonb(r);
      v_owner   := (rj ->> 'owner_id')::uuid;
      v_btype   := rj ->> 'business_type';
      v_plan    := rj ->> 'plan';
      v_note    := null;
      select to_jsonb(h) into hc from hub_config h where h.restaurant_id = r.id;
      hc := coalesce(hc, '{}'::jsonb);

      if v_owner is null then
        restaurant_slug := r.slug; profile_username := null; result := 'omitido: sin owner_id';
        return next; continue;
      end if;

      -- ── Perfil ────────────────────────────────────────────────────────────
      select * into v_profile from profiles where restaurant_id = r.id;
      v_new := not found;

      if v_new then
        v_username := lower(btrim(r.slug));
        v_username := regexp_replace(v_username, '[^a-z0-9_-]', '-', 'g');
        v_username := regexp_replace(v_username, '^[^a-z0-9]+', '');
        v_username := left(v_username, 63);
        if v_username = ''
           or exists (select 1 from reserved_usernames where username = v_username)
           or exists (select 1 from profiles where username = v_username)
           or exists (select 1 from profile_username_history where old_username = v_username) then
          v_username := left(coalesce(nullif(v_username, ''), 'perfil'), 50) || '-' || left(replace(r.id::text, '-', ''), 6);
          v_note := 'username cambiado (slug reservado, inválido o en uso): ' || r.slug || ' → ' || v_username;
        end if;

        insert into profiles (user_id, restaurant_id, username, purpose, status, is_primary)
        values (
          v_owner, r.id, v_username, 'business',
          case when coalesce((rj ->> 'hub_enabled')::boolean, true) then 'published' else 'unpublished' end,
          not exists (select 1 from profiles where user_id = v_owner and is_primary)
        )
        returning * into v_profile;
      end if;

      v_first := not exists (select 1 from mycen_private.hub_imports i where i.restaurant_id = r.id);

      if not (v_new or v_first or p_replace) then
        restaurant_slug := r.slug; profile_username := v_profile.username; result := 'ya importado (sin cambios)';
        return next; continue;
      end if;

      -- ── Campos de identidad ───────────────────────────────────────────────
      v_cta_url := nullif(btrim(rj ->> 'hub_main_cta_url'), '');
      v_cta_txt := nullif(btrim(rj ->> 'hub_main_cta_text'), '');

      update profiles set
        display_name = left(coalesce(nullif(btrim(hc ->> 'hub_title'), ''), r.name, ''), 80),
        descriptor   = left(coalesce(nullif(btrim(rj ->> 'short_description'), ''), nullif(btrim(rj ->> 'hub_category'), '')), 120),
        bio          = left(coalesce(nullif(btrim(rj ->> 'hub_about'), ''), nullif(btrim(rj ->> 'description'), '')), 1000),
        avatar_url   = nullif(rj ->> 'logo_url', ''),
        cover_url    = coalesce(nullif(rj ->> 'hub_cover_url', ''), nullif(rj ->> 'cover_image_url', '')),
        default_locale = lower(coalesce(nullif(rj ->> 'default_language', ''), 'es')),
        theme = jsonb_build_object(
          'mode',       'dark',
          'accent',     coalesce(nullif(hc ->> 'accent_color', ''), '#F59E0B'),
          'surface',    'glass',
          'title_font', coalesce(nullif(hc ->> 'title_font', ''), 'syne'),
          'show_open_status', coalesce((hc ->> 'show_open_status')::boolean, true)),
        primary_action = case
          when v_cta_url is not null then
            jsonb_build_object('kind', 'custom', 'label', coalesce(v_cta_txt, 'Ver más'), 'url', v_cta_url)
          when v_plan = 'hub_free' then null
          when v_btype = 'retail' then
            jsonb_build_object('kind', 'shop', 'label', 'Ver catálogo', 'url', '/catalogo/' || r.slug)
          when coalesce(v_btype, 'gastronomy') = 'gastronomy' then
            jsonb_build_object('kind', 'menu', 'label', 'Ver menú', 'url', '/r/' || r.slug)
          else null
        end,
        translations = jsonb_strip_nulls(jsonb_build_object('en', jsonb_strip_nulls(jsonb_build_object(
          'bio',          nullif(btrim(coalesce(rj ->> 'hub_about_en', rj ->> 'description_en')), ''),
          'display_name', nullif(btrim(rj ->> 'name_en'), ''),
          'descriptor',   nullif(btrim(rj ->> 'short_description_en'), ''),
          '_source',      'manual')))),
        -- Tarjeta de contacto: precargada con datos ya públicos, pero APAGADA
        contact_card = jsonb_strip_nulls(jsonb_build_object(
          'enabled', false,
          'name',    r.name,
          'email',   nullif(rj ->> 'email', ''),
          'phone',   nullif(rj ->> 'phone', ''),
          'website', nullif(rj ->> 'website', '')))
      where id = v_profile.id;

      -- Perfil sin traducción manual → translations vacío
      update profiles set translations = '{}'::jsonb
      where id = v_profile.id and translations = '{"en": {"_source": "manual"}}'::jsonb;

      -- ── Módulos ───────────────────────────────────────────────────────────
      if p_replace then
        delete from profile_modules where profile_id = v_profile.id and config ? 'legacy_source';
      end if;

      -- Novedad (hub_stories) → text
      insert into profile_modules (profile_id, type, title, content, translations, position, visibility, config)
      select v_profile.id, 'text', left(s ->> 'title', 120),
             jsonb_strip_nulls(jsonb_build_object('body', coalesce(s ->> 'text', s ->> 'description'), 'image_url', s ->> 'image_url')),
             jsonb_strip_nulls(jsonb_build_object('en', jsonb_strip_nulls(jsonb_build_object(
               'title', s ->> 'title_en', 'body', coalesce(s ->> 'text_en', s ->> 'description_en'))))),
             10, 'active',
             jsonb_build_object('legacy_source', 'hub_stories', 'legacy_id', s ->> 'id', 'variant', 'story')
      from (select to_jsonb(x) as s from hub_stories x
            where x.restaurant_id = r.id and x.is_active order by x.created_at desc nulls last limit 1) st;

      -- Producto destacado → product
      insert into profile_modules (profile_id, type, title, content, position, visibility, config)
      select v_profile.id, 'product', left(f ->> 'name', 120),
             jsonb_strip_nulls(jsonb_build_object(
               'name', f ->> 'name', 'description', f ->> 'description',
               'price', (f ->> 'price')::numeric, 'image_url', f ->> 'image_url', 'tag', f ->> 'tag',
               'cta_text', f ->> 'cta_text', 'cta_url', f ->> 'cta_url')),
             20, 'active',
             jsonb_build_object('legacy_source', 'hub_featured_product', 'legacy_id', f ->> 'id')
      from (select to_jsonb(x) as f from hub_featured_product x
            where x.restaurant_id = r.id and x.is_active order by x.created_at desc nulls last limit 1) fp;

      -- Links (todos, respetando activo/oculto y orden)
      insert into profile_modules (profile_id, type, title, content, position, visibility, config)
      select v_profile.id, 'link', left(l.label, 120),
             jsonb_strip_nulls(jsonb_build_object(
               'url', l.url, 'link_type', coalesce(l.type, 'custom'),
               'icon', l.icon, 'image_url', to_jsonb(l) ->> 'image_url')),
             100 + coalesce(l.sort_order, 0),
             case when l.is_active then 'active' else 'hidden' end,
             jsonb_build_object('legacy_source', 'hub_links', 'legacy_id', l.id::text,
                                'legacy_click_count', coalesce(l.click_count, 0))
      from hub_links l
      where l.restaurant_id = r.id and coalesce(l.url, '') <> '';

      -- Galería → un módulo gallery
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'url', g.url, 'type', coalesce(g.type, 'image'), 'caption', g.caption,
               'thumbnail_url', to_jsonb(g) ->> 'thumbnail_url'))
             order by g.sort_order, g.id)
        into v_items
      from hub_gallery g where g.restaurant_id = r.id and g.is_active;
      if v_items is not null then
        insert into profile_modules (profile_id, type, title, content, position, config)
        values (v_profile.id, 'gallery', 'Galería', jsonb_build_object('items', v_items), 300,
                jsonb_build_object('legacy_source', 'hub_gallery'));
      end if;

      -- Reseñas + Google rating → testimonials
      -- reviewer_name (esquema real) o author_name (migración del repo)
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'author_name', coalesce(v.j ->> 'reviewer_name', v.j ->> 'author_name'),
               'rating', (v.j ->> 'rating')::integer, 'text', v.j ->> 'text',
               'color', v.j ->> 'profile_color'))
             order by (v.j ->> 'sort_order')::integer nulls last, v.j ->> 'id')
        into v_items
      from (select to_jsonb(x) as j from hub_reviews x where x.restaurant_id = r.id) v;
      if v_items is not null or rj ->> 'google_rating' is not null then
        insert into profile_modules (profile_id, type, title, content, position, config)
        values (v_profile.id, 'testimonials', 'Reseñas',
                jsonb_strip_nulls(jsonb_build_object(
                  'items', coalesce(v_items, '[]'::jsonb),
                  'google', jsonb_strip_nulls(jsonb_build_object(
                    'rating', (rj ->> 'google_rating')::numeric,
                    'count',  (rj ->> 'google_review_count')::integer,
                    'url',    nullif(rj ->> 'google_review_url', ''))))),
                400, jsonb_build_object('legacy_source', 'hub_reviews'));
      end if;

      -- Redes (restaurants.social_links) → social
      v_social := case when jsonb_typeof(rj -> 'social_links') = 'object' then rj -> 'social_links' else '{}'::jsonb end;
      v_pos := 500;
      for v_key, v_val in select key, btrim(value) from jsonb_each_text(v_social) order by key loop
        continue when coalesce(v_val, '') = '';
        continue when v_key = 'google_maps';  -- va al módulo de ubicación
        v_url := case
          when v_val ~* '^https?://'  then v_val
          when v_key = 'instagram'    then 'https://instagram.com/' || ltrim(v_val, '@')
          when v_key = 'tiktok'       then 'https://tiktok.com/@'   || ltrim(v_val, '@')
          when v_key = 'facebook'     then 'https://facebook.com/'  || ltrim(v_val, '@')
          when v_key in ('twitter','x') then 'https://x.com/'       || ltrim(v_val, '@')
          when v_key = 'youtube'      then 'https://youtube.com/@'  || ltrim(v_val, '@')
          when v_key = 'linkedin'     then 'https://linkedin.com/in/' || ltrim(v_val, '@')
          when v_key = 'whatsapp'     then 'https://wa.me/' || regexp_replace(v_val, '\D', '', 'g')
          else null
        end;
        continue when v_url is null;
        insert into profile_modules (profile_id, type, title, content, position, config)
        values (v_profile.id, 'social', initcap(replace(v_key, '_', ' ')),
                jsonb_build_object('network', v_key, 'handle', v_val, 'url', v_url),
                v_pos, jsonb_build_object('legacy_source', 'social_links', 'legacy_id', v_key));
        v_pos := v_pos + 1;
      end loop;

      -- Contacto (respeta show_contact)
      if coalesce(nullif(rj ->> 'email', ''), nullif(rj ->> 'phone', ''), nullif(v_social ->> 'whatsapp', '')) is not null then
        insert into profile_modules (profile_id, type, title, content, position, visibility, config)
        values (v_profile.id, 'contact', 'Contacto',
                jsonb_strip_nulls(jsonb_build_object(
                  'email',    nullif(rj ->> 'email', ''),
                  'phone',    nullif(rj ->> 'phone', ''),
                  'whatsapp', nullif(v_social ->> 'whatsapp', ''))),
                600,
                case when coalesce((hc ->> 'show_contact')::boolean, true) then 'active' else 'hidden' end,
                jsonb_build_object('legacy_source', 'restaurants.contact'));
      end if;

      -- Ubicación (respeta show_locations)
      if coalesce(nullif(rj ->> 'address', ''), nullif(v_social ->> 'google_maps', '')) is not null then
        insert into profile_modules (profile_id, type, title, content, position, visibility, config)
        values (v_profile.id, 'location', 'Ubicación',
                jsonb_strip_nulls(jsonb_build_object(
                  'address', rj ->> 'address', 'city', coalesce(nullif(rj ->> 'hub_city', ''), nullif(rj ->> 'city', '')),
                  'directions', nullif(rj ->> 'directions', ''),
                  'maps_url', nullif(v_social ->> 'google_maps', ''))),
                700,
                case when coalesce((hc ->> 'show_locations')::boolean, true) then 'active' else 'hidden' end,
                jsonb_build_object('legacy_source', 'restaurants.address'));
      end if;

      -- Horarios (respeta show_schedule)
      -- El editor del Hub guarda en `schedule` ({open, close, closed}); business_hours es otro formato
      -- Perfiles personales (hub_free) no tienen horario comercial
      if coalesce(v_plan, '') <> 'hub_free'
         and jsonb_typeof(rj -> 'schedule') = 'object' and rj -> 'schedule' <> '{}'::jsonb then
        insert into profile_modules (profile_id, type, title, content, position, visibility, config)
        values (v_profile.id, 'hours', 'Horarios',
                jsonb_build_object('schedule', rj -> 'schedule',
                                   'timezone', coalesce(rj ->> 'timezone', 'America/Argentina/Buenos_Aires')),
                800,
                case when coalesce((hc ->> 'show_schedule')::boolean, true) then 'active' else 'hidden' end,
                jsonb_build_object('legacy_source', 'restaurants.schedule'));
      end if;

      -- ── Analítica histórica (una sola vez) ────────────────────────────────
      if p_import_analytics
         and not exists (select 1 from profile_events e
                         where e.profile_id = v_profile.id and e.source = 'legacy_import') then
        insert into profile_events (profile_id, module_id, event_type, visitor_hash, referrer_host, source, created_at)
        select v_profile.id,
               (select m.id from profile_modules m
                 where m.profile_id = v_profile.id and m.config ->> 'legacy_source' = 'hub_links'
                   and m.config ->> 'legacy_id' = a.j ->> 'link_id' limit 1),
               case a.j ->> 'event_type'
                 when 'profile_view' then 'view'
                 when 'cta_click'    then 'primary_action_click'
                 else 'module_click'
               end,
               left(encode(sha256(convert_to(
                 coalesce(a.j ->> 'user_agent', '') || '|' || v_profile.id::text || '|'
                 || coalesce(left(a.j ->> 'created_at', 10), '') || '|' || coalesce(v_salt, ''), 'UTF8')), 'hex'), 32),
               left(lower(substring(coalesce(a.j ->> 'referrer', '') from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/:?#]+)')), 120),
               'legacy_import',
               coalesce((a.j ->> 'created_at')::timestamptz, now())
        from (select to_jsonb(x) as j from hub_analytics x where x.restaurant_id = r.id) a
        where a.j ->> 'event_type' in ('profile_view','link_click','cta_click','whatsapp_click','maps_click')
          and coalesce(a.j ->> 'user_agent', '') !~* '(bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse)';
      end if;

      insert into mycen_private.hub_imports (restaurant_id, profile_id)
      values (r.id, v_profile.id)
      on conflict (restaurant_id) do update set profile_id = excluded.profile_id, imported_at = now();

      restaurant_slug  := r.slug;
      profile_username := v_profile.username;
      result := case when v_new then 'creado' else 'actualizado' end || coalesce(' · ' || v_note, '');
      return next;

    exception when others then
      restaurant_slug := r.slug; profile_username := null; result := 'ERROR: ' || sqlerrm;
      return next;
    end;
  end loop;

  perform set_config('mycen.legacy_import', 'off', true);
end $$;

-- Sólo para administradores (SQL Editor / service_role), nunca desde la app
revoke all on function public.mycen_import_hub(uuid, boolean, boolean) from public, anon, authenticated;

commit;

-- Ejecutar la importación y ver el reporte:
select * from public.mycen_import_hub();
