#!/bin/bash
set -euo pipefail

git fetch --tags

CURRENT_TAG="$(git describe --tags --abbrev=0 2>/dev/null)"
[ -n ${CURRENT_TAG} ] || { echo "Not on a tagged commit. Return to the commit of last release."; exit 1;}

# Compare with target tag
TARGET_TAG=${1}
[ ${TARGET_TAG} != ${CURRENT_TAG} ] || { echo "Cannot deploy to the same commit. Checkout the commit of last relase."; exit 1; }

# Check that we can actually checkout target
git checkout "${TARGET_TAG}" || { echo "No target tag in git"; exit 1;}
git checkout "${CURRENT_TAG}"

# Create snapshot
bash ./backups/create-snapshot.sh

# Take down the app
cd ./infra
docker compose down
cd ../
npx supabase stop

# Checkout target tag
git checkout "${TARGET_TAG}"
npx supabase start
cd ./infra/
docker compose up --build -d

echo "Deployed to version ${TARGET_TAG}"
