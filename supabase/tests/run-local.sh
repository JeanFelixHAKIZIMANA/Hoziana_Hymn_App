#!/usr/bin/env bash
# Applies schema.sql and every migration to a Postgres database, then runs the RLS tests.
# Needs psql and an EMPTY throwaway database; never point it at the real Supabase project.
#
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres supabase/tests/run-local.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DATABASE_URL:?Set DATABASE_URL to an empty throwaway Postgres database}"
case "$DATABASE_URL" in *supabase.co*|*supabase.com*) echo "Refusing to run against a Supabase project." >&2; exit 1 ;; esac

run() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$1"; }
run tests/supabase-stub.sql
run schema.sql
for f in migrations/*.sql; do run "$f"; done
# Migrations must be safe to run twice.
for f in migrations/*.sql; do run "$f"; done
run tests/rls.test.sql
