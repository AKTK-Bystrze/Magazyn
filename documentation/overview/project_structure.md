# Project Structure Plan (Final Recommended Version)

This document describes the project structure for the Magazyn application. The architecture follows a clean monorepo pattern, separating frontend, backend, infrastructure, and database management.

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
│   ├── lib/               # Services and helpers
│   │   ├── api/           # API clients and logic
│   │   ├── auth/          # Authentication utilities
│   ├── pages/             # Astro routed pages
│   └── types/             # Shared TypeScript types
├── public/                # Static assets (served as-is)
│   ├── favicon.png        # Site favicon
│   ├── logo-bystrze-kolor.png           # Brand logo (light theme)
│   ├── bystrze-logo-czarno-biale.png    # Brand logo (dark theme)
│   └── placeholder-equipment.svg        # Placeholder images
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

### Notes

- Astro runs in **SSR mode**.
- React is used for interactive components (Cart, Calendar, Checkout).
- TanStack Query manages server state.
- Server-side HttpOnly encrypted session cookie (`magazyn_sid`) handles authentication.

### Public Folder Organization

The `public/` folder contains static assets that are served directly without processing:

- **Favicon**: `favicon.png` is linked in `BaseLayout.astro`
- **Brand Assets**:
  - `logo-bystrze-kolor.png` - Color logo for light theme
  - `bystrze-logo-czarno-biale.png` - Black & white logo for dark theme
  - Theme switching is handled via Tailwind's `dark:` variant (e.g., `class="block dark:hidden"`)
- **Placeholders**: Static SVG placeholders for missing images

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
│   ├── repository/        # Data access layer (PostgREST / Supabase)
│   ├── service/           # Business logic
│   └── types/             # Shared Go types + domain models
├── pkg/                   # Optional reusable utilities
├── go.mod
└── go.sum
```

### Notes

- Stateless API server.
- Verifies Supabase JWTs.
- Sends transactional emails via Noop email service.
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
│   ├── 20251120194634_initial_schema.sql
│   └── ...
└── seed.sql               # Database seed data for local development
```

### Notes

- Central place for all DB schema changes.
- Ensures trackable evolution of the Supabase Postgres instance.
- RLS and storage policies also belong here.
- Handled directly via Supabase CLI (`npx supabase db ...`).

---

## 🛠️ Operational Tooling

Operational and administration tasks are managed via `admin.sh`:

- `./admin.sh backup` — Run database backups
- `./admin.sh check` — Run system and environment sanity checks

---
