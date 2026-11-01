-- =============================================================================
-- Auditoría antes del freeze (Business). Todo condicional e idempotente: las tablas de Business pueden no existir en
-- todos los entornos.
--
--   1. Presupuestos por link (/q/:token): las políticas de 20260612000009 dejaban a cualquiera sin sesión LEER TODOS
--      los presupuestos de todos los negocios ("token is not null" vale para todas las filas), sus ítems y plantillas,
--      ACEPTAR o rechazar cualquiera enviado y escribir eventos. Se borran esas políticas y la página pública usa dos
--      funciones que sólo trabajan con el presupuesto de ESE token:
--        get_public_quote(p_token)              → el presupuesto (sin borradores ni cancelados), sus ítems, el color de
--                                                  la plantilla y nombre/logo del negocio; marca "visto" y "vencido".
--        respond_public_quote(p_token, p_accept) → aceptar o rechazar sólo si está enviado/visto y no venció.
--   2. restaurants: al CREAR un negocio, una cuenta común no puede elegir su plan, estado de suscripción ni fin de la
--      prueba (toman los valores por defecto de la tabla). Sólo un super-admin o el servidor (sin sesión) los elige.
-- =============================================================================

begin;

-- ─── 1. Presupuestos por link ────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.service_quotes') is not null then
    drop policy if exists "anon_read_by_token" on public.service_quotes;
    drop policy if exists "anon_update_by_token" on public.service_quotes;
  end if;
  if to_regclass('public.service_quote_items') is not null then
    drop policy if exists "anon_read_items" on public.service_quote_items;
  end if;
  if to_regclass('public.service_quote_templates') is not null then
    drop policy if exists "anon_read_template" on public.service_quote_templates;
  end if;
  if to_regclass('public.service_quote_events') is not null then
    drop policy if exists "anon_insert_events" on public.service_quote_events;
  end if;
end $$;

do $outer$
begin
  if to_regclass('public.service_quotes') is null then return; end if;

  execute $f$
  create or replace function public.get_public_quote(p_token text)
  returns jsonb language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
  declare
    q   public.service_quotes;
    out jsonb;
  begin
    -- Un token es un uuid: cualquier otra cosa no busca nada
    if p_token is null or p_token !~ '^[0-9a-fA-F-]{32,36}$' then return null; end if;
    select * into q from service_quotes where token = p_token;
    if not found or q.status in ('draft', 'cancelled') then return null; end if;

    if q.status in ('sent', 'viewed') and q.expires_at is not null and q.expires_at < now() then
      update service_quotes set status = 'expired' where id = q.id returning * into q;
    elsif q.status = 'sent' then
      update service_quotes set status = 'viewed', viewed_at = now() where id = q.id returning * into q;
      insert into service_quote_events (quote_id, event_type, description)
      values (q.id, 'quote_viewed', 'Vista desde enlace público');
    end if;

    out := to_jsonb(q) - 'accepted_ip' - 'accepted_user_agent' - 'sales_owner_id' - 'customer_id' - 'metadata';
    out := out || jsonb_build_object(
      'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.sort_order) from service_quote_items i where i.quote_id = q.id), '[]'::jsonb),
      'template', (select jsonb_build_object('color', t.color, 'icon', t.icon) from service_quote_templates t where t.id = q.template_id),
      'restaurant', (select jsonb_build_object('name', r.name, 'logo_url', r.logo_url) from restaurants r where r.id = q.restaurant_id));
    return out;
  end $$;
  $f$;

  execute $f$
  create or replace function public.respond_public_quote(p_token text, p_accept boolean)
  returns text language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
  declare
    q    public.service_quotes;
    v_ua text;
  begin
    if p_token is null or p_token !~ '^[0-9a-fA-F-]{32,36}$' or p_accept is null then return 'invalid'; end if;
    select * into q from service_quotes where token = p_token for update;
    if not found or q.status in ('draft', 'cancelled') then return 'not_found'; end if;
    if q.status not in ('sent', 'viewed') then return q.status; end if;
    if q.expires_at is not null and q.expires_at < now() then
      update service_quotes set status = 'expired' where id = q.id;
      return 'expired';
    end if;
    begin
      v_ua := left(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', 300);
    exception when others then v_ua := null;
    end;
    if p_accept then
      update service_quotes set status = 'accepted', accepted_at = now(), accepted_user_agent = v_ua where id = q.id;
      insert into service_quote_events (quote_id, event_type, description)
      values (q.id, 'quote_accepted', 'Aceptado desde enlace público');
      return 'accepted';
    end if;
    update service_quotes set status = 'rejected', rejected_at = now() where id = q.id;
    insert into service_quote_events (quote_id, event_type, description)
    values (q.id, 'quote_rejected', 'Rechazado desde enlace público');
    return 'rejected';
  end $$;
  $f$;

  revoke all on function public.get_public_quote(text) from public;
  revoke all on function public.respond_public_quote(text, boolean) from public;
  grant execute on function public.get_public_quote(text) to anon, authenticated;
  grant execute on function public.respond_public_quote(text, boolean) to anon, authenticated;
end $outer$;

-- ─── 2. Plan al crear un negocio ─────────────────────────────────────────────
create or replace function public.mycen_guard_restaurant_plan()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_def text;
  v_val text;
  v_patch jsonb := '{}'::jsonb;
  c text;
begin
  -- Sin sesión = servidor (service role, SQL Editor, webhooks de pago): puede
  if (select auth.uid()) is null or public.mycen_is_admin() then return new; end if;

  if tg_op = 'INSERT' then
    -- Una cuenta común no elige: cada columna toma el valor por defecto de la tabla (o queda vacía si no tiene)
    foreach c in array array['plan', 'subscription_status', 'trial_ends_at'] loop
      select column_default into v_def from information_schema.columns
      where table_schema = 'public' and table_name = 'restaurants' and column_name = c;
      v_val := null;
      if v_def is not null then execute 'select (' || v_def || ')::text' into v_val; end if;
      v_patch := v_patch || jsonb_build_object(c, v_val);
    end loop;
    new := jsonb_populate_record(new, v_patch);
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.subscription_status is distinct from old.subscription_status
     or new.trial_ends_at is distinct from old.trial_ends_at then
    raise exception 'PLAN_LOCKED' using errcode = '42501';
  end if;
  return new;
end $$;

revoke all on function public.mycen_guard_restaurant_plan() from public, anon, authenticated;

do $$
begin
  if to_regclass('public.restaurants') is not null
     and (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'restaurants'
          and column_name in ('plan', 'subscription_status', 'trial_ends_at')) = 3 then
    drop trigger if exists restaurants_plan_guard on public.restaurants;
    create trigger restaurants_plan_guard before insert or update on public.restaurants
      for each row execute function public.mycen_guard_restaurant_plan();
  end if;
end $$;

commit;

notify pgrst, 'reload schema';
