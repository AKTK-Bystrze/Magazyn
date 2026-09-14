cd infra
docker compose --env-file ../.env up -d --build
timeout /t 30
cd ../frontend
set PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
set E2E_BASE_URL=http://localhost
call npx playwright test --workers=4 --retries=0
cd ../infra
docker compose --env-file ../.env down -v
