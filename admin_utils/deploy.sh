#!/bin/bash

# We use set -e at the beginning, but critical steps will be wrapped in conditional blocks
# to control the rollback process.
set -e

# --- Global Variables for Rollback ---
# Ensure these variables are defined and used in compose.yml
# e.g., image: bystrze-magazyn-db:${IMAGE_TAG}
LAST_TAG=""
NEW_TAG=""
BACKUP_FILE=""

# DB Connection Settings (Used by pg_dump on the HOST machine)
PG_USER="postgres"
PG_PASSWORD="postgres"
PG_HOST="localhost" # Uses port 54320 mapped to 127.0.0.1 on the host
PG_PORT="54320" 
PG_DB="magazyn"

# --- Error Handling and Rollback Functions ---

# 1. Function to restore the DB schema from backup
rollback_db_schema() {
    echo "🚨 Database schema failed! Starting rollback from backup..."
    if [[ -z "$BACKUP_FILE" ]]; then
        echo "❌ Error: Backup file not defined. Cannot restore."
        return 1
    fi
    
    # 1. Stop and remove the failed DB container ('db' service)
    docker compose stop db
    docker compose rm -f db
    
    # 2. Start the stable DB container with LAST_TAG (the one that was working)
    echo "🔄 Restarting DB container ('db' service) with LAST_TAG: $LAST_TAG"
    IMAGE_TAG=$LAST_TAG docker compose up -d --no-build db
    
    # Wait for the DB to start
    sleep 10 
    
    # Set PGPASSWORD variable for host connections
    export PGPASSWORD=$PG_PASSWORD

    # 3. Critical step: Clear the public schema before restoring
    # Requires 'psql' client installed locally
    echo "⏳ Cleaning existing 'public' schema in database $PG_DB..."
    if ! psql -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -d "$PG_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"; then
        echo "❌ CRITICAL ERROR: Cleaning the public schema failed!"
        exit 1
    fi
    echo "✅ Public schema cleaned successfully."
    
    # 4. Restore data using pg_restore on the host
    echo "⏳ Restoring data from $BACKUP_FILE (without creating/dropping the database)..."
    # NOTE: The -c (clean) flag was removed because the 'public' schema was already dropped
    # and recreated by the preceding psql command. 
    if pg_restore -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -d "$PG_DB" "$BACKUP_FILE"; then
        echo "✅ Data restoration completed successfully!"
        # After successful DB rollback, the script exits, signaling deployment failure
        exit 1 
    else
        echo "❌ CRITICAL ERROR: Restoring data from backup ($BACKUP_FILE) failed!"
        exit 1 # Critical error, should be reported immediately
    fi
}

# 2. Function to rollback containers to LAST_TAG state
rollback_containers() {
    echo "🚨 Container deployment failed! Rolling back to previous version: $LAST_TAG..."
    
    if [[ -z "$LAST_TAG" ]]; then
        echo "❌ Error: LAST_TAG is not defined. Cannot roll back."
        return 1
    fi

    echo "🔄 Starting containers with LAST_TAG: $LAST_TAG..."
    # Use the previous tag and force recreation of containers
    # Remember that services in compose.yml are 'db' and 'web'
    IMAGE_TAG=$LAST_TAG docker compose -f compose.yml up -d --force-recreate
    
    if [ $? -eq 0 ]; then
        echo "✅ Rollback to version $LAST_TAG successful."
    else
        echo "❌ CRITICAL ERROR: Automatic rollback failed. Manual intervention required."
    fi
    
    exit 1 # End script execution after failed deployment
}

# 3. Main error cleanup function
cleanup_on_failure() {
    # This function is called when any command fails,
    # if it wasn't handled locally (e.g., in an if/else block).
    
    # Since critical errors (migration, deployment) are handled locally
    # (with an exit 1 call in their body), this function is mainly for unexpected
    # errors (e.g., build image error).
    
    # Check the exit code of the last command
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
        echo "💥 An unexpected error occurred. Error details: $EXIT_CODE."
    fi
}

# Set a trap to call the function in case of error
trap cleanup_on_failure ERR

# ---------------------------------------------------------------------
# 1. Check branch and determine tags
# ---------------------------------------------------------------------
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "⚠️ You are on branch '$CURRENT_BRANCH', not 'main'."
  read -p "Do you want to deploy from this branch? (y/N): " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
  fi
fi

echo "📌 Searching for the last tag..."
LAST_TAG=$(git tag --sort=-v:refname | grep '^v' | head -n 1)
echo "🔍 Last working tag: ${LAST_TAG:-none}"

if [[ -z "$LAST_TAG" ]]; then
  NEW_TAG="v1.0.0"
else
  # Use simple tag increment logic
  # Assume LAST_TAG has the format vX.Y.Z
  IFS='.' read -r major minor patch <<< "${LAST_TAG#v}"
  patch=$((patch + 1))
  NEW_TAG="v$major.$minor.$patch"
fi

echo "🏷️ New tag: $NEW_TAG"
# Set the environment variable for new images
export IMAGE_TAG=$NEW_TAG

# ---------------------------------------------------------------------
# 2. Build Images
# ---------------------------------------------------------------------
echo "🔧 Building images with tag $NEW_TAG..."

docker build -f db-dockerfile -t bystrze-magazyn-db:$NEW_TAG .
docker build -f app-dockerfile -t bystrze-magazyn-app:$NEW_TAG .

echo "✅ Images built: bystrze-magazyn-db:$NEW_TAG and bystrze-magazyn-app:$NEW_TAG"

# ---------------------------------------------------------------------
# 3. Backup PostgreSQL database (Critical step before migration)
# ---------------------------------------------------------------------
echo "💾 Creating PostgreSQL database backup..."
# Ensure that PATH contains pg_dump or pg_dump is available.
# Connection settings (PG_USER, PG_PASSWORD, PG_HOST, PG_PORT, PG_DB are defined at the top of the script)

# Set backup path
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
# Global variable for rollback
BACKUP_FILE="/tmp/magazyn_backup_$TIMESTAMP.sql" # Use a path accessible on the host

export PGPASSWORD=$PG_PASSWORD

# Ensure pg_dump is installed on the host
if ! command -v pg_dump &> /dev/null; then
    echo "❌ Error: pg_dump not found in PATH. Script aborted."
    exit 1
fi

# pg_dump command
pg_dump -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -F c -b -v -f "$BACKUP_FILE" "$PG_DB"

echo "✅ Backup saved as $BACKUP_FILE"

# ---------------------------------------------------------------------
# 4. Database Schema Migration (DB Rollback Point)
# ---------------------------------------------------------------------
echo "🔄 Migrating database schema..."
# Ensure the 'migrate' service is configured to use the 'db' service (it is!)
if ! docker compose run --rm migrate; then
  # If migration fails, call the schema rollback function
  rollback_db_schema
fi

echo "✅ Schema migration completed successfully!"

# ---------------------------------------------------------------------
# 5. Deployment (Container Rollback Point)
# ---------------------------------------------------------------------
echo "🚀 Deploying new containers (services: db and web) with tag $NEW_TAG..."

# Deploy, using IMAGE_TAG ($NEW_TAG) set as an environment variable
# Force recreation to use the new image
if ! docker compose -f compose.yml up -d --force-recreate; then
    # If deployment fails (e.g., new DB container does not start)
    rollback_containers
fi

# Quick verification (optional but recommended)
echo "⏳ Checking container status..."
# Search for 'db' and 'web' services
# Fixed syntax error by grouping the pipe in a subshell and adding -q
if ! (docker compose ps | grep -E 'db|web' | grep -q 'running'); then
    echo "❌ ERROR: New containers (db or web) are not in 'running' state after deployment."
    rollback_containers
fi

echo "✅ Deployment completed with version $NEW_TAG"

# ---------------------------------------------------------------------
# 6. Finalization - Create Git Tag (ONLY if everything succeeded)
# ---------------------------------------------------------------------
echo "🏷️ Finalizing and creating Git tag..."
git tag "$NEW_TAG"
git push origin "$NEW_TAG"
echo "✅ Tag $NEW_TAG created and pushed"
