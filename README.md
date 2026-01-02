# Equipment Rental System (Magazyn)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Astro](https://img.shields.io/badge/Astro-5.16-orange.svg)](https://astro.build/)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://reactjs.org/)
[![Go](https://img.shields.io/badge/Go-1.22-blue.svg)](https://golang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-1.22-blue.svg)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-24.0-blue.svg)](https://www.docker.com/)
[![Caddy](https://img.shields.io/badge/Caddy-2.6-blue.svg)](https://caddyserver.com/)


## 📋 Table of Contents

- [About](#about)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## 📖 About

The Equipment Rental System replaces an inconvenient Google Form-based rental process with a mobile-accessible web application. The system enables club members to:

- 🚣 Rent kayaking equipment using a credit system
- 📅 View real-time equipment availability with calendar views
- 💳 Manage credit balance and request credits for club work
- 📱 Access the system from any mobile or desktop device
- 📊 Track rental and credit history

**For Administrators:**

- 🛠️ Manage equipment inventory and maintenance
- ✅ Process and approve reservations
- 👥 Manage user accounts and credit allocations
- 📈 View analytics and reports

**Key Features:**

- Passwordless email-based authentication via Supabase
- Automated credit deduction and refund system
- Multi-item reservation support
- Real-time availability checking
- Comprehensive audit trail for all changes
- Mobile-optimized responsive design

## 🛠 Tech Stack & Architecture

| Layer | Technology |
|-------|------------|
| **Frontend** | Astro 5 (SSR) + React 19 + TypeScript 5 + TanStack Query |
| **Backend** | Go (Gin) + Gmail SMTP |
| **Database** | Supabase (PostgreSQL + Auth + Storage) |
| **Deploy** | Docker Compose + Caddy |

### 📐 Architecture Diagrams

- **[High-Level Architecture](documentation/diagrams/high-level-architecture.md)**: Overview of main components and data flows.
- **[Detailed Architecture](documentation/diagrams/detailed-architecture.md)**: Technical breakdown of all layers, middleware, and patterns.

## 📁 Project Structure

```
Magazyn/
├── frontend/          # Astro + React (src/, public/, e2e/)
├── backend/           # Go API (cmd/, internal/handler, service, types)
├── supabase/          # Migrations, seed.sql, SQL functions
├── infra/             # Docker, Caddyfile, deployment config
└── documentation/     # PRD, techstack, db-plan, diagrams
```

> See [frontend/docs/architecture.md](frontend/docs/architecture.md) and [backend/docs/architecture.md](backend/docs/architecture.md) for detailed architecture documentation.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version specified in project (check `package.json`)
- **Go**: Latest stable version
- **Docker & Docker Compose**: For deployment
- **Supabase Account**: Free tier account

[Note]
Database instance is created on Supabase. It can be started locally or remotely on [text](https://supabase.com/)

### Quick Start (Docker)

<!-- Creata initial envs with test user -->

```bash
npx supabase start              # Start local DB
cd infra && docker compose --env-file ../.env up -d # Start full stack
# App available at http://localhost:80
```

<!-- copy envs -->

<!-- start compose -->
<!-- use test caddy -->

<!-- initail users -->

<!-- you can run e2e tests for check -->
<!-- DO I HAVE MY EMAIL USER? -->

> [!TIP]
> See [frontend/e2e/README.md](frontend/e2e/README.md) for detailed Docker setup and testing.

### Local Development Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start local Supabase**

   Start the local Supabase services (database, auth, storage) using Docker or create a remote instance on [Supabase](https://supabase.com/):

   ```bash
   npx supabase start

   npx supabase status -o env
   ```

   Copy the API URL and Anon Key from the output to your `.env` file.


3. **Configure environment variables**

   Copy `.env.example` to `.env`:

   Update in `.env`:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

   See [`.env.example`](.env.example) for all configuration options.



4. **Start development server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

4. **Start Go backend** (in separate terminal)

   ```bash
   cd backend
   go run main.go
   ```

   The API will be available at `http://localhost:8080`

### Database Setup for Development

Populate your local Supabase database with test users and sample data:

#### 1. Seed Test Users and Data

Run the seed file to create test users and profiles:

```bash
npx supabase db seed
```

This creates two test users from [`supabase/seed.sql`](supabase/seed.sql):

| Email                 | Role  | Credit Balance | User ID                              |
|-----------------------|-------|----------------|--------------------------------------|
| testuser1@example.com | user  | 100,000        | 11111111-1111-1111-1111-111111111111 |
| testuser2@example.com | admin | 100,000        | 22222222-2222-2222-2222-222222222222 |

> [!NOTE]
> These users are primarily for backend integration tests, which require at least 2 users in the database.

#### 2. E2E Test Users (Optional)

For running E2E tests, you need additional users with password-based authentication:

<!-- UPDATE -->

> [!TIP]
> See [`frontend/docs/e2e-testing.md`](frontend/docs/e2e-testing.md) for complete E2E testing documentation.

#### 3. Running Integration Tests

Backend integration tests connect to the local Supabase instance and require:

- Local Supabase running (`npx supabase start`)
- At least 2 users in the database (created by automatically on tests start `npx supabase db seed`)
- Environment variables set (`PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

```bash
cd backend
go test -tags=integration ./...
```

## 📜 Available Scripts

| Script            | Description                                 |
| ----------------- | ------------------------------------------- |
| `npm run dev`     | Start Astro development server on port 3000 |
| `npm start`       | Alias for `npm run dev`                     |
| `npm run build`   | Build production-ready application          |
| `npm run preview` | Preview production build locally            |
| `npm run astro`   | Run Astro CLI commands                      |
| `npm run prepare` | Set up Husky git hooks (runs automatically) |

### Git Hooks

This project uses **Husky** and **lint-staged** for pre-commit code formatting:

- Automatically formats `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, and `.md` files
- Uses Prettier for consistent code style
- Runs on every commit

### Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation.

**Format**: `<type>(<scope>): <description>`

**Common types:**
- `feat:` - New feature (minor version bump)
- `fix:` - Bug fix (patch version bump)
- `docs:` - Documentation changes (no release)
- `refactor:` - Code restructuring (no release)
- `test:` - Test changes (no release)
- `chore:` - Maintenance tasks (no release)


📚 **[See detailed commit type guide →](documentation/conventional-commits.md)**

**Enforcement:**
- **CI**: PR titles validated automatically on every PR
- **Local**: Commits validated via commitlint with husky hooks

**Documentation:**

- [Product Requirements Document](documentation/prd/index.md)
- [Technology Stack & Architecture](documentation/techstack.md)
- [Database Schema Plan](documentation/db-plan.md)
- [Conventional Commits Guide](documentation/conventional-commits.md)

