#!/bin/bash
#
# rollback.sh - Emergency Rollback Script
#
# Usage: ./rollback.sh [backup-tag]
#   backup-tag: Optional specific backup to restore (defaults to last backup)
#
# This script:
# 1. Stops current containers
# 2. Restores from backup images
# 3. Starts restored containers
# 4. Runs health checks
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
INFRA_DIR="$PROJECT_ROOT/infra"
COMPOSE_FILE="$INFRA_DIR/docker-compose.prod.yml"
BACKUP_TAG_FILE="$INFRA_DIR/.last-backup-tag"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments or read from file
if [ -n "${1:-}" ]; then
    BACKUP_TAG="$1"
elif [ -f "$BACKUP_TAG_FILE" ]; then
    BACKUP_TAG=$(cat "$BACKUP_TAG_FILE")
else
    log_error "No backup tag specified and no .last-backup-tag file found"
    log_error "Usage: ./rollback.sh [backup-tag]"
    log_error ""
    log_error "Available backup images:"
    docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "^magazyn-.+:backup-" || echo "  (none found)"
    exit 1
fi

log_info "========================================="
log_info "  Magazyn Emergency Rollback"
log_info "========================================="
log_info "Restoring to backup: $BACKUP_TAG"
echo

# ------------------------------------------------------------------
# Step 1: Verify backup images exist
# ------------------------------------------------------------------
log_info "Step 1: Verifying backup images..."

BACKEND_IMAGE="magazyn-backend:$BACKUP_TAG"
FRONTEND_IMAGE="magazyn-frontend:$BACKUP_TAG"

if ! docker image inspect "$BACKEND_IMAGE" > /dev/null 2>&1; then
    log_error "Backend backup image not found: $BACKEND_IMAGE"
    exit 1
fi

if ! docker image inspect "$FRONTEND_IMAGE" > /dev/null 2>&1; then
    log_error "Frontend backup image not found: $FRONTEND_IMAGE"
    exit 1
fi

log_info "Backup images verified"
echo

# ------------------------------------------------------------------
# Step 2: Stop current containers
# ------------------------------------------------------------------
log_info "Step 2: Stopping current containers..."

docker stop magazyn-backend magazyn-frontend magazyn-caddy 2>/dev/null || true
docker rm magazyn-backend magazyn-frontend 2>/dev/null || true

log_info "Containers stopped and removed"
echo

# ------------------------------------------------------------------
# Step 3: Start from backup images
# ------------------------------------------------------------------
log_info "Step 3: Starting containers from backup images..."

cd "$INFRA_DIR"

# Start backend from backup
docker run -d \
    --name magazyn-backend \
    --network magazyn-network \
    --env-file "$INFRA_DIR/.env" \
    --restart always \
    "$BACKEND_IMAGE"

# Start frontend from backup
docker run -d \
    --name magazyn-frontend \
    --network magazyn-network \
    --env-file "$INFRA_DIR/.env" \
    -e HOST=0.0.0.0 \
    -e PORT=4321 \
    -e INTERNAL_BACKEND_URL=http://backend:8080 \
    --restart always \
    "$FRONTEND_IMAGE"

# Restart Caddy if needed
docker start magazyn-caddy 2>/dev/null || true

log_info "Containers started from backup"
echo

# ------------------------------------------------------------------
# Step 4: Health check
# ------------------------------------------------------------------
log_info "Step 4: Running health checks..."

MAX_RETRIES=30

# Wait for backend
for i in $(seq 1 $MAX_RETRIES); do
    if docker exec magazyn-backend wget -q --spider http://localhost:8080/health 2>/dev/null; then
        log_info "Backend is healthy (attempt $i)"
        break
    fi
    
    if [ "$i" -eq "$MAX_RETRIES" ]; then
        log_error "Backend health check failed - manual intervention required"
        exit 1
    fi
    
    sleep 2
done

# Wait for frontend
for i in $(seq 1 $MAX_RETRIES); do
    if docker exec magazyn-frontend wget -q --spider http://localhost:4321 2>/dev/null; then
        log_info "Frontend is healthy (attempt $i)"
        break
    fi
    
    if [ "$i" -eq "$MAX_RETRIES" ]; then
        log_error "Frontend health check failed - manual intervention required"
        exit 1
    fi
    
    sleep 2
done

echo
log_info "========================================="
log_info "  ✅ Rollback Successful!"
log_info "========================================="
log_info "Restored to: $BACKUP_TAG"
log_info ""
log_info "Note: Database migrations were NOT reverted."
log_info "If needed, restore database from backup manually."
