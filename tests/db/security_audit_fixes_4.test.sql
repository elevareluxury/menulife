-- Auditoría de seguridad, puntos "a validar" N2 y N4 (20261202000001).
begin;

-- Como en producción: restaurants con organization_id y la política de organizaciones por ese campo
alter table public.restaurants add column if not exists organization_id uuid;
create table public.organizations (id uuid primary key default gen_random_uuid(), name text);
alter table public.organizations enable row level security;
create policy organizations_owner_manage on public.organizations for all
  using (id in (select organization_id from public.restaurants where owner_id = (select auth.uid()) and organization_id is not null));
grant select, insert, update, delete on public.organizations to authenticated;

\ir ../../supabase/migrations/20261202000001_security_audit_fixes_4.sql

insert into auth.users (id, email) values
  ('aaaaaaaa-4000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-4000-0000-0000-000000000002', 'beto@x');
insert into public.organizations (id, name) values ('99999999-4000-0000-0000-000000000009', 'Cadena de Beto');
insert into public.restaurants (id, owner_id, slug, name, organization_id) values
  ('55555555-4000-0000-0000-000000000001', 'aaaaaaaa-4000-0000-0000-000000000001', 'cafe-ana-sec4', 'Café', null),
  ('55555555-4000-0000-0000-000000000002', 'bbbbbbbb-4000-0000-0000-000000000002', 'bar-beto-sec4', 'Bar',
   '99999999-4000-0000-0000-000000000009');

-- ── N2. Nadie inserta solicitudes de acceso ───────────────────────────────────
do $$ begin
  assert not has_table_privilege('anon', 'public.access_requests', 'insert'), 'anon no inserta';
  assert not has_table_privilege('authenticated', 'public.access_requests', 'insert'), 'una cuenta tampoco';
end $$;
set local role anon;
do $$ begin
  insert into access_requests (name, email, business_name) values ('X', 'x@x', repeat('x', 100000));
  assert false, 'el formulario viejo ya no inserta';
exception when insufficient_privilege then null;
end $$;
reset role;

-- ── N4. La dueña de un negocio no se cuelga de la organización de otro ────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-4000-0000-0000-000000000001', true);
do $$ begin
  update restaurants set organization_id = '99999999-4000-0000-0000-000000000009'
  where id = '55555555-4000-0000-0000-000000000001';
  assert false, 'no se cambia organization_id desde la app';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  assert (select count(*) from organizations) = 0, 'no ve la organización ajena';
  -- Cambiar otras cosas de su negocio sigue andando
  update restaurants set name = 'Café de Ana' where id = '55555555-4000-0000-0000-000000000001';
  assert found, 'edita su negocio';
end $$;
reset role;

-- El equipo (SQL) sí puede vincular
update restaurants set organization_id = '99999999-4000-0000-0000-000000000009' where id = '55555555-4000-0000-0000-000000000001';

rollback;
