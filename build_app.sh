#!/bin/bash
# build_app.sh

set -e

# --- Build Stage ---
echo "==> Building Go binary..."
export CGO_ENABLED=1
cd src
go mod download
go build -o ../main ./main
cd ..

# --- Production Stage ---
echo "==> Preparing production directory..."
rm -rf app_prod
mkdir -p app_prod/templates

echo "==> Copying binary and templates..."
cp main app_prod/
cp -r src/main/templates/* app_prod/templates/

echo "==> Setting environment variables..."
cat <<EOF > app_prod/.env
MAGAZYN_BYSTRZE_EMAIL_ADDR=${EMAIL}
MAGAZYN_BYSTRZE_EMAIL_PASS=${EMAIL_PASS}
COOKIE_KEY=${COOKIE_KEY}
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
DEBUG=${DEBUG:-True}
DATABASE_URL=${DSN:-postgres://postgres:postgres@localhost:5432/magazyn?sslmode=disable}
IP=0.0.0.0
PORT=8080
SERVER=${SERVER:-http://localhost:8080}
TZ=Europe/Warsaw
EOF

echo "==> Done. Run the app with:"
echo "cd app_prod && export \$(cat .env | xargs) && ./main"