-- Topes por cuenta vueltos a aplicar con la lista al día y verify_staff_pin cerrado (20261210000001).
begin;

-- Un login de mozo viejo como el de producción (con EXECUTE para todos) antes de la migración
create or replace function public.verify_staff_pin(p_table text, p_id uuid, p_pin text)
returns boolean language sql security definer set search_path = public as $$ select false $$;
grant execute on function public.verify_staff_pin(text, uuid, text) to anon, authenticated;

\ir ../../supabase/migrations/20261210000001_reapply_account_limits.sql

do $$
begin
  assert mycen_account_rate_limit_for('admin_refresh_snapshot') = 60, 'sigue el tope de "Actualizar ahora" (20261207)';
  assert mycen_account_rate_limit_for('publish_space') = 60, 'publicar: 60 por hora';
  assert mycen_account_rate_limit_for('get_public_profile') is null, 'lo público no tiene tope por cuenta';
  assert mycen_account_write_limit() = 6000, 'tope general de escrituras';
  assert to_regprocedure('public.mycen_account_hit(text, uuid, integer)') is not null, 'existe mycen_account_hit';
  assert not has_function_privilege('authenticated', 'public.verify_staff_pin(text, uuid, text)', 'execute'),
    'una cuenta con sesión no ejecuta el login del mozo';
  assert not has_function_privilege('anon', 'public.verify_staff_pin(text, uuid, text)', 'execute'),
    'un anónimo tampoco';
  assert not has_function_privilege('authenticated', 'public.mycen_account_hit(text, uuid, integer)', 'execute'),
    'nadie de la app suma pedidos a mano';
end $$;

insert into auth.users (id, email) values ('cccccccc-6100-0000-0000-000000000003', 'caro@x');
set local role authenticated;
select set_config('request.jwt.claims', '{"aal":"aal1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-6100-0000-0000-000000000003', true);
select set_config('request.path', '/rpc/admin_refresh_snapshot', true);
select set_config('request.method', 'POST', true);
do $$
declare i integer;
begin
  for i in 1..60 loop perform mycen_pre_request(); end loop;
  begin
    perform mycen_pre_request();
    assert false, 'el pedido 61 de "Actualizar ahora" en la hora se frena';
  exception when others then
    assert sqlerrm = 'RATE_LIMITED' and sqlstate = 'PT429', format('responde 429 (%s %s)', sqlstate, sqlerrm);
  end;
end $$;

rollback;
