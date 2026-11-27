-- Personas busca con índices (20261208000001).
\ir ../../supabase/migrations/20261208000001_admin_search_index.sql
begin;

insert into auth.users (id, email, created_at) values
  ('aaaaaaaa-9000-0000-0000-000000000001', 'admin@x', now() - interval '3 days'),
  ('bbbbbbbb-9000-0000-0000-000000000002', 'Beto.Gomez@Correo.com', now() - interval '2 days'),
  ('cccccccc-9000-0000-0000-000000000003', 'caro@x', now() - interval '1 day');
insert into public.super_admins (user_id) values ('aaaaaaaa-9000-0000-0000-000000000001');
insert into profiles (id, user_id, username, display_name, status, is_primary) values
  ('22222222-9000-0000-0000-000000000002', 'bbbbbbbb-9000-0000-0000-000000000002', 'beto-sch', 'Beto Gómez', 'draft', true),
  ('33333333-9000-0000-0000-000000000003', 'cccccccc-9000-0000-0000-000000000003', 'caro-sch', 'Carolina Pérez', 'draft', true);
insert into profiles (id, user_id, space_slug, display_name, status, is_primary) values
  ('44444444-9000-0000-0000-000000000004', 'cccccccc-9000-0000-0000-000000000003', 'estudio-sch', 'Estudio', 'draft', false);

do $$ begin
  assert (select email_lc from mycen_private.account_emails where user_id = 'bbbbbbbb-9000-0000-0000-000000000002')
    = 'beto.gomez@correo.com', 'la copia del email, en minúsculas';
  assert exists (select 1 from pg_indexes where indexname = 'account_emails_trgm'), 'índice del email';
  assert exists (select 1 from pg_indexes where indexname = 'profiles_display_name_trgm'), 'índice del nombre';
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-9000-0000-0000-000000000001', true);
do $$
declare r jsonb;
begin
  assert jsonb_array_length(admin_search_accounts('GOMEZ@corr')) = 1, 'parte del email, sin importar mayúsculas';
  assert jsonb_array_length(admin_search_accounts('beto-s')) = 1, 'por usuario';
  assert jsonb_array_length(admin_search_accounts('pérez')) = 1, 'por nombre con tilde';
  assert jsonb_array_length(admin_search_accounts('estudio-sch')) = 1, 'por la dirección de un Space';
  assert jsonb_array_length(admin_search_accounts('bbbbbbbb-9000-0000-0000-000000000002')) = 1, 'por id';
  assert jsonb_array_length(admin_search_accounts('%')) = 0, '% es texto';
  assert jsonb_array_length(admin_search_accounts('_')) = 0, '_ también (y menos de 2 letras no busca)';
  -- Varias coincidencias: las más nuevas primero, con la forma de siempre
  r := admin_search_accounts('-sch');
  assert jsonb_array_length(r) = 2, format('dos cuentas (%s)', r);
  assert r -> 0 ->> 'username' = 'caro-sch', 'la más nueva primero';
  assert (r -> 0 ->> 'spaces')::int = 2 and r -> 0 ? 'has_business' and r -> 0 ? 'verified', 'misma forma';
  -- Una cuenta con un Space que coincide no aparece dos veces
  assert jsonb_array_length(admin_search_accounts('caro')) = 1, 'sin repetidos';
end $$;

-- Sin ser del equipo, nada; y la copia del email no es de la app
select set_config('request.jwt.claim.sub', 'bbbbbbbb-9000-0000-0000-000000000002', true);
do $$ begin
  begin perform admin_search_accounts('beto'); assert false, 'no es del equipo';
  exception when insufficient_privilege then null; end;
  begin perform 1 from mycen_private.account_emails; assert false, 'nadie de la app lee la copia';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- La copia sigue al email y se va con la cuenta
update auth.users set email = 'beto@nuevo.com' where id = 'bbbbbbbb-9000-0000-0000-000000000002';
do $$ begin
  assert (select email_lc from mycen_private.account_emails where user_id = 'bbbbbbbb-9000-0000-0000-000000000002')
    = 'beto@nuevo.com', 'cambia con el email';
end $$;
delete from profiles where user_id = 'cccccccc-9000-0000-0000-000000000003';
do $$ begin
  perform set_config('mycen.deleting_account', 'on', true);
  delete from auth.users where id = 'cccccccc-9000-0000-0000-000000000003';
  perform set_config('mycen.deleting_account', '', true);
  assert not exists (select 1 from mycen_private.account_emails where user_id = 'cccccccc-9000-0000-0000-000000000003'),
    'se borra con la cuenta';
end $$;

rollback;
