-- El diseño "Flyers" de Tarjetas pasa al módulo Eventos (versión de trabajo); las demás tarjetas no se tocan.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'prod@x');
insert into public.profiles (id, user_id, username, display_name, status)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'productora', 'Productora', 'draft');

insert into public.profile_modules (id, profile_id, type, title, content, config, position) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'cards', 'Próximas fechas',
   '{"layout": "tickets", "items": [
      {"image_url": "https://cdn.example.com/f1.webp", "title": "Noche Universo", "subtitle": "Niceto Club", "date": "2099-11-14", "time": "23:30", "url": "https://tickets.example.com/u", "en": {"title": "Universe Night"}},
      {"title": "Fiesta", "date": "mañana"},
      {"subtitle": "sin título ni foto"}
   ]}', '{}', 10),
  ('a0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'cards', 'Trabajos',
   '{"layout": "carousel", "items": [{"title": "Logo"}]}', '{}', 20);

do $$ begin
  if public.mycen_cards_flyers_to_events() <> 1 then raise exception 'esperaba convertir 1 módulo'; end if;
end $$;

do $$
declare m record; k record;
begin
  select * into m from profile_modules where id = 'a0000000-0000-0000-0000-000000000001';
  if m.type <> 'events' then raise exception 'el módulo de flyers no pasó a eventos: %', m.type; end if;
  if jsonb_array_length(m.content -> 'items') <> 2 then raise exception 'esperaba 2 eventos: %', m.content; end if;
  if m.content -> 'items' -> 0 <> '{"id": "flyer0", "image_url": "https://cdn.example.com/f1.webp", "title": "Noche Universo", "date": "2099-11-14", "time": "23:30", "venue": "Niceto Club", "url": "https://tickets.example.com/u", "en": {"title": "Universe Night"}}'::jsonb then
    raise exception 'evento mal convertido: %', m.content -> 'items' -> 0;
  end if;
  -- Una fecha inválida se descarta (el evento queda sin fecha)
  if (m.content -> 'items' -> 1) ? 'date' then raise exception 'la fecha inválida debía descartarse'; end if;
  select * into k from profile_modules where id = 'a0000000-0000-0000-0000-000000000002';
  if k.type <> 'cards' or k.content ->> 'layout' <> 'carousel' then raise exception 'se tocó una tarjeta común'; end if;
end $$;

-- Idempotente: correrla de nuevo no cambia nada
do $$ begin
  if public.mycen_cards_flyers_to_events() <> 0 then raise exception 'la segunda corrida convirtió algo'; end if;
  if (select count(*) from profile_modules where type = 'events') <> 1 then raise exception 'la segunda corrida duplicó algo'; end if;
end $$;

rollback;
