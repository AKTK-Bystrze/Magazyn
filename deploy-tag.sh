#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(dirname $(realpath ${0}))"
cd "${SCRIPT_DIR}"

TARGET_TAG="${1}"
[ -n "${TARGET_TAG}" ] || { echo "You have to specify tag of target release as an argument"; exit 1; }

git fetch --tags

CURRENT_TAG="$(git describe --tags --abbrev=0 2>/dev/null)"
[ -n "${CURRENT_TAG}" ] || { echo "Not on a tagged commit. Return to the commit of last release."; exit 1; }

# Compare with target tag
[ "${TARGET_TAG}" != "${CURRENT_TAG}" ] || { echo "Cannot deploy to the same commit. Checkout the commit of last release."; exit 1; }

# Check that we can actually checkout target
git checkout "${TARGET_TAG}" || { echo "No target tag in git"; exit 1;}
git checkout "${CURRENT_TAG}"

# Create snapshot
bash ./infra/backups/backup_db.sh

# Checkout target tag
git checkout "${TARGET_TAG}"
npx supabase db push
cd ./infra/
docker compose up --build -d

echo "Deployed to version ${TARGET_TAG}"
