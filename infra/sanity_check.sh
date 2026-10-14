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
CURL_INSECURE=""

if curl -s -f -m 3 http://localhost:8080/health >/dev/null 2>&1; then
  API_BASE="http://localhost:8080"
  ok "Connected directly to Backend at ${API_BASE}"
elif curl -k -s -f -m 3 "https://localhost:${CADDY_PORT}/api/health" >/dev/null 2>&1; then
  API_BASE="https://localhost:${CADDY_PORT}/api"
  CURL_INSECURE="-k"
  ok "Connected via Caddy reverse proxy at ${API_BASE}"
elif curl -k -s -f -m 3 "https://localhost/api/health" >/dev/null 2>&1; then
  API_BASE="https://localhost/api"
  CURL_INSECURE="-k"
  ok "Connected via Caddy reverse proxy at ${API_BASE}"
else
  fail "Could not reach health check on http://localhost:8080/health or via Caddy (:20164 / :443)"
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
AUTH_URL="${PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password"
AUTH_PAYLOAD="{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}"

AUTH_RESP=$(curl -s -w "\n%{http_code}" -X POST "${AUTH_URL}" \
  -H "apikey: ${PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "${AUTH_PAYLOAD}" 2>/dev/null || echo -e "\n000")

HTTP_STATUS=$(echo "${AUTH_RESP}" | tail -n 1)
BODY=$(echo "${AUTH_RESP}" | sed '$d')

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

# Read Equipment
info "Querying equipment list (GET ${API_BASE}/equipment)..."
EQ_RESP=$(curl -s -w "\n%{http_code}" -m 5 ${CURL_INSECURE} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${API_BASE}/equipment" 2>/dev/null || echo -e "\n000")

EQ_STATUS=$(echo "${EQ_RESP}" | tail -n 1)
if [ "$EQ_STATUS" = "200" ]; then
  ok "Equipment list retrieved successfully (HTTP 200)"
else
  fail "Failed to retrieve equipment (HTTP ${EQ_STATUS})"
  exit 1
fi

# Read Credits History
info "Querying credit history (GET ${API_BASE}/credits/history)..."
CRED_RESP=$(curl -s -w "\n%{http_code}" -m 5 ${CURL_INSECURE} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${API_BASE}/credits/history" 2>/dev/null || echo -e "\n000")

CRED_STATUS=$(echo "${CRED_RESP}" | tail -n 1)
if [ "$CRED_STATUS" = "200" ]; then
  ok "Credit history retrieved successfully (HTTP 200)"
else
  fail "Failed to retrieve credit history (HTTP ${CRED_STATUS})"
  exit 1
fi

# Read User Profile
info "Querying user profile (GET ${API_BASE}/users/me)..."
ME_RESP=$(curl -s -w "\n%{http_code}" -m 5 ${CURL_INSECURE} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${API_BASE}/users/me" 2>/dev/null || echo -e "\n000")

ME_STATUS=$(echo "${ME_RESP}" | tail -n 1)
if [ "$ME_STATUS" = "200" ]; then
  ok "User profile retrieved successfully (HTTP 200)"
else
  fail "Failed to retrieve user profile (HTTP ${ME_STATUS})"
  exit 1
fi

# Logout session
info "Revoking session (POST ${API_BASE}/auth/logout)..."
curl -s -m 5 -X POST ${CURL_INSECURE} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${API_BASE}/auth/logout" >/dev/null 2>&1 || true
ok "Session logged out cleanly"

echo "=============================================="
echo -e "${GREEN}All sanity checks passed successfully!${NC}"
exit 0
