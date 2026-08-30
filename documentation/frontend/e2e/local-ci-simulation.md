# Simulating GitHub Actions E2E Tests Locally

This guide explains how to run the End-to-End (E2E) tests on your local machine *exactly* as they run in the GitHub Actions CI environment.

---

## Step-by-Step Instructions

Follow these steps to replicate the CI environment:

### 1. Ensure `host.docker.internal` Resolves

The backend Docker container needs to communicate with the Supabase instance running on your host machine. 

* **Windows / macOS (Docker Desktop):** This resolves automatically inside Docker, but Playwright running on your host OS will resolve it to your LAN IP instead of localhost. We will bypass this issue in Step 5 by overriding the URL specifically for Playwright.
* **Linux:** You must add it to your `/etc/hosts` file manually (this is exactly what the GitHub Action does).
  ```bash
  echo "127.0.0.1 host.docker.internal" | sudo tee -a /etc/hosts
  ```

### 2. Configure the `.env` File for CI Mode

Your local `.env` file must use the Docker internal network URL for Supabase, rather than `127.0.0.1`.

Modify or create your `.env` in the project root with these precise values:

```env
# 1. Use host.docker.internal so the dockerized backend can reach the local Supabase
PUBLIC_SUPABASE_URL=http://host.docker.internal:54321

# 2. Standard local Supabase keys
PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# 3. Application networking configuration
PUBLIC_BACKEND_URL=http://localhost/api
PUBLIC_APP_URL=http://localhost
CADDY_FILE=Caddyfile.test
CADDY_PORT=80
E2E_BASE_URL=http://localhost
PORT=8080
CORS_ALLOWED_ORIGINS=http://localhost
```

### 3. Start Local Supabase

Start the local database instance and apply all migrations/seeds:

```bash
npx supabase start
```

### 4. Build and Deploy the Docker Stack

Build the images and spin up the frontend, backend, and Caddy server. Ensure you use the `--env-file` flag to inject your CI `.env` variables.

```bash
cd infra
docker compose --env-file ../.env build
docker compose --env-file ../.env up -d
```

*Wait for all services to become healthy before proceeding.* You can check health status with:
```bash
docker compose --env-file ../.env ps
```

### 5. Run the E2E Tests

Switch to the frontend directory and execute the Playwright test suite. 

**Important:** Because Playwright runs directly on your host OS (not inside Docker) and loads `.env.test` by default, you **must** override `PUBLIC_SUPABASE_URL` to point to localhost, and `E2E_BASE_URL` to match the Caddy port configuration from step 2.

Run the exact command for your operating system:

**Windows (CMD):**
```cmd
cd ../frontend
set PUBLIC_SUPABASE_URL=http://127.0.0.1:54321&& set E2E_BASE_URL=http://localhost&& npx playwright test --workers=4 --retries=0
```

**Windows (PowerShell):**
```powershell
cd ../frontend
$env:PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"; $env:E2E_BASE_URL="http://localhost"; npx playwright test --workers=4 --retries=0
```

**Linux / macOS:**
```bash
cd ../frontend
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 E2E_BASE_URL=http://localhost npx playwright test --workers=4 --retries=0
```

> **Note:** CI runs tests in headless mode by default. If you need to debug a failing CI test visually, you can append `--ui` to the command above.

### 6. Clean Up

To fully replicate the CI teardown process, destroy the Docker Compose stack and its volumes:

```bash
cd ../infra
docker compose --env-file ../.env down -v
```

If you no longer need the local Supabase instance:
```bash
cd ..
npx supabase stop
```
