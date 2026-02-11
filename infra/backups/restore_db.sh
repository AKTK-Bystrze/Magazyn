#!/bin/bash
set -euo pipefail


SNAPSHOT_PATH=""
DB_ONLY=false
SCRIPT_PATH="$(dirname $(realpath ${0}))"
cd "${SCRIPT_PATH}"

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

cd "${SCRIPT_PATH}"

# Test snapshot directory structure
[ -d "${SNAPSHOT_PATH}" ] && \
[ -f "${SNAPSHOT_PATH}/public-rollback.sql" ] && \
[ -f "${SNAPSHOT_PATH}/public-auth.sql" ] && \
[[ ${SNAPSHOT_SIZE} -gt 50000 ]] || \
{ echo "Malformed snapshot structure"; exit 1; }

echo "WARNING: This will OVERWRITE the database!"
read -p "Continue? [y/N] " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || { echo "Cancelled"; exit 0; }

set -a
source ../../.env
set +a
DB_CONNECTION_STRING=${DB_CONNECTION_STRING:?"DB_CONNECTION_STRING not found in .env"}

psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "${SNAPSHOT_PATH}/../../../clear_schemas.sql" \
  --file "${SNAPSHOT_PATH}/public-rollback.sql" \
  --dbname "${DB_CONNECTION_STRING}"

if ! ${DB_ONLY}; then
  cd "${SCRIPT_PATH}/.."
  cd ./infra/
  git checkout "${VERSION}"
  docker compose up --build -d
fi

echo "Restored to version ${VERSION}"

