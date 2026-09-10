#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(dirname $(realpath ${0}))"
cd "${SCRIPT_DIR}"

source <(sed 's/\r$//' ../../.env)
DB_CONNECTION_STRING=${DB_CONNECTION_STRING:?"DB_CONNECTION_STRING not found in .env"}

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DAY_OF_WEEK=$(date +%u) # 1-7 (Monday-Sunday)
DAILY_DIR="${SCRIPT_DIR}/daily"
WEEKLY_DIR="${SCRIPT_DIR}/weekly"

mkdir -p "${DAILY_DIR}" "${WEEKLY_DIR}"
chown :users "${DAILY_DIR}" "${WEEKLY_DIR}"
chmod g+rwx "${DAILY_DIR}" "${WEEKLY_DIR}"

PUBLIC_FILE="${DAILY_DIR}/public-rollback-${TIMESTAMP}.sql.gz"
AUTH_FILE="${DAILY_DIR}/public-auth-${TIMESTAMP}.sql.gz"

echo "Dumping and compressing public schema..."
docker run --rm -i postgres:17.6 pg_dump \
  --dbname "${DB_CONNECTION_STRING}" \
  -n "public" \
  -n "supabase_migrations" \
  --no-privileges \
  | sed '/^CREATE SCHEMA public;$/d' \
  | sed '/^CREATE SCHEMA supabase_migrations;$/d' \
  | gzip > "${PUBLIC_FILE}"

echo "Dumping and compressing auth schema..."
docker run --rm -i postgres:17.6 pg_dump \
  --dbname "${DB_CONNECTION_STRING}" \
  -n "public" \
  -n "auth" \
  | gzip > "${AUTH_FILE}"

# Fix permissions
chown :users "${PUBLIC_FILE}" "${AUTH_FILE}"
chmod g+rw "${PUBLIC_FILE}" "${AUTH_FILE}"

echo "Update latest pointers for future DR scripts..."
cp "${PUBLIC_FILE}" "${SCRIPT_DIR}/latest-public-rollback.sql.gz"
cp "${AUTH_FILE}" "${SCRIPT_DIR}/latest-public-auth.sql.gz"

# Fix permissions on latest
chown :users "${SCRIPT_DIR}/latest-public-rollback.sql.gz" "${SCRIPT_DIR}/latest-public-auth.sql.gz"
chmod g+rw "${SCRIPT_DIR}/latest-public-rollback.sql.gz" "${SCRIPT_DIR}/latest-public-auth.sql.gz"

echo "Rotating Daily backups (keeping 7)..."
ls -1t "${DAILY_DIR}"/public-rollback-*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f || true
ls -1t "${DAILY_DIR}"/public-auth-*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f || true

echo "Rotating Weekly backups (keeping 4)..."
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    cp "${PUBLIC_FILE}" "${WEEKLY_DIR}/"
    cp "${AUTH_FILE}" "${WEEKLY_DIR}/"
    ls -1t "${WEEKLY_DIR}"/public-rollback-*.sql.gz 2>/dev/null | tail -n +5 | xargs rm -f || true
    ls -1t "${WEEKLY_DIR}"/public-auth-*.sql.gz 2>/dev/null | tail -n +5 | xargs rm -f || true
fi

echo "Created snapshot: ${TIMESTAMP}"
echo "Backup complete."
