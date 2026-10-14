#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
ROOT_DIR="${MAGAZYN_ROOT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || realpath "${SCRIPT_DIR}/../..")}"
BACKUPS_DIR="${ROOT_DIR}/infra/backups"
cd "${BACKUPS_DIR}"

if [ ! -f "${ROOT_DIR}/.env" ]; then
  echo "Error: .env not found at ${ROOT_DIR}/.env" >&2
  exit 1
fi

set -a
source <(sed 's/\r$//' "${ROOT_DIR}/.env")
set +a

DB_CONNECTION_STRING=${DB_CONNECTION_STRING:?"DB_CONNECTION_STRING not found in .env"}

TAG_ARG="${1:-}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PREFIX="${TAG_ARG:+${TAG_ARG}-}"
DAY_OF_WEEK=$(date +%u) # 1-7 (Monday-Sunday)
DAILY_DIR="${BACKUPS_DIR}/daily"
WEEKLY_DIR="${BACKUPS_DIR}/weekly"

mkdir -p "${DAILY_DIR}" "${WEEKLY_DIR}"

safe_chown() {
  if getent group users >/dev/null 2>&1; then
    chown :users "$@" 2>/dev/null || true
  fi
  chmod g+rw "$@" 2>/dev/null || true
}

safe_chown "${DAILY_DIR}" "${WEEKLY_DIR}"
chmod g+rwx "${DAILY_DIR}" "${WEEKLY_DIR}" 2>/dev/null || true

PUBLIC_FILE="${DAILY_DIR}/public-rollback-${PREFIX}${TIMESTAMP}.sql.gz"
AUTH_FILE="${DAILY_DIR}/public-auth-${PREFIX}${TIMESTAMP}.sql.gz"

echo "Dumping and compressing public schema..."
docker run --rm -i --network host postgres:17.6 pg_dump \
  --dbname "${DB_CONNECTION_STRING}" \
  -n "public" \
  -n "supabase_migrations" \
  --no-privileges \
  | sed '/^CREATE SCHEMA public;$/d' \
  | sed '/^CREATE SCHEMA supabase_migrations;$/d' \
  | gzip > "${PUBLIC_FILE}"

echo "Dumping and compressing auth schema..."
docker run --rm -i --network host postgres:17.6 pg_dump \
  --dbname "${DB_CONNECTION_STRING}" \
  -n "public" \
  -n "auth" \
  | gzip > "${AUTH_FILE}"

# Fix permissions
safe_chown "${PUBLIC_FILE}" "${AUTH_FILE}"

echo "Update latest pointers for future DR scripts..."
cp -f "${PUBLIC_FILE}" "${BACKUPS_DIR}/latest-public-rollback.sql.gz"
cp -f "${AUTH_FILE}" "${BACKUPS_DIR}/latest-public-auth.sql.gz"
safe_chown "${BACKUPS_DIR}/latest-public-rollback.sql.gz" "${BACKUPS_DIR}/latest-public-auth.sql.gz"

echo "Rotating Daily backups (keeping 7)..."
ls -1t "${DAILY_DIR}"/public-rollback-*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
ls -1t "${DAILY_DIR}"/public-auth-*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true

echo "Rotating Weekly backups (keeping 4)..."
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    cp -f "${PUBLIC_FILE}" "${WEEKLY_DIR}/"
    cp -f "${AUTH_FILE}" "${WEEKLY_DIR}/"
    ls -1t "${WEEKLY_DIR}"/public-rollback-*.sql.gz 2>/dev/null | tail -n +5 | xargs rm -f 2>/dev/null || true
    ls -1t "${WEEKLY_DIR}"/public-auth-*.sql.gz 2>/dev/null | tail -n +5 | xargs rm -f 2>/dev/null || true
fi

echo "Created snapshot: ${PUBLIC_FILE}"
echo "Backup complete."
