#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || realpath "${SCRIPT_DIR}/..")"
SQL_FILE="${SCRIPT_DIR}/reconcile_production_baseline.sql"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# 1. Load connection string
if [ -z "${DB_CONNECTION_STRING:-}" ]; then
  if [ -f "${ROOT_DIR}/.env" ]; then
    set -a
    source <(sed 's/\r$//' "${ROOT_DIR}/.env")
    set +a
  fi
fi

DB_CONN="${DB_CONNECTION_STRING:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

if [ ! -f "${SQL_FILE}" ]; then
  fail "Reconciliation SQL file not found at: ${SQL_FILE}"
fi

info "Target Database: ${DB_CONN/@*/@...}"

# Helper to execute psql either via local binary or docker
run_psql() {
  local sql_input="$1"
  if command -v psql >/dev/null 2>&1; then
    psql "${DB_CONN}" -v ON_ERROR_STOP=1 -q -t -A -c "${sql_input}"
  elif docker ps --format '{{.Names}}' | grep -q "^supabase_db_Magazyn$"; then
    docker exec -i supabase_db_Magazyn psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -A -c "${sql_input}"
  else
    docker run --rm -i --network host postgres:17.6 psql "${DB_CONN}" -v ON_ERROR_STOP=1 -q -t -A -c "${sql_input}"
  fi
}

run_psql_file() {
  local file_input="$1"
  if command -v psql >/dev/null 2>&1; then
    psql "${DB_CONN}" -v ON_ERROR_STOP=1 -q -f "${file_input}"
  elif docker ps --format '{{.Names}}' | grep -q "^supabase_db_Magazyn$"; then
    docker exec -i supabase_db_Magazyn psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < "${file_input}"
  else
    docker run --rm -i --network host postgres:17.6 psql "${DB_CONN}" -v ON_ERROR_STOP=1 -q < "${file_input}"
  fi
}

# 2. Pre-flight backup (if backup script exists and not skipped)
if [ "${SKIP_BACKUP:-false}" != "true" ] && [ -f "${ROOT_DIR}/infra/backups/backup_db.sh" ]; then
  info "Running pre-flight database backup..."
  bash "${ROOT_DIR}/infra/backups/backup_db.sh" "pre-reconcile" || warn "Backup script returned non-zero, continuing..."
fi

# 3. Apply reconciliation script inside single transaction
info "Applying reconciliation SQL script..."
run_psql_file "${SQL_FILE}"
info "Reconciliation script executed successfully."

# 4. Post-execution verification
info "Verifying database state..."

# Check cast in update_credit_request_atomic
UPDATE_PROSRC=$(run_psql "SELECT prosrc FROM pg_proc WHERE proname = 'update_credit_request_atomic';")
if echo "${UPDATE_PROSRC}" | grep -q "status = p_status::credit_request_status"; then
  info "Assertion passed: update_credit_request_atomic contains explicit ::credit_request_status cast."
else
  fail "Assertion failed: update_credit_request_atomic missing cast!"
fi

# Check cast in review_credit_request_atomic
REVIEW_PROSRC=$(run_psql "SELECT prosrc FROM pg_proc WHERE proname = 'review_credit_request_atomic';")
if echo "${REVIEW_PROSRC}" | grep -q "status = p_status::credit_request_status"; then
  info "Assertion passed: review_credit_request_atomic contains explicit ::credit_request_status cast."
else
  fail "Assertion failed: review_credit_request_atomic missing cast!"
fi

# Check schema_migrations row count
MIGRATION_COUNT=$(run_psql "SELECT count(*) FROM supabase_migrations.schema_migrations;" | tr -dc '0-9')
if [ "${MIGRATION_COUNT}" = "10" ]; then
  info "Assertion passed: supabase_migrations.schema_migrations has exactly 10 consolidated records."
else
  fail "Assertion failed: expected 10 migrations, found: ${MIGRATION_COUNT}"
fi

info "All reconciliation checks passed! Database is now aligned with repository main."
