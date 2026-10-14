#!/bin/bash
set -euo pipefail

SCRIPT_PATH="$(dirname "$(realpath "$0")")"
ROOT_DIR="$(realpath "${SCRIPT_PATH}/../..")"
cd "${SCRIPT_PATH}"

show_help() {
  cat << 'EOF'
Usage: restore_db.sh [OPTIONS] <PATH_TO_SNAPSHOT_FILE.sql.gz>

Restores the database schemas from a gzip-compressed snapshot.

Options:
  -y, --yes          Bypass confirmation prompt (for automated scripts)
  --no-restart       Skip restarting Docker Compose containers after restore
  -h, --help         Show this help message

Examples:
  ./restore_db.sh daily/public-rollback-20261014-120000.sql.gz
  ./restore_db.sh --yes latest-public-rollback.sql.gz
EOF
}

AUTO_CONFIRM=false
RESTART_CONTAINERS=true
SNAPSHOT_ARG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -y|--yes)
      AUTO_CONFIRM=true
      shift
      ;;
    --no-restart)
      RESTART_CONTAINERS=false
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      show_help
      exit 1
      ;;
    *)
      if [ -z "$SNAPSHOT_ARG" ]; then
        SNAPSHOT_ARG="$1"
      else
        echo "Unexpected argument: $1" >&2
        show_help
        exit 1
      fi
      shift
      ;;
  esac
done

if [ -z "$SNAPSHOT_ARG" ]; then
  echo "Error: Snapshot file path is required." >&2
  show_help
  exit 1
fi

if [ ! -f "$SNAPSHOT_ARG" ]; then
  echo "Error: Snapshot file does not exist: $SNAPSHOT_ARG" >&2
  exit 1
fi

SNAPSHOT_FILE="$(realpath "$SNAPSHOT_ARG")"
TIMESTAMP="$(basename "${SNAPSHOT_FILE}")"
SNAPSHOT_SIZE=$(wc -c < "${SNAPSHOT_FILE}" | tr -d ' ')

echo "=== Database Restore ==="
echo "Snapshot: ${TIMESTAMP}"
echo "Location: ${SNAPSHOT_FILE}"
echo "Size:     ${SNAPSHOT_SIZE} bytes"
echo "========================"

if [[ ${SNAPSHOT_SIZE} -lt 100 ]]; then
  echo "Error: Snapshot file is suspiciously small or empty (${SNAPSHOT_SIZE} bytes)." >&2
  exit 1
fi

if [ "$AUTO_CONFIRM" = false ]; then
  echo ""
  echo "WARNING: This operation will OVERWRITE public database schemas!"
  read -p "Are you sure you want to proceed? [y/N] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled by user."
    exit 0
  fi
fi

if [ ! -f "${ROOT_DIR}/.env" ]; then
  echo "Error: .env not found at ${ROOT_DIR}/.env" >&2
  exit 1
fi

set -a
source <(sed 's/\r$//' "${ROOT_DIR}/.env")
set +a

DB_CONNECTION_STRING=${DB_CONNECTION_STRING:?"DB_CONNECTION_STRING not found in .env"}

echo "Clearing schema and applying snapshot..."
docker run --rm -i --network host postgres:17.6 psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --dbname "${DB_CONNECTION_STRING}" \
  < <(cat "${SCRIPT_PATH}/clear_schemas.sql" && gunzip -c "${SNAPSHOT_FILE}")

if [ "$RESTART_CONTAINERS" = true ]; then
  echo "Restarting application containers..."
  cd "${ROOT_DIR}/infra"
  docker compose up -d
fi

echo "Successfully restored database from: ${TIMESTAMP}"
