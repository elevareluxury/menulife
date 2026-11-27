-- Panel del equipo con fotos calculadas cada hora (20261207000001).
\ir ../../supabase/migrations/20261207000001_admin_snapshots.sql
begin;

insert into auth.users (id, email, created_at) values
  ('aaaaaaaa-8000-0000-0000-000000000001', 'admin@x', now() - interval '200 days'),
  ('bbbbbbbb-8000-0000-0000-000000000002', 'ana@x', now() - interval '120 days');
insert into public.super_admins (user_id) values ('aaaaaaaa-8000-0000-0000-000000000001');
-- 60 personas con actividad salteada en los últimos 400 días (huecos de todos los tamaños: 1, 7, 8, 30, 31 días…)
insert into auth.users (id, email, created_at)
select ('cccccccc-8000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'p' || g || '@x', now() - interval '420 days'
from generate_series(1, 60) g;
insert into user_activity_days (user_id, day, life, studio)
select u.id, d::date, true, false
from auth.users u, generate_series(current_date - 400, current_date, interval '1 day') d
where u.email like 'p%@x' and (abs(hashtext(u.id::text || d::text)) % 9 = 0 or (extract(doy from d)::int % 37) = (abs(hashtext(u.id::text)) % 37))
on conflict do nothing;

-- ── Los activos de 7 y 30 días en una pasada dan lo mismo que contar día por día ──
do $$
declare got jsonb; bad integer;
begin
  got := mycen_compute_growth_overview(365) -> 'daily';
  assert jsonb_array_length(got) = 365, 'un punto por día';
  select count(*) into bad
  from jsonb_array_elements(got) e, lateral (select (e ->> 'day')::date as d) x
  where (e ->> 'dau')::int <> (select count(*) from user_activity_days a where a.day = x.d)
     or (e ->> 'wau')::int <> (select count(distinct user_id) from user_activity_days a where a.day > x.d - 7 and a.day <= x.d)
     or (e ->> 'mau')::int <> (select count(distinct user_id) from user_activity_days a where a.day > x.d - 30 and a.day <= x.d);
  assert bad = 0, format('%s días con otro número que el conteo directo', bad);
  assert (select sum((e ->> 'mau')::int) from jsonb_array_elements(got) e) > 0, 'hay datos de verdad';
end $$;

-- ── 30 y 90 días recortados del de 365 = calcularlos directo ──────────────────
do $$
declare base jsonb := mycen_compute_growth_overview(365); d integer;
begin
  foreach d in array array[30, 90] loop
    assert mycen_admin_slice_growth(base, d) = mycen_compute_growth_overview(d), format('el recorte de %s días coincide', d);
  end loop;
  -- Y el trabajo lo usa: con una foto de 365 recién calculada, la de 90 sale de ahí
  perform mycen_admin_snapshot_store('growth_overview', 365);
  update mycen_admin_snapshots set payload = payload || '{"marca": "365"}' where name = 'growth_overview' and days = 365;
  assert mycen_admin_snapshot_store('growth_overview', 90) ->> 'marca' = '365', 'recorta la de 365';
  delete from mycen_admin_snapshots;
end $$;

-- ── Con sesión de super-admin: la foto se guarda y se reusa ───────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-8000-0000-0000-000000000001', true);
do $$
declare v jsonb;
begin
  v := admin_growth_overview(90);
  assert (v ->> 'days')::int = 90, 'misma forma de siempre';
end $$;
reset role;
do $$ begin
  assert exists (select 1 from mycen_admin_snapshots where name = 'growth_overview' and days = 90 and payload is not null),
    'quedó la foto';
  update mycen_admin_snapshots set payload = payload || '{"marca": "foto"}' where name = 'growth_overview' and days = 90;
end $$;
set local role authenticated;
do $$ begin
  assert admin_growth_overview(90) ->> 'marca' = 'foto', 'devuelve la foto, no recalcula';
end $$;
reset role;
-- Una foto de más de 2 horas se recalcula
update mycen_admin_snapshots set computed_at = now() - interval '3 hours' where name = 'growth_overview' and days = 90;
set local role authenticated;
do $$ begin
  assert admin_growth_overview(90) ->> 'marca' is null, 'vieja: se calcula de nuevo';
end $$;
-- Recalcular a mano
do $$
declare r jsonb;
begin
  r := admin_refresh_snapshot('growth_retention', 0);
  assert r ->> 'computed_at' is not null, 'recalculó';
  begin
    perform admin_refresh_snapshot('cualquier_cosa', 0);
    assert false, 'sólo las fotos del plan';
  exception when invalid_parameter_value then null; end;
  assert jsonb_array_length(admin_snapshot_info()) = 16, 'info de las 16 fotos';
end $$;
-- Estado: lo pesado sale de la foto, con su hora
do $$
declare s jsonb;
begin
  s := admin_system_status();
  assert s ? 'storage' and s ? 'sitemap_paths', 'misma forma';
  assert s ->> 'heavy_computed_at' is not null, 'dice de cuándo es';
end $$;
reset role;

-- ── Si recalcular falla y hay una foto anterior, se muestra la anterior ───────
update mycen_admin_snapshots set computed_at = now() - interval '3 hours' where name = 'growth_retention';
create or replace function public.mycen_compute_growth_retention() returns jsonb language plpgsql as $$
begin raise exception 'se cayó'; end $$;
set local role authenticated;
do $$ begin
  assert admin_growth_retention() is not null, 'la foto anterior';
end $$;
reset role;
do $$ begin
  assert (select error from mycen_admin_snapshots where name = 'growth_retention') like '%se cayó%', 'queda el error anotado';
end $$;

-- ── Sin permiso, nada ─────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-8000-0000-0000-000000000002', true);
do $$
declare f text;
begin
  foreach f in array array['admin_overview(30)', 'admin_growth_overview(90)', 'admin_growth_retention()',
    'admin_growth_funnel(30)', 'admin_growth_adoption(30)', 'admin_product_metrics(30)', 'admin_signup_sources(30)',
    'admin_snapshot_info()', 'admin_refresh_snapshot(''overview'', 30)', 'admin_system_status()'] loop
    begin
      execute 'select public.' || f;
      assert false, f || ' sin ser del equipo';
    exception when insufficient_privilege then null; end;
  end loop;
  begin
    perform mycen_refresh_admin_snapshots();
    assert false, 'el trabajo de fondo no es de la app';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  assert not has_function_privilege('authenticated', 'mycen_compute_overview(integer)', 'execute'), 'los cálculos no son de la app';
  assert not has_function_privilege('anon', 'mycen_refresh_admin_snapshots()', 'execute'), 'el trabajo tampoco';
  assert not has_table_privilege('authenticated', 'mycen_admin_snapshots', 'select'), 'nadie lee las fotos directo';
end $$;

-- ── El trabajo de cada hora: sin sesión, con la marca y fuera de la API ───────
select set_config('request.jwt.claim.sub', '', true);
do $$
declare r jsonb;
begin
  -- Sin la marca, una conexión sin sesión no es del equipo
  begin
    perform admin_overview(30);
    assert false, 'sin marca no pasa';
  exception when insufficient_privilege then null; end;
  r := mycen_refresh_admin_snapshots();
  assert (r ->> 'failed')::int = 1, format('sólo falla la que rompimos (%s)', r);
  assert (r ->> 'ok')::int = 15, format('las otras 15 se calcularon (%s)', r);
  assert coalesce(current_setting('mycen.snapshot_job', true), '') = '', 'la marca no queda puesta';
end $$;

-- Desde la API (session_user authenticated) la marca no sirve de nada
set local session authorization authenticated;
do $$ begin
  perform set_config('mycen.snapshot_job', 'on', true);
  begin
    perform admin_overview(30);
    assert false, 'la marca no abre nada desde la API';
  exception when insufficient_privilege then null; end;
  perform set_config('mycen.snapshot_job', '', true);
end $$;
reset session authorization;

rollback;
