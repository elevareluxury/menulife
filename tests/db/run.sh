#!/usr/bin/env bash
# Pruebas de base de datos de Identity: aplica las migraciones sobre un Postgres limpio y corre tests/db/*.test.sql.
# Usa las variables estándar de Postgres (PGHOST, PGPORT, PGUSER, PGPASSWORD). Ej.:
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres npm run test:db
set -euo pipefail
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"
cd "$(dirname "$0")/../.."
DB="mycen_test_$$"
psql -d postgres -qAtX -c "create database $DB" >/dev/null
trap 'psql -d postgres -qAtX -c "drop database if exists $DB" >/dev/null' EXIT
PSQL=(psql -d "$DB" -q -v ON_ERROR_STOP=1 -X)

"${PSQL[@]}" -f tests/db/supabase_stubs.sql
for m in \
  20261001000001_mycen_profiles_foundation \
  20261002000001_profile_cards_tags_life_tasks \
  20261007000001_identity_spaces_expand \
  20261008000001_identity_versioned_publishing \
  20261009000001_identity_projects \
  20261010000001_identity_links_connect \
  20261011000001_identity_moderation \
  20261012000001_identity_spaces \
  20261013000001_launch_sitemap \
  20261014000001_launch_errors \
  20261015000001_v1_profile_look \
  20261016000001_v1_media_module \
  20261017000001_v1_profile_messages \
  20261018000001_v1_referrals \
  20261019000001_v1_task_recurrence \
  20261020000001_v1_habits \
  20261021000001_v1_daily_review; do
  "${PSQL[@]}" -f "supabase/migrations/$m.sql" >/dev/null
done

fail=0
for t in tests/db/*.test.sql; do
  if "${PSQL[@]}" -f "$t" >/dev/null 2>/tmp/db-test-err; then
    echo "✓ $(basename "$t")"
  else
    echo "✗ $(basename "$t")"; cat /tmp/db-test-err; fail=1
  fi
done
exit $fail
