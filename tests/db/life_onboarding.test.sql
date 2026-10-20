-- Onboarding de Life OS (20261112000001): la marca en user_settings y los eventos nuevos.

-- Idempotente: aplicarla otra vez no rompe nada
\ir ../../supabase/migrations/20261112000001_life_onboarding.sql

begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@x');
insert into public.user_settings (user_id) values ('bbbbbbbb-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ declare n int; begin
  -- La marca: null hasta terminar o saltear; cada uno ve y cambia sólo la suya
  insert into user_settings (user_id, language, currency) values ('aaaaaaaa-0000-0000-0000-000000000001', 'en', 'USD');
  assert (select life_onboarding_at from user_settings where user_id = auth.uid()) is null, 'arranca sin marca';
  update user_settings set life_onboarding_at = now() where user_id = auth.uid();
  assert (select life_onboarding_at from user_settings where user_id = auth.uid()) is not null, 'queda la marca';
  assert (select language from user_settings where user_id = auth.uid()) = 'en', 'no toca el idioma';
  update user_settings set life_onboarding_at = now() where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'no cambia la marca de otra cuenta';

  -- Los eventos nuevos (con la opción elegida o el paso), y los de antes siguen andando
  assert track_product_event('life_onboarding_started') = 'ok', 'empezó';
  assert track_product_event('life_onboarding_completed', '{"tipo": "health", "count": 3}') = 'ok', 'terminó';
  assert track_product_event('life_onboarding_skipped', '{"step": 2}') = 'ok', 'salteó';
  assert track_product_event('habit_logged') = 'ok', 'los eventos de antes siguen';
  assert track_product_event('life_onboarding_completed', '{"meta": "Correr"}') = 'invalid', 'sin contenido';
  assert track_product_event('life_onboarding_otro') = 'invalid', 'evento desconocido';
end $$;
reset role;

-- Sin sesión, nada del onboarding
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert track_product_event('life_onboarding_started') = 'invalid', 'sin sesión no';
end $$;
reset role;

do $$ begin
  assert (select count(*) from product_events where event like 'life_onboarding_%') = 3, 'tres eventos guardados';
  assert (select props ->> 'tipo' from product_events where event = 'life_onboarding_completed') = 'health', 'con la opción';
  begin
    insert into product_events (event) values ('life_onboarding_otro');
    assert false, 'la tabla sólo acepta eventos registrados';
  exception when foreign_key_violation then null; end;
end $$;

rollback;
