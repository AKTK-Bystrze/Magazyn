#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
ROOT_DIR="${MAGAZYN_ROOT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || realpath "${SCRIPT_DIR}/..")}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "  [${GREEN}OK${NC}] $1"; }
warn() { echo -e "  [${YELLOW}WARN${NC}] $1"; }
fail() { echo -e "  [${RED}FAIL${NC}] $1"; }
info() { echo -e "${BLUE}==>${NC} $1"; }

HAS_ERRORS=0

echo "=============================================="
echo "        Magazyn System Diagnostics (Doctor)   "
echo "=============================================="

# 1. Environment Check
info "Checking environment configuration..."
if [ ! -f "${ROOT_DIR}/.env" ]; then
  fail ".env file missing at ${ROOT_DIR}/.env"
  HAS_ERRORS=1
else
  ok ".env file found"
  set -a
  source <(sed 's/\r$//' "${ROOT_DIR}/.env")
  set +a

  for var in PUBLIC_SUPABASE_URL PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY DB_CONNECTION_STRING; do
    if [ -z "${!var:-}" ]; then
      fail "Missing required environment variable: $var"
      HAS_ERRORS=1
    else
      ok "Variable set: $var"
    fi
  done
fi

# 2. Disk Space Check
info "Checking disk space..."
if command -v df >/dev/null 2>&1; then
  AVAIL_MB=$(df -m "${ROOT_DIR}" | awk 'NR==2 {print $4}')
  if [ "$AVAIL_MB" -lt 3000 ]; then
    warn "Low disk space: ${AVAIL_MB} MB available (recommended: >= 3000 MB). Run './admin.sh prune' to free space."
  else
    ok "Sufficient disk space: ${AVAIL_MB} MB available"
  fi
else
  warn "Unable to verify disk space (df not found)"
fi

# 3. Docker Daemon Check
info "Checking Docker daemon..."
if ! command -v docker >/dev/null 2>&1; then
  fail "Docker CLI is not installed"
  HAS_ERRORS=1
elif ! docker info >/dev/null 2>&1; then
  fail "Docker daemon is not running or accessible by current user"
  HAS_ERRORS=1
else
  ok "Docker daemon is operational"
fi

# 4. Database Connection Check
info "Checking PostgreSQL database connectivity..."
if [ -n "${DB_CONNECTION_STRING:-}" ] && command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if docker run --rm --network host postgres:17.6 pg_isready -d "${DB_CONNECTION_STRING}" >/dev/null 2>&1; then
    ok "Database connection successful"
  else
    fail "Database is unreachable via DB_CONNECTION_STRING"
    HAS_ERRORS=1
  fi
else
  warn "Skipping database ping (Docker or DB_CONNECTION_STRING missing)"
fi

# 5. Service Containers & Ingress Health
info "Checking running containers and endpoints..."
cd "${ROOT_DIR}/infra"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker compose ps || true

  CADDY_PORT="${CADDY_PORT:-20164}"

  # Backend health check (direct port 8080, Caddy /api/health, or Docker internal health)
  if curl -s -f -m 3 http://localhost:8080/health >/dev/null 2>&1; then
    ok "Backend responsive on http://localhost:8080/health"
  elif curl -k -s -f -m 3 "https://localhost:${CADDY_PORT}/api/health" >/dev/null 2>&1; then
    ok "Backend responsive via Caddy proxy (https://localhost:${CADDY_PORT}/api/health)"
  elif [ "$(docker inspect -f '{{.State.Health.Status}}' magazyn-backend 2>/dev/null)" = "healthy" ]; then
    ok "Backend container internal health is healthy"
  else
    warn "Backend container health endpoint is not responding"
  fi

  # Frontend / Caddy proxy check
  if curl -k -s -m 3 "https://localhost:${CADDY_PORT}/login" >/dev/null 2>&1; then
    ok "Caddy & Frontend responsive (https://localhost:${CADDY_PORT}/login)"
  elif curl -s -f -m 3 http://localhost:4321 >/dev/null 2>&1; then
    ok "Frontend responsive on port 4321"
  elif [ "$(docker inspect -f '{{.State.Health.Status}}' magazyn-caddy 2>/dev/null)" = "healthy" ]; then
    ok "Caddy container internal health is healthy"
  else
    warn "Caddy reverse proxy is not responding"
  fi
fi

echo "=============================================="
if [ "$HAS_ERRORS" -eq 0 ]; then
  echo -e "${GREEN}All essential system checks passed!${NC}"
  exit 0
else
  echo -e "${RED}Diagnostics encountered issues. See warnings/failures above.${NC}"
  echo "Refer to documentation/operations/recovery_playbook.md for troubleshooting."
  exit 1
fi
