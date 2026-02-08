#!/bin/bash
set -euo pipefail

# Get version
SCRIPT_DIR="$(dirname $(realpath ${0}))"
cd "${SCRIPT_DIR}"
VERSION="$(git describe --tags --abbrev=0 2>/dev/null)"

DIR="${SCRIPT_DIR}/snapshots/${VERSION}/$(date +%Y%m%d-%H%M%S)"

# Create version directory if it does not exist
mkdir -p "${DIR}"

source ../.env
DB_CONNECTION_STRING=${DB_CONNECTION_STRING:?"DB_CONNECTION_STRING not found in .env"}

# Note: we only dump public and auth schemas - I understand the rest as internal to supabase

# Dump schema public for rollbacks
# - We cannot simply drop whole schema since we are not allowed to modify permissions (supabase policy)
# - "--clean" does not cascade so we need to add cascade manually
# - as said eariler no priv modification, so '--no-privilages' required
pg_dump \
  --dbname "${DB_CONNECTION_STRING}" \
  -n "public" \
  --clean \
  --if-exists \
  --no-privileges \
  | sed '/CREATE SCHEMA/d' \
  | sed '/DROP SCHEMA/d' \
  | sed -E 's/^DROP(.*);$/DROP\1 CASCADE;/' \
  > "${DIR}/public-rollback.sql"

pg_dump \
  --dbname "${DB_CONNECTION_STRING}" \
  -n "public" \
  > "${DIR}/public-full.sql"

echo "Created snapshot: ${DIR} ($(du -h "${DIR}" | cut -f1))"

