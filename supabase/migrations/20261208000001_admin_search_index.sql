-- =============================================================================
-- Panel del equipo con millones de cuentas (docs/lanzamiento/panel-escala.md, PR 2): Personas busca con índices.
--
--   · "Contiene…" (like '%texto%') no usa un índice común: con millones de cuentas la búsqueda recorría todas y, por
--     cada una, sus Spaces. Ahora usa índices de trigramas (pg_trgm) en usuario, nombre y dirección de los Spaces.
--   · auth.users es de Supabase y no admite índices propios: una copia interna del email en minúsculas
--     (mycen_private.account_emails, fuera de la API, nadie de la app la lee) con su índice; la mantiene un trigger en
--     auth.users y se borra con la cuenta (on delete cascade). Es el mismo dato, del mismo responsable, para lo mismo.
--   · admin_search_accounts junta candidatos de cada índice (hasta 500 por fuente) y devuelve los más nuevos, con la
--     misma forma de siempre. Los comodines que escribe la persona siguen siendo texto.
-- Idempotente. Se aplica en Supabase → SQL Editor. Tests: tests/db/admin_search_index.test.sql.
-- =============================================================================

-- pg_trgm: en Supabase ya está (en public o en extensions); si no, en extensions
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_trgm') then
    create schema if not exists extensions;
    create extension pg_trgm with schema extensions;
  end if;
end $$;

-- Índices de trigramas (con el esquema donde esté pg_trgm)
do $$
declare v_schema text;
begin
  select n.nspname into v_schema from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_trgm';
  execute format('create index if not exists profiles_username_trgm on public.profiles using gin (lower(username) %I.gin_trgm_ops)', v_schema);
  execute format('create index if not exists profiles_display_name_trgm on public.profiles using gin (lower(display_name) %I.gin_trgm_ops)', v_schema);
  execute format('create index if not exists profiles_space_slug_trgm on public.profiles using gin (lower(space_slug) %I.gin_trgm_ops)', v_schema);
end $$;

-- ─── Email en minúsculas, con índice (fuera de la API) ───────────────────────
create schema if not exists mycen_private;
create table if not exists mycen_private.account_emails (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  email_lc text not null
);
revoke all on mycen_private.account_emails from public, anon, authenticated;
do $$
declare v_schema text;
begin
  select n.nspname into v_schema from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_trgm';
  execute format('create index if not exists account_emails_trgm on mycen_private.account_emails using gin (email_lc %I.gin_trgm_ops)', v_schema);
end $$;

create or replace function mycen_private.sync_account_email()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if new.email is null then
    delete from mycen_private.account_emails where user_id = new.id;
  else
    insert into mycen_private.account_emails (user_id, email_lc) values (new.id, lower(new.email))
    on conflict (user_id) do update set email_lc = excluded.email_lc;
  end if;
  return null;
end $$;
revoke all on function mycen_private.sync_account_email() from public, anon, authenticated;

drop trigger if exists mycen_sync_account_email on auth.users;
create trigger mycen_sync_account_email after insert or update of email on auth.users
  for each row execute function mycen_private.sync_account_email();

-- Las cuentas que ya existen
insert into mycen_private.account_emails (user_id, email_lc)
select id, lower(email) from auth.users where email is not null
on conflict (user_id) do update set email_lc = excluded.email_lc;

-- ─── Búsqueda por candidatos con índice ──────────────────────────────────────
create or replace function public.admin_search_accounts(p_query text, p_limit integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_q text := lower(btrim(coalesce(p_query, '')));
  v_like text;
  v_id uuid;
begin
  perform mycen_assert_admin();
  if char_length(v_q) < 2 then return '[]'::jsonb; end if;
  -- Los comodines que escriba la persona se toman como texto
  v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  if v_q ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_id := v_q::uuid; end if;

  return coalesce((
    with cand as (
      (select e.user_id from mycen_private.account_emails e where e.email_lc like v_like limit 500)
      union
      (select s.user_id from profiles s where lower(s.username) like v_like limit 500)
      union
      (select s.user_id from profiles s where lower(s.display_name) like v_like limit 500)
      union
      (select s.user_id from profiles s where lower(s.space_slug) like v_like limit 500)
      union
      (select v_id where v_id is not null)
    )
    select jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc)
    from (
      select u.id as user_id, u.email, u.created_at, u.last_sign_in_at,
             p.display_name, p.username, p.status, p.suspended_at is not null as suspended,
             (i.verified_at is not null) as verified,
             (select count(*) from profiles s where s.user_id = u.id and s.status <> 'archived') as spaces,
             exists (select 1 from restaurants r2 where r2.owner_id = u.id) as has_business
      from cand c
      join auth.users u on u.id = c.user_id
      left join profiles p on p.user_id = u.id and p.is_primary
      left join identities i on i.user_id = u.id
      order by u.created_at desc
      limit least(greatest(coalesce(p_limit, 30), 1), 100)
    ) r
  ), '[]'::jsonb);
end $$;
revoke all on function public.admin_search_accounts(text, integer) from public, anon;
grant execute on function public.admin_search_accounts(text, integer) to authenticated;

notify pgrst, 'reload schema';
