# Project Structure Plan (Final Recommended Version)

This document describes the finalized project structure for the Magazyn application, incorporating the recommended improvements. The architecture follows a clean monorepo pattern, separating frontend, backend, infrastructure, and database management.

---

## 📦 Repository Overview

```
Magazyn/
├── frontend/              # Astro + React frontend application
├── backend/               # Go API backend (stateless business logic)
├── infra/                 # Docker, Caddy, deployment configuration
├── supabase/              # Migrations, schema, SQL functions
├── documentation/         # Project documentation
├── .dockerignore
├── .gitignore
└── .env.example           # Template for environment variables
```

This structure cleanly separates concerns:

- **Compute** (frontend + backend)
- **Stateful / Cloud-managed** (Supabase)
- **Deployment** (infra + Docker + Caddy)
- **Documentation** (markdown files)

---

## 💻 Frontend (Astro + React)

```
Magazyn/frontend/
├── src/
│   ├── components/        # Reusable React UI components
│   ├── layouts/           # Astro layout files
│   ├── pages/             # Astro routed pages
│   ├── services/
│   │   ├── api/           # TanStack Query logic calling Go Backend
│   │   └── auth/          # Supabase JS client setup
│   └── shared/            # Shared TypeScript types from the backend
├── public/                # Static assets
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

### Notes

- Astro runs in **SSR mode**.
- React is used for interactive components (Cart, Calendar, Checkout).
- TanStack Query manages server state.
- Supabase Client handles login + admin uploads.

---

## ⚙️ Backend (Go API)

```
Magazyn/backend/
├── cmd/
│   └── api/
│       └── main.go        # Application entry point
├── internal/
│   ├── config/            # ENV / configuration loader
│   ├── handler/           # HTTP request handlers
│   ├── middleware/        # JWT validation via Supabase Auth
│   ├── service/           # Business logic
│   └── types/             # Shared Go types + domain models
├── pkg/                   # Optional reusable utilities
├── go.mod
└── go.sum
```

### Notes

- Stateless API server.
- Verifies Supabase JWTs.
- Sends transactional emails (e.g., Gmail SMTP).
- Connects to remote Supabase Postgres via environment variables.

---

## 🏗️ Infrastructure (Docker, Caddy, VPS Config)

```
Magazyn/infra/
├── Caddyfile              # Caddy reverse-proxy routing
├── docker-compose.yml     # Defines Go, Astro, Caddy containers
├── backend/
│   └── Dockerfile         # Build Go binary container
└── frontend/
    └── Dockerfile         # Build Astro SSR container
```

### Caddy Responsibilities

- Automatic HTTPS (Let's Encrypt)
- Route `/api/*` → Go API container
- Route everything else → Astro container

### Docker Compose Services

- `backend` (Go Main API)
- `frontend` (Astro SSR Node Server)
- `caddy` (Reverse Proxy & HTTPS)

---

## 🗄️ Supabase (Cloud-Managed Database + Auth + Storage)

```
Magazyn/supabase/
├── migrations/            # Versioned SQL migration files
│   ├── 202401010000_init.sql
│   └── 202401150930_add_rls.sql
├── functions/             # Optional: SQL functions / triggers
└── schema.sql             # Optional: current schema dump
```

### Notes

- Central place for all DB schema changes.
- Ensures trackable evolution of the Supabase Postgres instance.
- RLS and storage policies also belong here when possible.

---

## 📄 .env.example

A template for required environment variables:

```
# Supabase
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (same as PUBLIC_SUPABASE_URL, stored separately for backend compatibility)
# Note: Backend now uses PUBLIC_SUPABASE_URL directly
# GO_DB_URI=  # Deprecated

# Backend API
PUBLIC_BACKEND_URL=

# Server
PORT=8080
LOG_LEVEL=INFO
CORS_ALLOWED_ORIGINS=http://localhost:4321,http://localhost:3000
```

This file prevents configuration drift and onboarding pain.

---

## 🛠️ Optional Enhancements

### `Makefile`

Define commands for developers:

```
make dev
make build
make up
make db-migrate
```

### `scripts/`

Useful for automation:

```
scripts/
├── migrate.sh
├── seed.sh
└── reset-db.sh
```

---

## ✅ Final Notes

This structure is scalable, production-ready, and easy for contributors. It separates compute, cloud-managed state, and deployment concerns while staying familiar to both Go and JavaScript developers.
