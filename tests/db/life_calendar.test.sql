-- Life OS (V1.1): link privado de calendario con las tareas pendientes.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into life_brain_items (user_id, type, title, content, due_date, due_time, remind_minutes, recurrence) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Dentista', 'nota privada', current_date + 3, '10:30', 15, null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Gimnasio', null, current_date, null, null, '{"freq":"weekly","weekdays":[1,3]}'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Sin fecha', null, null, null, null, null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'idea', 'Una idea', null, null, null, null, null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Muy vieja', null, current_date - 60, null, null, null),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'task', 'De Beto', null, current_date, null, null, null);
insert into life_brain_items (user_id, type, title, due_date, is_completed) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'task', 'Hecha', current_date, true);

-- Nadie lee la tabla de links
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  begin
    perform 1 from life_calendar_feeds;
    raise exception 'no debería poder leer la tabla';
  exception when insufficient_privilege then null;
  end;
end $$;

create temp table t (token text) on commit drop;
grant all on t to authenticated, anon;
insert into t select life_calendar_token();

do $$
declare tok text := (select token from t);
begin
  assert tok ~ '^[a-f0-9]{64}$', 'token de 64';
  assert life_calendar_token() = tok, 'pedirlo de nuevo devuelve el mismo';
end $$;

-- Sin sesión, con el link: sólo las pendientes con fecha de Ana, sin notas
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare tok text := (select token from t);
begin
  assert (select array_agg(title order by title) from life_calendar_feed(tok)) = array['Dentista', 'Gimnasio'], 'sólo pendientes con fecha';
  assert (select recurrence ->> 'freq' from life_calendar_feed(tok) where title = 'Gimnasio') = 'weekly', 'con repetición';
  assert not exists (select 1 from life_calendar_feed('0000000000000000000000000000000000000000000000000000000000000000')), 'link inventado: nada';
  assert not exists (select 1 from life_calendar_feed('x'' or 1=1 --')), 'basura: nada';
  begin
    perform life_calendar_token();
    raise exception 'anon no crea links';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Cambiar el link: el viejo deja de andar
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$
declare old text := (select token from t); fresh text;
begin
  fresh := life_calendar_token(true);
  assert fresh <> old, 'link nuevo';
  assert not exists (select 1 from life_calendar_feed(old)), 'el viejo no anda';
  assert exists (select 1 from life_calendar_feed(fresh)), 'el nuevo sí';
  perform life_calendar_disable();
  assert not exists (select 1 from life_calendar_feed(fresh)), 'apagado';
end $$;

rollback;
