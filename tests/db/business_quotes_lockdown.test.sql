-- Auditoría antes del freeze (20261120000001): sin sesión no se leen ni se cambian presupuestos ajenos (sólo el del
-- token, por get_public_quote / respond_public_quote) y una cuenta común no elige su plan al crear un negocio.
begin;

-- Lo que existe en producción y no en el entorno de pruebas (tablas de presupuestos con las políticas viejas)
create table public.service_quote_templates (id uuid primary key default gen_random_uuid(), restaurant_id uuid, color text, icon text);
create table public.service_quotes (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid, customer_id uuid, template_id uuid,
  title text, status text not null default 'draft', expires_at timestamptz, viewed_at timestamptz,
  accepted_at timestamptz, rejected_at timestamptz, accepted_ip text, accepted_user_agent text, sales_owner_id uuid,
  notes text, metadata jsonb not null default '{}', currency text default 'ARS', total_amount numeric default 0,
  token text not null default gen_random_uuid()::text);
create table public.service_quote_items (id uuid primary key default gen_random_uuid(), quote_id uuid, name text, sort_order int default 0);
create table public.service_quote_events (id uuid primary key default gen_random_uuid(), quote_id uuid, event_type text, description text, metadata jsonb default '{}');
alter table public.service_quotes enable row level security;
alter table public.service_quote_items enable row level security;
alter table public.service_quote_templates enable row level security;
alter table public.service_quote_events enable row level security;
grant all on public.service_quotes, public.service_quote_items, public.service_quote_templates, public.service_quote_events to anon, authenticated;
create policy "anon_read_by_token" on public.service_quotes for select to anon using (token is not null);
create policy "anon_update_by_token" on public.service_quotes for update to anon
  using (token is not null and status in ('sent', 'viewed')) with check (token is not null);
create policy "anon_read_items" on public.service_quote_items for select to anon using (true);
create policy "anon_read_template" on public.service_quote_templates for select to anon using (true);
create policy "anon_insert_events" on public.service_quote_events for insert to anon with check (true);

\ir ../../supabase/migrations/20261120000001_business_quotes_lockdown.sql
begin;

insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000001', 'duena@x.com');
insert into public.restaurants (id, owner_id, slug, name, plan)
values ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'estudio', 'Estudio', 'single');
insert into public.service_quote_templates (id, restaurant_id, color) values ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', '#112233');
insert into public.service_quotes (id, restaurant_id, template_id, title, status, token, accepted_ip, notes, expires_at) values
  ('11111111-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'Web', 'sent',
   '0f1e2d3c-4b5a-4968-8776-655443322110', '1.2.3.4', 'Incluye hosting', now() + interval '10 days'),
  ('11111111-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001', null, 'Borrador', 'draft',
   '0f1e2d3c-4b5a-4968-8776-655443322111', null, null, null),
  ('11111111-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000001', null, 'Viejo', 'sent',
   '0f1e2d3c-4b5a-4968-8776-655443322112', null, null, now() - interval '1 day');
insert into public.service_quote_items (quote_id, name, sort_order) values
  ('11111111-0000-0000-0000-000000000001', 'Diseño', 2), ('11111111-0000-0000-0000-000000000001', 'Brief', 1);

set local role anon;
do $$
declare q jsonb;
begin
  -- Sin las políticas viejas no se lista nada
  assert not exists (select 1 from service_quotes), 'anon no lista presupuestos';
  assert not exists (select 1 from service_quote_items), 'ni ítems';
  assert not exists (select 1 from service_quote_templates), 'ni plantillas';
  begin
    insert into service_quote_events (quote_id, event_type) values ('11111111-0000-0000-0000-000000000001', 'x');
    assert false, 'anon no escribe eventos';
  exception when insufficient_privilege then null; end;

  -- El del token, sí: sin datos internos, con ítems en orden, color y negocio; queda "visto"
  q := get_public_quote('0f1e2d3c-4b5a-4968-8776-655443322110');
  assert q ->> 'title' = 'Web', 'el del token';
  assert q ->> 'status' = 'viewed', 'marca visto';
  assert q ->> 'notes' = 'Incluye hosting', 'condiciones visibles';
  assert not q ? 'accepted_ip' and not q ? 'metadata' and not q ? 'customer_id', 'sin datos internos';
  assert q -> 'items' -> 0 ->> 'name' = 'Brief', 'ítems en orden';
  assert q -> 'template' ->> 'color' = '#112233', 'color de la plantilla';
  assert q -> 'restaurant' ->> 'name' = 'Estudio', 'nombre del negocio';

  assert get_public_quote('0f1e2d3c-4b5a-4968-8776-655443322111') is null, 'un borrador no se ve';
  assert get_public_quote('cualquier-cosa') is null, 'token inválido';
  assert get_public_quote('0f1e2d3c-4b5a-4968-8776-655443322112') ->> 'status' = 'expired', 'vencido';

  -- Responder: sólo el del token y una sola vez
  assert respond_public_quote('0f1e2d3c-4b5a-4968-8776-655443322112', true) = 'expired', 'vencido no se acepta';
  assert respond_public_quote('0f1e2d3c-4b5a-4968-8776-655443322111', true) = 'not_found', 'borrador no';
  assert respond_public_quote('0f1e2d3c-4b5a-4968-8776-655443322110', true) = 'accepted', 'acepta';
  assert respond_public_quote('0f1e2d3c-4b5a-4968-8776-655443322110', false) = 'accepted', 'no se cambia después';
end $$;
reset role;

do $$ begin
  assert (select status from service_quotes where id = '11111111-0000-0000-0000-000000000001') = 'accepted', 'quedó aceptado';
  assert (select count(*) from service_quote_events where quote_id = '11111111-0000-0000-0000-000000000001') = 2, 'visto + aceptado';
  assert (select status from service_quotes where id = '11111111-0000-0000-0000-000000000002') = 'draft', 'el borrador intacto';
end $$;

-- Crear un negocio: una cuenta común no elige el plan (toma el de la tabla); el servidor sí
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
insert into public.restaurants (id, owner_id, slug, name, plan, subscription_status, trial_ends_at)
values ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'tienda', 'Tienda', 'enterprise', 'active', '2099-01-01');
select set_config('request.jwt.claim.sub', '', true);
insert into public.restaurants (id, owner_id, slug, name, plan)
values ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'otro', 'Otro', 'pro');
do $$ begin
  assert (select plan from restaurants where id = 'dddddddd-0000-0000-0000-000000000002') is null, 'plan por defecto (sin default = vacío)';
  assert (select subscription_status from restaurants where id = 'dddddddd-0000-0000-0000-000000000002') = 'trial', 'suscripción por defecto';
  assert (select trial_ends_at from restaurants where id = 'dddddddd-0000-0000-0000-000000000002') is null, 'sin fin de prueba elegido';
  assert (select plan from restaurants where id = 'dddddddd-0000-0000-0000-000000000003') = 'pro', 'el servidor elige';
end $$;

rollback;
