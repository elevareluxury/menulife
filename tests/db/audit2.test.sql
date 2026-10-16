-- Auditoría de seguridad de la base V2 (docs/seguridad/auditoria-v2-db.md, migración 20261102000001_audit2_db.sql).
-- Cada bloque prueba un hallazgo: sin la migración, los asserts marcados "ANTES" fallan.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into public.profiles (id, user_id, username, display_name, status, contact_card)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'draft',
        '{"enabled": true, "phone": "+5491100000000"}'),
       ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'beto', 'Beto', 'draft',
        '{"enabled": false}');

-- Ana publica dos versiones, con formulario de contacto y colaboraciones (uno vencido, otro vigente)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
insert into public.profile_modules (id, profile_id, type, title, content, config, position) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'contact_form', 'Escribime', '{}',
   jsonb_build_object('show_until', to_char(now() - interval '1 day', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')), 10),
  ('a0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'collab', 'Colaboraciones', '{}',
   jsonb_build_object('show_from', to_char(now() + interval '7 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')), 20);
do $$ begin
  perform publish_space('11111111-0000-0000-0000-000000000001');
  update profiles set display_name = 'Ana Estudio' where id = '11111111-0000-0000-0000-000000000001';
  perform publish_space('11111111-0000-0000-0000-000000000001');
end $$;
reset role;

-- ── 1. published_version_id: sólo una versión del mismo Space ────────────────
-- (el id de una versión ajena no es público, pero alcanza con conocerlo)
do $$ declare v_ana uuid; begin
  select id into v_ana from profile_versions where profile_id = '11111111-0000-0000-0000-000000000001' and version_number = 1;
  perform set_config('audit2.ana_version', v_ana::text, true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  begin
    update profiles set published_version_id = current_setting('audit2.ana_version')::uuid, status = 'published'
    where id = '22222222-0000-0000-0000-000000000002';
    assert false, 'ANTES: Beto podía mostrar la versión de Ana (y su tarjeta de contacto) en /beto';
  exception when insufficient_privilege then null; end;
  assert get_profile_contact_card('22222222-0000-0000-0000-000000000002') is null, 'la tarjeta de Ana no sale por Beto';
end $$;
-- Publicar y restaurar lo propio sigue andando
do $$ declare r jsonb; begin
  r := publish_space('22222222-0000-0000-0000-000000000002');
  assert (r ->> 'version_number')::int = 1, 'Beto publica lo suyo';
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  perform restore_space_version(current_setting('audit2.ana_version')::uuid);
  assert get_public_profile('ana') ->> 'display_name' = 'Ana', 'Ana restaura su versión 1';
  update profiles set published_version_id = current_setting('audit2.ana_version')::uuid
  where id = '11111111-0000-0000-0000-000000000001';
end $$;
reset role;

-- ── 2. identities.primary_space_id: sólo un Space propio ─────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  begin
    update identities set primary_space_id = '11111111-0000-0000-0000-000000000001'
    where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
    assert false, 'ANTES: Beto podía poner el perfil de Ana como su principal (lo veía el admin al verificar)';
  exception when insufficient_privilege then null; end;
  update identities set primary_space_id = '22222222-0000-0000-0000-000000000002'
  where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
  assert (select primary_space_id from identities) = '22222222-0000-0000-0000-000000000002', 'el propio sí';
end $$;
reset role;
-- Un Space nuevo sigue creando su identidad y quedando como principal
insert into auth.users values ('cccccccc-0000-0000-0000-000000000003', 'caro@x');
insert into public.profiles (id, user_id, username, display_name)
values ('33333333-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003', 'caro', 'Caro');
do $$ begin
  assert (select primary_space_id from identities where user_id = 'cccccccc-0000-0000-0000-000000000003')
         = '33333333-0000-0000-0000-000000000003', 'el principal se completa solo';
end $$;

-- ── 3. Registro de un hábito: sólo de un hábito propio ──────────────────────
insert into life_habits (id, user_id, name) values
  ('44444444-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Leer'),
  ('44444444-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'Correr');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  begin
    insert into life_habit_logs (habit_id, user_id, completed_date)
    values ('44444444-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', current_date);
    assert false, 'ANTES: Beto ocupaba el día del hábito de Ana y ella ya no lo podía marcar';
  exception when insufficient_privilege then null; end;
  insert into life_habit_logs (habit_id, user_id, completed_date)
  values ('44444444-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', current_date);
  begin
    update life_habit_logs set habit_id = '44444444-0000-0000-0000-000000000001';
    assert false, 'tampoco cambiándolo después';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
insert into life_habit_logs (habit_id, user_id, completed_date)
values ('44444444-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', current_date);
reset role;

-- ── 4. Movimientos generados: fijo o cuotas propios ─────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
insert into life_recurring_transactions (id, user_id, type, amount, currency, day_of_month, starts_on)
values ('55555555-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 100, 'ARS',
        extract(day from current_date)::int, current_date);
insert into life_installment_plans (id, user_id, currency, total_amount, installments, first_date)
values ('66666666-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ARS', 1200, 12, current_date);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
do $$ begin
  begin
    insert into life_transactions (user_id, amount, recurring_id, recurring_period)
    values ('bbbbbbbb-0000-0000-0000-000000000002', 1, '55555555-0000-0000-0000-000000000001', to_char(current_date, 'YYYY-MM'));
    assert false, 'ANTES: Beto ocupaba el mes del fijo de Ana y no se le cargaba';
  exception when insufficient_privilege then null; end;
  begin
    insert into life_transactions (user_id, amount, installment_plan_id, installment_no)
    values ('bbbbbbbb-0000-0000-0000-000000000002', 1, '66666666-0000-0000-0000-000000000001', 1);
    assert false, 'ANTES: Beto ocupaba la cuota 1 de Ana y no se le cargaba nunca';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert life_materialize_recurring(current_date) = 1, 'a Ana se le carga el fijo del mes';
  assert life_materialize_installments(current_date) = 1, 'y la primera cuota';
end $$;
reset role;

-- ── 5. Analítica: nada de Spaces privados o suspendidos ─────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{"user-agent": "Mozilla/5.0 (iPhone)", "x-forwarded-for": "203.0.113.7"}', true);
do $$ begin perform track_profile_event('11111111-0000-0000-0000-000000000001', 'view'); end $$;
reset role;
do $$ begin
  assert (select count(*) from profile_events) = 1, 'Ana publicada y pública cuenta';
  update profiles set visibility = 'private' where id = '11111111-0000-0000-0000-000000000001';
end $$;
set local role anon;
do $$ begin
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'module_click', null, null, null, 'x');
end $$;
reset role;
do $$ begin
  assert (select count(*) from profile_events) = 1, 'ANTES: un Space privado seguía sumando visitas y toques';
  update profiles set visibility = 'public' where id = '11111111-0000-0000-0000-000000000001';
  perform set_config('mycen.moderating', 'on', true);
  update profiles set suspended_at = now() where id = '11111111-0000-0000-0000-000000000001';
  perform set_config('mycen.moderating', '', true);
end $$;
set local role anon;
do $$ begin
  perform track_profile_event('11111111-0000-0000-0000-000000000001', 'share');
end $$;
reset role;
do $$ begin
  assert (select count(*) from profile_events) = 1, 'ANTES: un Space suspendido seguía sumando eventos';
  perform set_config('mycen.moderating', 'on', true);
  update profiles set suspended_at = null where id = '11111111-0000-0000-0000-000000000001';
  perform set_config('mycen.moderating', '', true);
end $$;

-- ── 6. Formularios fuera de horario: no reciben nada ────────────────────────
set local role anon;
do $$ begin
  assert submit_profile_message('ana', 'Sofía', 'sofi@x.com', 'Hola', null, 5000) = 'not_found',
    'ANTES: el formulario vencido seguía recibiendo mensajes por la API';
  assert submit_profile_collab('ana', 'Sofía', 'sofi@x.com', 'Café Luna', null, 'post', null, null, 'Hola', null, 5000) = 'not_found',
    'ANTES: colaboraciones programado para la semana que viene ya recibía propuestas';
end $$;
reset role;
-- Con el horario vigente, andan
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  update profile_modules set config = '{}' where profile_id = '11111111-0000-0000-0000-000000000001';
  perform publish_space('11111111-0000-0000-0000-000000000001');
end $$;
reset role;
set local role anon;
do $$ begin
  assert submit_profile_message('ana', 'Sofía', 'sofi@x.com', 'Hola', null, 5000) = 'ok', 'en horario: ok';
  assert submit_profile_collab('ana', 'Sofía', 'sofi@x.com', 'Café Luna', null, 'post', null, null, 'Hola', null, 5000) = 'ok', 'en horario: ok';
end $$;
reset role;
do $$ begin
  assert (select count(*) from profile_messages where profile_id = '11111111-0000-0000-0000-000000000001') = 2, 'se guardaron los dos';
end $$;

-- ── 7. "Borrar Life OS" no puede borrar el link de calendario por la tabla ──
-- (por eso la app llama a life_calendar_disable(); sin eso el link seguía andando)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ declare tok text := life_calendar_token(); begin
  begin
    delete from life_calendar_feeds where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
    assert false, 'la tabla no se toca desde la app';
  exception when insufficient_privilege then null; end;
  perform life_calendar_disable();
  assert not exists (select 1 from life_calendar_feed(tok)), 'apagado con la RPC';
end $$;
reset role;

-- ── 8. Superficie general ───────────────────────────────────────────────────
do $$ declare r record; begin
  -- Toda tabla de public tiene RLS (menos las simuladas de Business/Life que en producción ya la tienen)
  for r in select c.relname from pg_class c
           where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity
             and c.relname not in ('restaurants', 'life_goals') loop
    assert false, 'tabla sin RLS: ' || r.relname;
  end loop;
  -- Toda función security definer fija search_path
  for r in select p.oid::regprocedure as f from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.prosecdef
             and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') loop
    assert false, 'security definer sin search_path: ' || r.f;
  end loop;
  -- El visitante anónimo sólo ejecuta las RPC públicas (más funciones puras y de triggers, que no leen datos)
  for r in select p.proname from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.prosecdef and p.prorettype <> 'trigger'::regtype
             and has_function_privilege('anon', p.oid, 'execute')
             and p.proname not in ('get_public_profile', 'get_public_project', 'get_profile_contact_card', 'track_profile_event',
                                   'check_username', 'report_profile', 'public_sitemap', 'report_client_error',
                                   'submit_profile_message', 'submit_profile_collab', 'track_product_event',
                                   'subscribe_profile', 'life_calendar_feed') loop
    assert false, 'anon puede ejecutar: ' || r.proname;
  end loop;
end $$;

-- El visitante anónimo no lee ninguna fila de las tablas privadas (permiso revocado o RLS sin política para anon)
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ declare t text; n bigint; begin
  foreach t in array array['life_recurring_transactions', 'life_calendar_feeds', 'life_categories', 'life_installment_plans',
                           'life_splits', 'life_budgets', 'life_weekly_reviews', 'life_journal_entries', 'life_daily_reviews',
                           'life_habit_logs', 'life_transactions', 'identities', 'profiles', 'profile_modules',
                           'profile_subscribers', 'profile_messages', 'profile_events', 'profile_versions'] loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      assert n = 0, 'anon lee filas de ' || t;
    exception when insufficient_privilege then null; end;
  end loop;
end $$;
reset role;

rollback;
