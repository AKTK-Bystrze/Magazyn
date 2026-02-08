#!/bin/bash
set -euo pipefail

# Get version
SCRIPT_DIR="$(dirname $(realpath ${0}))"
cd "${SCRIPT_DIR}"
VERSION="$(git describe --tags --abbrev=0 2>/dev/null)"

DIR="${SCRIPT_DIR}/snapshots/${VERSION}/$(date +%Y%m%d-%H%M%S)"

# Create version directory if it does not exist
mkdir -p "${DIR}"
touch "${DIR}/roles.sql"
touch "${DIR}/schema.sql"
touch "${DIR}/data.sql"

# Access connection string - this isn't top-tier security, but supabase requries it
source ../.env
DB_CONNECTION_STRING=${DB_CONNECTION_STRING:?"DB_CONNECTION_STRING not found in .env"}

# See https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
pwd
echo "${DIR}/roles.sql"
supabase db dump --db-url "${DB_CONNECTION_STRING}" -f "${DIR}/roles.sql" --role-only
supabase db dump --db-url "${DB_CONNECTION_STRING}" -f "${DIR}/schema.sql"
supabase db dump --db-url "${DB_CONNECTION_STRING}" -f "${DIR}/data.sql" --use-copy --data-only

# Remove first line from schema.sql as it modifies supabase roles for some reason 
tail -n +2 "${DIR}/data.sql" > "${DIR}/data.tmp" && mv "${DIR}/data.tmp" "${DIR}/data.sql"

echo "Created snapshot: ${DIR} ($(du -h "${DIR}" | cut -f1))"

