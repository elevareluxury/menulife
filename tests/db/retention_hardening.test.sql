-- Hardening (20261121000001): la limpieza borra sólo lo vencido y la bitácora del equipo no se puede cambiar ni borrar.
\ir ../../supabase/migrations/20261121000001_retention_hardening.sql
begin;

insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'ret@x.com');

insert into public.product_events (user_id, event, created_at) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'signup_started', now() - interval '26 months'),
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'signup_started', now() - interval '24 months');
insert into public.user_activity_days (user_id, day) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', current_date - 800),
  ('aaaaaaaa-0000-0000-0000-0000000000a1', current_date - 10);
insert into public.admin_audit_log (admin_id, action, target_type, created_at) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'test_old', 'test', now() - interval '4 years'),
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'test_new', 'test', now() - interval '1 day');

do $$
declare r jsonb;
begin
  -- La bitácora no se toca a mano
  begin
    update admin_audit_log set action = 'cambiado' where action = 'test_new';
    assert false, 'no se modifica';
  exception when insufficient_privilege then null; end;
  begin
    delete from admin_audit_log where action = 'test_new';
    assert false, 'no se borra';
  exception when insufficient_privilege then null; end;
  begin
    delete from admin_audit_log where action = 'test_old';
    assert false, 'ni siquiera lo vencido fuera de la limpieza';
  exception when insufficient_privilege then null; end;

  r := mycen_purge_expired();
  assert (r ->> 'product_events')::int >= 1, 'borra eventos de más de 25 meses';
  assert exists (select 1 from product_events where created_at between now() - interval '25 months' and now() - interval '23 months'), 'deja los recientes';
  assert not exists (select 1 from user_activity_days where day = current_date - 800), 'borra actividad vieja';
  assert exists (select 1 from user_activity_days where day = current_date - 10), 'deja la reciente';
  assert not exists (select 1 from admin_audit_log where action = 'test_old'), 'borra la bitácora de más de 3 años';
  assert exists (select 1 from admin_audit_log where action = 'test_new'), 'deja la reciente';
  -- Y después de la limpieza la bitácora sigue protegida
  begin
    delete from admin_audit_log where action = 'test_new';
    assert false, 'sigue protegida';
  exception when insufficient_privilege then null; end;
end $$;

-- Nadie de la app puede correr la limpieza
do $$ begin
  assert not has_function_privilege('anon', 'public.mycen_purge_expired()', 'execute'), 'anon no';
  assert not has_function_privilege('authenticated', 'public.mycen_purge_expired()', 'execute'), 'authenticated no';
end $$;

rollback;
