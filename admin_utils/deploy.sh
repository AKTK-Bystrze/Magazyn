#!/bin/bash

# We use set -e at the beginning, but critical steps will be wrapped in conditional blocks
# to control the rollback process.
set -e

# --- Global Variables for Rollback ---
LAST_TAG=""
NEW_TAG=""
BACKUP_FILE=""
PG_USER="postgres"
PG_PASSWORD="postgres"
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
    echo "⬇️ Stopping and removing failed 'db' container..."
    docker compose stop db
    docker compose rm -f db
    
    # 2. Start the stable DB container with LAST_TAG (the one that was working)
    echo "🔄 Restarting DB container ('db' service) with LAST_TAG: $LAST_TAG"
    IMAGE_TAG=$LAST_TAG docker compose up -d --no-build db
    
    # Wait for the DB to start
    echo "⏳ Waiting 15 seconds for the database to become available..."
    sleep 15
    
    # Check if the backup file exists
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "❌ CRITICAL ERROR: Backup file $BACKUP_FILE not found on host. Cannot proceed with restore."
        exit 1
    fi

    # 3. Restore data using pg_restore *inside* the running 'db' container by piping the file in
    echo "⏳ Restoring data from $BACKUP_FILE (via containerized pg_restore)..."
    
    # We use 'cat' on the host to pipe the backup file content to the 'pg_restore' process 
    # running inside the container via 'docker compose exec'.
    # -e PGPASSWORD: passes the password environment variable to the container process.
    # -T: disables pseudo-TTY allocation (required for piping).
    # -c: instructs pg_restore to 'clean' (drop) objects before restoring them (schema cleanup + restore in one step).
    # -: means pg_restore reads from standard input (the pipe).
    if cat "$BACKUP_FILE" | docker compose exec -e PGPASSWORD="$PG_PASSWORD" -T db \
        pg_restore -U "$PG_USER" -h localhost -p 5432 -d "$PG_DB" -c -F c -v -; then 

        echo "✅ Data restoration completed successfully!"
        # Exit with failure status to signal the deployment process failed overall
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
    # This function is called when any command fails, if it wasn't handled locally.
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
        echo "💥 An unexpected error occurred during an initial step. Error code: $EXIT_CODE."
    fi
}

# Set a trap to call the function in case of error
# NOTE: The critical steps (rollback_db_schema and rollback_containers) call exit 1, 
# preventing cleanup_on_failure from running for those handled errors.
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
    IFS='.' read -r major minor patch <<< "${LAST_TAG#v}"
    patch=$((patch + 1))
    NEW_TAG="v$major.$minor.$patch"
fi

echo "🏷️ New tag: $NEW_TAG"
# Set the environment variable for new images
export IMAGE_TAG=$NEW_TAG
# IMPORTANT: Update LAST_TAG globally for functions that might use it
if [[ -z "$LAST_TAG" ]]; then
    LAST_TAG=$NEW_TAG # If no previous tag, use the new one for a theoretical rollback reference
fi


# ---------------------------------------------------------------------
# 2. Build Images
# ---------------------------------------------------------------------
echo "🔧 Building images with tag $NEW_TAG..."

docker build -f db-dockerfile -t bystrze-magazyn-db:$NEW_TAG .
docker build -f app-dockerfile -t bystrze-magazyn-app:$NEW_TAG .

echo "✅ Images built: bystrze-magazyn-db:$NEW_TAG and bystrze-magazyn-app:$NEW_TAG"

# ---------------------------------------------------------------------
# 3. Backup PostgreSQL database (Critical step before migration)
#    *** NOW USES CONTAINERIZED PG_DUMP ***
# ---------------------------------------------------------------------
echo "💾 Creating PostgreSQL database backup..."

# Set backup path
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
# Global variable for rollback
BACKUP_FILE="/tmp/magazyn_backup_$TIMESTAMP.sql" # Use a path accessible on the host

# Check if 'db' container is running (it should be the previously deployed stable version)
if ! docker compose ps -q db | grep -q .; then
    echo "❌ Error: The 'db' service is not currently running. Cannot create a backup of the existing data."
    exit 1
fi

# NOTE: We run pg_dump *inside* the running 'db' container and pipe the output to a file on the host.
echo "⏳ Running pg_dump inside the running 'db' container..."

# We use PGPASSWORD environment variable passed via the -e flag for non-interactive connection.
# The container connects internally using localhost and port 5432.
if docker compose exec -e PGPASSWORD="$PG_PASSWORD" db \
    pg_dump -U "$PG_USER" -h localhost -p 5432 -F c -b -v "$PG_DB" > "$BACKUP_FILE"; then

    echo "✅ Backup saved as $BACKUP_FILE"
else
    echo "❌ CRITICAL ERROR: Database backup failed using docker compose exec. Script aborted."
    # We do not call rollback here, as the migration hasn't started yet.
    exit 1
fi

# ---------------------------------------------------------------------
# 4. Database Schema Migration (DB Rollback Point)
# ---------------------------------------------------------------------
echo "🔄 Migrating database schema..."
# Ensure the 'migrate' service is configured to use the 'db' service (it is!)
if ! docker compose run --rm migrate; then
    # If migration fails, call the schema rollback function
    rollback_db_schema # This function will exit 1
fi

echo "✅ Schema migration completed successfully!"

# ---------------------------------------------------------------------
# 5. Deployment (Container Rollback Point)
# ---------------------------------------------------------------------
echo "🚀 Deploying new containers (services: db and web) with tag $NEW_TAG..."

# Deploy, using IMAGE_TAG ($NEW_TAG) set as an environment variable
if ! docker compose -f compose.yml up -d --force-recreate; then
    # If deployment fails (e.g., new DB container does not start)
    rollback_containers # This function will exit 1
fi

# Quick verification (optional but recommended)
echo "⏳ Checking container status..."
# Check for 'running' state for 'db' and 'web' services
if ! docker compose ps | grep -E 'db|web' | grep -q 'running'; then
    echo "❌ ERROR: New containers (db or web) are not in 'running' state after deployment."
    rollback_containers # This function will exit 1
fi

echo "✅ Deployment completed with version $NEW_TAG"

# ---------------------------------------------------------------------
# 6. Finalization - Create Git Tag (ONLY if everything succeeded)
# ---------------------------------------------------------------------
echo "🏷️ Finalizing and creating Git tag..."
git tag "$NEW_TAG"
git push origin "$NEW_TAG"
echo "✅ Tag $NEW_TAG created and pushed"
