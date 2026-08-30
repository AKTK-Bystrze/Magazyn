#!/bin/bash
# =============================================================================
# Local E2E CI Simulation Script
# 
# Automates the setup, execution, and teardown of the E2E test environment
# exactly as it runs in GitHub Actions.
# =============================================================================

set -e # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting Local CI Simulation..."

# 1. Start Supabase Local
echo "📦 Starting Supabase..."
npx supabase start

# 2. Start Docker Compose Stack
echo "🐳 Starting Docker Stack..."
cd infra
docker compose --env-file ../.env up -d --build

# Wait for Caddy to be healthy to ensure the stack is fully up
echo "⏳ Waiting for services to become healthy..."
sleep 30

# 3. Run Playwright Tests
echo "🎭 Running Playwright Tests..."
cd ../frontend

# Override environment variables for Playwright running on the host OS
# This ensures it connects to the local Supabase and Caddy instances correctly
export PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export E2E_BASE_URL=http://localhost

# Run the tests and capture the exit code so we can still clean up if they fail
set +e
npx cross-env E2E_BASE_URL="http://localhost" PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" npx playwright test --workers=4 --retries=0
EXIT_CODE=$?
set -e

# 4. Cleanup
echo "🧹 Cleaning up environment..."
cd ../infra
docker compose --env-file ../.env down -v

cd ..
npx supabase stop

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ E2E Simulation completed successfully!"
else
  echo "❌ E2E Simulation failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
