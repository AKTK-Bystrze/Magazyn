#!/bin/bash
set -euo pipefail

SNAPSHOT_FILE="$1"
SNAPSHOT_FILE="$(realpath ${SNAPSHOT_FILE})"
SCRIPT_PATH="$(dirname $(realpath ${0}))"
cd "${SCRIPT_PATH}"

TIMESTAMP="$(basename ${SNAPSHOT_FILE})"
SNAPSHOT_SIZE=$(du -sB 1 ${SNAPSHOT_FILE} | cut -f1)

echo "Snapshot info:"
echo "  File: ${TIMESTAMP}"
echo "  Size: ${SNAPSHOT_SIZE}"
echo ""

# Test snapshot file structure
[ -f "${SNAPSHOT_FILE}" ] && \
[[ ${SNAPSHOT_SIZE} -gt 1000 ]] || \
{ echo "Malformed snapshot file"; exit 1; }

echo "WARNING: This will OVERWRITE the database!"
read -p "Continue? [y/N] " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || { echo "Cancelled"; exit 0; }

set -a
source <(sed 's/\r$//' ../../.env)
set +a
DB_CONNECTION_STRING=${DB_CONNECTION_STRING:?"DB_CONNECTION_STRING not found in .env"}

docker run --rm -i postgres:17.6 psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --dbname "${DB_CONNECTION_STRING}" \
  < <(cat "${SCRIPT_PATH}/clear_schemas.sql" && gunzip -c "${SNAPSHOT_FILE}")

cd "${SCRIPT_PATH}/.."
docker compose up -d

echo "Restored from ${TIMESTAMP}"
