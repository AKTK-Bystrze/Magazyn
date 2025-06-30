#!/bin/bash

set -e

# 1. Determine new tag
echo "📌 Searching for the latest tag..."
LAST_TAG=$(git tag --sort=-v:refname | grep '^v' | head -n 1)
echo "🔍 Latest tag: ${LAST_TAG:-none}"

# Version parsing
if [[ -z "$LAST_TAG" ]]; then
  NEW_TAG="v1.0.0"
else
  IFS='.' read -r major minor patch <<< "${LAST_TAG#v}"
  patch=$((patch + 1))
  NEW_TAG="v$major.$minor.$patch"
fi

echo "🏷️ New tag: $NEW_TAG"
export IMAGE_TAG=$NEW_TAG

# 2. Build Docker images with the version tag
echo "🔧 Building images with tag $NEW_TAG..."

docker build -f db-dockerfile -t bystrze-magazyn-db:$NEW_TAG .
docker build -f app-dockerfile -t bystrze-magazyn-app:$NEW_TAG .

echo "✅ Images built: bystrze-magazyn-db:$NEW_TAG and bystrze-magazyn-app:$NEW_TAG"

# 3. Backup PostgreSQL database
echo "💾 Backing up PostgreSQL database..."
export PATH=/usr/pgsql-17/bin:$PATH
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="/var/backups/magazyn/_$TIMESTAMP.sql"

# Set your connection details
PG_USER="postgres"
PG_PASSWORD="postgres"
PG_HOST="localhost"
PG_PORT="54320"
PG_DB="magazyn"

export PGPASSWORD=$PG_PASSWORD
pg_dump -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -F c -b -v -f "$BACKUP_FILE" "$PG_DB"

echo "✅ Backup saved as $BACKUP_FILE"

# 4. Migrate database schema
echo "🔄 Migrating database schema..."
if ! docker compose run --rm migrate; then
  echo "❌ Migration failed!"
  exit 1
fi

# 5. Deployment — replace images without stopping service
echo "🚀 Deploying containers..."

docker compose -f compose.yml up -d --build

echo "✅ Deployment finished with version $NEW_TAG"

# 6. Create Git tag only if everything succeeded
git tag "$NEW_TAG"
git push origin "$NEW_TAG"
echo "✅ Created and pushed tag $NEW_TAG"
