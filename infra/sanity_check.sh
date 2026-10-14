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

if [ ! -f "${ROOT_DIR}/.env" ]; then
  echo "Error: .env not found at ${ROOT_DIR}/.env" >&2
  exit 1
fi

set -a
source <(sed 's/\r$//' "${ROOT_DIR}/.env")
set +a

CADDY_PORT="${CADDY_PORT:-20164}"

echo "=============================================="
echo "          Magazyn Sanity Verification         "
echo "=============================================="

# 1. Determine reachable API endpoint
info "Detecting API ingress endpoint..."
API_BASE=""
CURL_OPTS=()

if curl -s -f -m 3 http://localhost:8080/health >/dev/null 2>&1; then
  API_BASE="http://localhost:8080"
  ok "Connected directly to Backend at ${API_BASE}"
elif curl -k -s -f -m 3 "https://localhost:${CADDY_PORT}/api/health" >/dev/null 2>&1; then
  API_BASE="https://localhost:${CADDY_PORT}/api"
  CURL_OPTS=(-k)
  ok "Connected via Caddy reverse proxy at ${API_BASE}"
else
  fail "Could not reach health check on http://localhost:8080/health or via Caddy (:${CADDY_PORT})"
  exit 1
fi

# 2. Authenticated Read Flow
TEST_EMAIL="${SANITY_TEST_USER_EMAIL:-}"
TEST_PASSWORD="${SANITY_TEST_USER_PASSWORD:-}"

if [ -z "$TEST_EMAIL" ] || [ -z "$TEST_PASSWORD" ]; then
  warn "SANITY_TEST_USER_EMAIL or SANITY_TEST_USER_PASSWORD not set in .env."
  warn "Skipping authenticated read checks (equipment, credits, profile)."
  echo "Tip: Set SANITY_TEST_USER_EMAIL and SANITY_TEST_USER_PASSWORD in .env for full post-deploy verification."
  echo "=============================================="
  echo -e "${GREEN}Basic health checks passed!${NC}"
  exit 0
fi

info "Authenticating test user (${TEST_EMAIL}) against Supabase Auth..."
# NOTE: AUTH_URL intentionally uses PUBLIC_SUPABASE_URL (not INTERNAL_SUPABASE_URL) because
# this script runs on the host, not inside a Docker container.
AUTH_URL="${PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password"
AUTH_PAYLOAD=$(jq -n --arg email "${TEST_EMAIL}" --arg password "${TEST_PASSWORD}" \
  '{"email":$email,"password":$password}')

TMP_BODY=$(mktemp)
HTTP_STATUS=$(curl -s -m 10 -X POST "${AUTH_URL}" \
  -H "apikey: ${PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "${AUTH_PAYLOAD}" \
  -o "${TMP_BODY}" \
  -w "%{http_code}" 2>/dev/null || echo "000")
BODY=$(cat "${TMP_BODY}")
rm -f "${TMP_BODY}"

if [ "$HTTP_STATUS" != "200" ]; then
  fail "Authentication failed for ${TEST_EMAIL} (HTTP ${HTTP_STATUS})"
  echo "Response: ${BODY}"
  exit 1
fi

ACCESS_TOKEN=$(echo "${BODY}" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p' | head -n 1)

if [ -z "$ACCESS_TOKEN" ]; then
  fail "Could not extract access_token from Supabase Auth response"
  exit 1
fi
ok "Successfully logged in and retrieved JWT access token"

# Verify Authenticated Endpoints (equipment, credits history, user profile)
for ep in "equipment" "credits/history" "users/me"; do
  info "Querying ${ep} (GET ${API_BASE}/${ep})..."
  TMP_EP=$(mktemp)
  STATUS=$(curl -s -m 5 "${CURL_OPTS[@]}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -o "${TMP_EP}" \
    -w "%{http_code}" \
    "${API_BASE}/${ep}" 2>/dev/null || echo "000")
  rm -f "${TMP_EP}"
  if [ "$STATUS" = "200" ]; then
    ok "${ep} retrieved successfully (HTTP 200)"
  else
    fail "Failed to retrieve ${ep} (HTTP ${STATUS})"
    exit 1
  fi
done

# Logout session
info "Revoking session (POST ${API_BASE}/auth/logout)..."
curl -s -m 5 -X POST "${CURL_OPTS[@]}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${API_BASE}/auth/logout" >/dev/null 2>&1 || true
ok "Session logged out cleanly"

echo "=============================================="
echo -e "${GREEN}All sanity checks passed successfully!${NC}"
exit 0
