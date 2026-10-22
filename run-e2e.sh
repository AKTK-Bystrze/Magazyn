#!/bin/bash
# =============================================================================
# Local E2E CI Simulation Script
# 
# Automates the setup, execution, and teardown of the E2E test environment
# exactly as it runs in GitHub Actions.
# =============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  echo "🧹 Cleaning up environment..."
  cd "$ROOT_DIR/infra" && docker compose --env-file ../.env down -v 2>/dev/null || true
  cd "$ROOT_DIR" && npx supabase stop 2>/dev/null || true
}
trap cleanup EXIT

echo "🚀 Starting Local CI Simulation..."

# 1. Start Supabase Local
echo "📦 Starting Supabase..."
cd "$ROOT_DIR"
npx supabase start

# 2. Start Docker Compose Stack
echo "🐳 Starting Docker Stack..."
cd "$ROOT_DIR/infra"
docker compose --env-file ../.env up -d --build --wait

# 3. Run Playwright Tests
echo "🎭 Running Playwright Tests..."
cd "$ROOT_DIR/frontend"

# Override environment variables for Playwright running on host OS
export PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export E2E_BASE_URL=http://localhost

npx playwright test --workers=4 --retries=0
echo "✅ E2E Simulation completed successfully!"
