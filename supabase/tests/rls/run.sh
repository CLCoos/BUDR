#!/usr/bin/env bash
# Kører RLS-checks mod en lokal Postgres: først prod-tilstanden før bølge 1 (forventer HOLE),
# derefter med migrationen anvendt (forventer blocked/works). Kræver psql og en tom database.
#   PGHOST=/tmp PGPORT=5432 PGUSER=postgres supabase/tests/rls/run.sh
set -euo pipefail
cd "$(dirname "$0")"
DB=budr_rls_test
psql -q -c "DROP DATABASE IF EXISTS $DB" 2>/dev/null -c "CREATE DATABASE $DB" >/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f stub.sql >/dev/null
# Alle migrationer fra bølge 1 og frem, i rækkefølge
for f in $(ls ../../migrations/*.sql | sort | awk -F/ '$NF >= "20261013130000"'); do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" >/dev/null 2>&1
done
out=$(psql -q -d "$DB" -f checks.sql | grep -v '^$')
echo "$out"
psql -q -c "DROP DATABASE $DB" >/dev/null
if echo "$out" | grep -qE 'HOLE|BROKEN'; then
  echo "RLS-checks fejlede" >&2
  exit 1
fi
