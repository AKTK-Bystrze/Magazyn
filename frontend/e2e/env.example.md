# E2E Testing Environment Variables
# These variables should be added to the root .env file

# =============================================================================
# E2E Testing Configuration
# =============================================================================

# Base URL for e2e tests (default: localhost:4321)
E2E_BASE_URL=http://localhost:4321

# Test user email (must exist in Supabase)
E2E_TEST_EMAIL=your-test-user@example.com

# Note: The following variables should already be in your .env:
# - VITE_SUPABASE_URL or SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY (required for admin session creation)
