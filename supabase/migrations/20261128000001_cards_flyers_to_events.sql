-- =============================================================================
-- Identity · el diseño "Flyers" de Tarjetas se retira: ahora es el módulo Eventos. Idempotente.
--
--   Pasa a `events` la versión de trabajo de cada módulo `cards` con `content.layout = 'tickets'`: cada tarjeta es un
--   evento (portada, título, fecha, hora, lugar = subtítulo, link de entradas, título en inglés) con un id corto. Lo ya
--   publicado no se toca (las versiones son inmutables): la página muestra esas tarjetas con el diseño de Eventos
--   (`cardsToEvents` en profile/lib/events.ts) hasta que la persona vuelva a publicar. La conversión vive en
--   `mycen_cards_flyers_to_events()` (sin EXECUTE para nadie de la app; devuelve cuántos módulos pasó) y se corre acá una vez.
-- =============================================================================

begin;

create or replace function public.mycen_cards_flyers_to_events()
returns integer language plpgsql security invoker set search_path = public, extensions, pg_temp as $$
declare n integer;
begin
update public.profile_modules m
set type = 'events',
    content = jsonb_build_object('items', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', 'flyer' || (c.ord - 1),
        'image_url', c.item ->> 'image_url',
        'title', left(c.item ->> 'title', 80),
        'date', case when c.item ->> 'date' ~ '^\d{4}-\d{2}-\d{2}$' then c.item ->> 'date' end,
        'time', case when c.item ->> 'time' ~ '^\d{2}:\d{2}$' then c.item ->> 'time' end,
        'venue', left(c.item ->> 'subtitle', 80),
        'url', c.item ->> 'url',
        'en', case when coalesce(c.item -> 'en' ->> 'title', '') <> ''
                   then jsonb_build_object('title', left(c.item -> 'en' ->> 'title', 80)) end
      )) order by c.ord)
      from jsonb_array_elements(case when jsonb_typeof(m.content -> 'items') = 'array' then m.content -> 'items' else '[]'::jsonb end)
           with ordinality as c(item, ord)
      where c.ord <= 20 and (coalesce(c.item ->> 'title', '') <> '' or coalesce(c.item ->> 'image_url', '') <> '')
    ), '[]'::jsonb)),
    updated_at = now()
where m.type = 'cards' and m.content ->> 'layout' = 'tickets';
get diagnostics n = row_count;
return n;
end $$;
revoke all on function public.mycen_cards_flyers_to_events() from public, anon, authenticated;

select public.mycen_cards_flyers_to_events();

commit;

notify pgrst, 'reload schema';
