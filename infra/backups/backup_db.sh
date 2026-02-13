#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(dirname $(realpath ${0}))"
cd "${SCRIPT_DIR}"

get_docker_image_tag() {
    local service_name="$1"
    docker ps --filter "name=$service_name" --format "{{.Image}}" | head -n 1 | cut -d: -sf2
}

# Take version from argument (1st priority)
VERSION="${1:-""}"

if [ -z "${VERSION}" ]; then
    # Attempt to get version from running Docker container (2nd priority)
    VERSION=$(get_docker_image_tag "magazyn-backend")
fi

if [ -z "${VERSION}" ]; then
    # Fallback to current git tag (3rd priority)
    VERSION="$(git describe --tags --abbrev=0 2>/dev/null)"
fi

[ -n "${VERSION}" ] || { echo "No version provided, no running Docker container found, and not on a tagged commit."; exit 1; }
DIR="${SCRIPT_DIR}/snapshots/${VERSION}/$(date +%Y%m%d-%H%M%S)"

# Create version directory if it does not exist
mkdir -p "${DIR}"

source ../../.env
DB_CONNECTION_STRING=${DB_CONNECTION_STRING:?"DB_CONNECTION_STRING not found in .env"}

# For the automatic rollback we only include `public` and `supabase_migrations`
# because migrations need to be reset so new ones can be performed as usual.
#
# We add `auth` in case we need data for manual recovery.

# Dump schema public for rollbacks
# - We cannot simply drop whole schema since we are not allowed to modify permissions (supabase policy)
# - as said eariler no priv modification, so '--no-privilages' required
# - if there are per-table privs then everything breaks
# - if `auth` is corrupted then we need manual action
docker run --rm -i --network host postgres:17.6 pg_dump \
  --dbname "${DB_CONNECTION_STRING}" \
  -n "public" \
  -n "supabase_migrations" \
  --no-privileges \
  | sed '/^CREATE SCHEMA public;$/d' \
  | sed '/^CREATE SCHEMA supabase_migrations;$/d' \
  > "${DIR}/public-rollback.sql"

docker run --rm -i --network host postgres:17.6 pg_dump \
  --dbname "${DB_CONNECTION_STRING}" \
  -n "public" \
  -n "auth" \
  > "${DIR}/public-auth.sql"

echo "Created snapshot: ${DIR} ($(du -h "${DIR}" | cut -f1))"
echo ""

RETAIN_NUM=10

# Retain 10 most recent snapshots for each version
for VERSION_DIR in "${SCRIPT_DIR}/snapshots"/*/; do
    [ -d "${VERSION_DIR}" ] || continue

    DIRS_TO_REMOVE=$(ls -1dt "${VERSION_DIR}"*/ 2>/dev/null | tail -n +"$((${RETAIN_NUM} + 1))")

    if [[ ${DIRS_TO_REMOVE} =~ [^[:space:]] ]]; then
      echo "Removing following old snapshots:"
      echo "${DIRS_TO_REMOVE}"
      rm -rf "${DIRS_TO_REMOVE}"
    fi
done
