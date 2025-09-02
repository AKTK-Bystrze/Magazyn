#!/bin/bash

set -e

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_DIR="/var/backups/magazyn/logs_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "📦 Backing up Docker container logs..."

# Backup web application logs
WEB_CONTAINER=$(docker compose ps -q web)
if [ -n "$WEB_CONTAINER" ]; then
    docker logs "$WEB_CONTAINER" > "$BACKUP_DIR/web.log" 2>&1
    echo "✅ Web logs saved to $BACKUP_DIR/web.log"
else
    echo "⚠️  Web container not running, skipping web logs."
fi

# Backup database logs
DB_CONTAINER=$(docker compose ps -q db)
if [ -n "$DB_CONTAINER" ]; then
    docker logs "$DB_CONTAINER" > "$BACKUP_DIR/db.log" 2>&1
    echo "✅ DB logs saved to $BACKUP_DIR/db.log"
else
    echo "⚠️  DB container not running, skipping db logs."
fi

echo "🗃️  Logs backup completed: $BACKUP_DIR"
