#!/bin/bash
set -euo pipefail


SNAPSHOT_PATH=""
DB_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --db-only)
      DB_ONLY=true
      shift
      ;;
    *)
      SNAPSHOT_PATH="$1"
      shift
      ;;
  esac
done
[[ -n "$SNAPSHOT_PATH" ]] || { echo "Usage: $0 <snapshot.sql> [--db-only]"; exit 1; }


SNAPSHOT_PATH="$(realpath ${SNAPSHOT_PATH})"
TIMESTAMP="$(basename ${SNAPSHOT_PATH})"
VERSION="$(basename $(dirname ${SNAPSHOT_PATH}))"
SNAPSHOT_SIZE=$(du -sB 1 ${SNAPSHOT_PATH} | cut -f1)

echo "Snapshot info:"
echo "  Version: ${VERSION}"
echo "  Timestamp: ${TIMESTAMP}"
echo "  Size: ${SNAPSHOT_SIZE}"
echo ""

# Test snapshot directory structure
[ -d "${SNAPSHOT_PATH}" ] && \
[ -f "${SNAPSHOT_PATH}/roles.sql" ] && \
[ -f "${SNAPSHOT_PATH}/schema.sql" ] && \
[ -f "${SNAPSHOT_PATH}/data.sql" ] && \
[[ ${SNAPSHOT_SIZE} -gt 50000 ]] || \
{ echo "Malformed snapshot structure"; exit 1; }

echo "WARNING: This will OVERWRITE the database!"
read -p "Continue? [y/N] " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || { echo "Cancelled"; exit 0; }

source ../.env
DB_CONNECTION_STRING=${DB_CONNECTION_STRING:?"DB_CONNECTION_STRING not found in .env"}

# See https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --command "DROP SCHEMA public CASCADE" \
  --command "CREATE SCHEMA public" \
  --file "${SNAPSHOT_PATH}/schema.sql" \
  --file "${SNAPSHOT_PATH}/data.sql" \
  --dbname "${DB_CONNECTION_STRING}"
  
  # Don't restore supabase roles - both not possible and should be hard to mess up.
  # But we store them in case we need to recreate the whole instance.
  #
  # So this flags are set in tutorial, but not used by us
  # --file "${SNAPSHOT_PATH}/roles.sql" \
  # ...
  # --command 'SET session_replication_role = replica' \

echo "Restored to version $version"

