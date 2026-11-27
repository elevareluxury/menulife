#!/usr/bin/env bash
# Medición del panel del equipo con muchos datos (docs/lanzamiento/panel-escala.md). SÓLO en un Postgres local o de
# prueba: crea la base "mycen_bench" con las migraciones de tests/db/run.sh, la llena con datos inventados (cuentas,
# actividad, eventos, archivos) y mide cuánto tarda cada pantalla del panel como super-admin.
# Nunca contra producción. Uso: PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres bash scripts/load/admin-bench.sh [cuentas]
#   ADMIN_BENCH_KEEP=1 conserva la base al terminar (para medir de nuevo con ADMIN_BENCH_REUSE=1).
set -euo pipefail
cd "$(dirname "$0")/../.."
N="${1:-200000}"
DB=mycen_bench
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning -c request.jwt.claims={\"aal\":\"aal2\"}"
PSQL=(psql -d "$DB" -q -v ON_ERROR_STOP=1 -X)

if [ "${ADMIN_BENCH_REUSE:-}" != "1" ]; then
  psql -d postgres -qAtX -c "drop database if exists $DB" -c "create database $DB" >/dev/null
  "${PSQL[@]}" -f tests/db/supabase_stubs.sql
  # Las mismas migraciones y en el mismo orden que las pruebas de la base
  for m in $(sed -n '/^for m in/,/; do$/p' tests/db/run.sh | grep -o '[0-9]\{14\}_[a-z0-9_]*'); do
    "${PSQL[@]}" -f "supabase/migrations/$m.sql" >/dev/null
  done
  echo "Cargando $N cuentas inventadas…"
  "${PSQL[@]}" -v n="$N" <<'SQL'
set session_replication_role = replica;  -- sin triggers ni claves foráneas: es sólo para medir
insert into auth.users (id, email, created_at)
select gen_random_uuid(), 'bench' || g || '@example.com', now() - (random() * interval '400 days') from generate_series(1, :n) g;
insert into identities (id, user_id, created_at) select gen_random_uuid(), id, created_at from auth.users;
insert into profiles (id, user_id, identity_id, username, display_name, status, visibility, is_primary, created_at, published_at, theme)
select gen_random_uuid(), i.user_id, i.id, 'bench' || row_number() over (), 'Persona ' || row_number() over (),
       case when random() < 0.6 then 'published' else 'draft' end, 'public', true, i.created_at,
       i.created_at + interval '1 day', '{"layout": "credencial", "mode": "universo"}'::jsonb
from identities i;
update identities i set primary_space_id = p.id from profiles p where p.identity_id = i.id;
-- Actividad: cada cuenta usa la app ~30 % de los últimos 120 días
insert into user_activity_days (user_id, day, life, studio, platform, lang, tz)
select u.id, d::date, random() < 0.7, random() < 0.4, (array['web','pwa','ios','android'])[1 + (random() * 3)::int],
       (array['es','en','pt','fr'])[1 + (random() * 3)::int], 'America/Argentina/Buenos_Aires'
from auth.users u, generate_series(current_date - 119, current_date, interval '1 day') d
where random() < 0.3 and d::date >= u.created_at::date
on conflict do nothing;
insert into product_events (user_id, event, props, created_at)
select u.id, (array['signup_started','signup_completed','onboarding_step','profile_published','habit_logged','task_completed',
                    'life_my_day_opened','life_priorities_set','life_day_closed','share_tool_used'])[1 + (random() * 9)::int],
       '{}'::jsonb, now() - random() * interval '365 days'
from auth.users u, generate_series(1, 10) g;
insert into profile_events (profile_id, event_type, visitor_hash, source, created_at)
select p.id, case when random() < 0.8 then 'view' else 'module_click' end, md5(random()::text), null, now() - random() * interval '90 days'
from profiles p, generate_series(1, 15) g where p.status = 'published';
insert into storage.objects (bucket_id, name, metadata)
select 'profile-media', u.id || '/' || g || '.webp', jsonb_build_object('size', 200000 + (random() * 300000)::int)
from auth.users u, generate_series(1, 5) g;
set session_replication_role = origin;
analyze;
SQL
fi

ADMIN=$("${PSQL[@]}" -qAt -c "select id from auth.users order by id limit 1")
"${PSQL[@]}" -c "insert into super_admins (user_id) values ('$ADMIN') on conflict do nothing" >/dev/null
echo "Filas: $("${PSQL[@]}" -qAt -c "select format('cuentas %s · actividad %s · eventos de producto %s · visitas %s · archivos %s',
  (select count(*) from auth.users), (select count(*) from user_activity_days), (select count(*) from product_events),
  (select count(*) from profile_events), (select count(*) from storage.objects))")"
echo
printf '%-42s %10s\n' "Pantalla (función)" "ms"
for call in "admin_overview(30)" "admin_growth_overview(30)" "admin_growth_overview(90)" "admin_growth_overview(365)" \
            "admin_growth_retention()" "admin_growth_funnel(90)" "admin_growth_adoption(90)" "admin_product_metrics(90)" \
            "admin_product_metrics(365)" "admin_signup_sources(90)" "admin_system_status()" "admin_search_accounts('bench1234')" \
            "admin_search_accounts('persona 99')"; do
  ms=$("${PSQL[@]}" -qAt <<SQL 2>&1 | tail -1
set role authenticated;
select set_config('request.jwt.claim.sub', '$ADMIN', false);
do \$\$ declare t timestamptz := clock_timestamp(); begin perform public.$call; raise warning 'ms=%', round(extract(epoch from clock_timestamp() - t) * 1000); end \$\$;
SQL
)
  printf '%-42s %10s\n' "$call" "$(echo "$ms" | grep -o 'ms=[0-9]*' | cut -d= -f2 || echo "$ms")"
done
[ "${ADMIN_BENCH_KEEP:-}" = "1" ] || psql -d postgres -qAtX -c "drop database if exists $DB" >/dev/null
