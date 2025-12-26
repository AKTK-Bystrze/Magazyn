#!/bin/bash
#
# deploy.sh - Production Deployment Script
#
# Usage: ./deploy.sh [version]
#   version: Optional git tag/branch to deploy (defaults to latest main)
#
# This script:
# 1. Backs up current running containers
# 2. Pulls latest code from git
# 3. Builds new Docker images
# 4. Stops current containers
# 5. Starts new containers
# 6. Runs health checks
# 7. On failure: automatically rolls back to previous version
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
INFRA_DIR="$PROJECT_ROOT/infra"
COMPOSE_FILE="$INFRA_DIR/docker-compose.prod.yml"
BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
VERSION="${1:-main}"

log_info "========================================="
log_info "  Magazyn Production Deployment"
log_info "========================================="
log_info "Version: $VERSION"
log_info "Project root: $PROJECT_ROOT"
echo

# ------------------------------------------------------------------
# Step 1: Backup current containers
# ------------------------------------------------------------------
log_info "Step 1: Backing up current containers..."

if docker ps --format '{{.Names}}' | grep -q 'magazyn-backend'; then
    docker commit magazyn-backend "magazyn-backend:$BACKUP_TAG" || true
    log_info "Backend backed up as magazyn-backend:$BACKUP_TAG"
else
    log_warn "No running backend container to backup"
fi

if docker ps --format '{{.Names}}' | grep -q 'magazyn-frontend'; then
    docker commit magazyn-frontend "magazyn-frontend:$BACKUP_TAG" || true
    log_info "Frontend backed up as magazyn-frontend:$BACKUP_TAG"
else
    log_warn "No running frontend container to backup"
fi

# Save backup tag for potential rollback
echo "$BACKUP_TAG" > "$INFRA_DIR/.last-backup-tag"
log_info "Backup tag saved: $BACKUP_TAG"
echo

# ------------------------------------------------------------------
# Step 2: Pull latest code
# ------------------------------------------------------------------
log_info "Step 2: Pulling latest code..."
cd "$PROJECT_ROOT"

git fetch origin
git checkout "$VERSION"

if [ "$VERSION" = "main" ]; then
    git pull origin main
fi

log_info "Code updated to: $(git log -1 --oneline)"
echo

# ------------------------------------------------------------------
# Step 3: Build new images
# ------------------------------------------------------------------
log_info "Step 3: Building new Docker images..."

cd "$INFRA_DIR"

# Build with build timestamp for identification
docker compose -f docker-compose.prod.yml build \
    --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --no-cache

log_info "Images built successfully"
echo

# ------------------------------------------------------------------
# Step 4: Stop current containers
# ------------------------------------------------------------------
log_info "Step 4: Stopping current containers..."

docker compose -f docker-compose.prod.yml down --timeout 30 || true

log_info "Containers stopped"
echo

# ------------------------------------------------------------------
# Step 5: Start new containers
# ------------------------------------------------------------------
log_info "Step 5: Starting new containers..."

docker compose -f docker-compose.prod.yml up -d

log_info "Containers started"
echo

# ------------------------------------------------------------------
# Step 6: Health check
# ------------------------------------------------------------------
log_info "Step 6: Running health checks..."

HEALTH_CHECK_PASSED=true
MAX_RETRIES=30

# Wait for backend
log_info "Checking backend health..."
for i in $(seq 1 $MAX_RETRIES); do
    if docker exec magazyn-backend wget -q --spider http://localhost:8080/health 2>/dev/null; then
        log_info "Backend is healthy (attempt $i)"
        break
    fi
    
    if [ "$i" -eq "$MAX_RETRIES" ]; then
        log_error "Backend health check failed after $MAX_RETRIES attempts"
        HEALTH_CHECK_PASSED=false
    fi
    
    sleep 2
done

# Wait for frontend
log_info "Checking frontend health..."
for i in $(seq 1 $MAX_RETRIES); do
    if docker exec magazyn-frontend wget -q --spider http://localhost:4321 2>/dev/null; then
        log_info "Frontend is healthy (attempt $i)"
        break
    fi
    
    if [ "$i" -eq "$MAX_RETRIES" ]; then
        log_error "Frontend health check failed after $MAX_RETRIES attempts"
        HEALTH_CHECK_PASSED=false
    fi
    
    sleep 2
done

echo

# ------------------------------------------------------------------
# Step 7: Handle result
# ------------------------------------------------------------------
if [ "$HEALTH_CHECK_PASSED" = true ]; then
    log_info "========================================="
    log_info "  ✅ Deployment Successful!"
    log_info "========================================="
    log_info "Version: $VERSION"
    log_info "Backup available: $BACKUP_TAG"
    log_info ""
    log_info "To rollback: ./rollback.sh"
    exit 0
else
    log_error "========================================="
    log_error "  ❌ Deployment Failed - Rolling Back"
    log_error "========================================="
    
    # Automatic rollback
    "$SCRIPT_DIR/rollback.sh"
    
    exit 1
fi
