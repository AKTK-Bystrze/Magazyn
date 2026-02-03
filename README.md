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

- **[High-Level Architecture](documentation/overview/high-level-architecture.md)**: Overview of main components and data flows.
- **[Detailed Architecture](documentation/overview/detailed-architecture.md)**: Technical breakdown of all layers, middleware, and patterns.

## 📁 Project Structure

> See **[Project Structure](documentation/overview/project_structure.md)** for the complete monorepo layout and directory organization.
>
> For detailed documentation, see the **[Documentation Index](documentation/README.md)**.

### 🤖 AI Tooling Directories

| Directory | Purpose |
|-----------|---------|
| `.agent/` | AI coding assistant configuration (rules, commands, workflows) |
| `.ai/` | AI-generated content (issue drafts, prompts, context files) |

> These directories are used by AI coding assistants (Cursor, Windsurf, etc.) and are not part of the application runtime.


## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version specified in project (check `package.json`)
- **Go**: Latest stable version
- **Docker & Docker Compose**: For deployment
- **Supabase Account**: Free tier account

[Note]
Database instance is created on Supabase. It can be started locally or remotely on [text](https://supabase.com/)

### Quick Start (Docker)

1. **Start Supabase** (local or remote)

   ```bash
   npx supabase start
   ```

2. **Configure Environment**

   create .env file based on .env.example

   Update in `.env`:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **Start Application**

   ```bash
   cd infra && docker compose --env-file ../.env up -d
   ```

   **App available at:** http://localhost:80

4. **Create Super Admin User**

   reuse seed.sql from supabase/seed.sql to create super admin user. Just replace email and role. Email is used to send magic link


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

> [!NOTE]
> These users are primarily for backend integration tests, which require at least 2 users in the database.

#### 2. E2E Test

End-to-end tests use **Playwright** and support both Docker and local environments.

**Quick Start (Docker):**
```bash
cd infra && docker compose --env-file ../.env up -d --build
cd ../frontend && npm run e2e
# Run in browser: npm run e2e:headed
```

**Key Features:**
- **Auto-created users**: Test users are automatically managed by fixtures.
- **Hybrid Strategy**: Uses shared users for performance and isolated resources for reliability.
- **Visuals**: Runs on mobile viewport (Pixel 5).

> [!TIP]
> See [`frontend/e2e/README.md`](frontend/e2e/README.md) for full documentation, authentication flows, and debugging guide.

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

- [Documentation Index](documentation/README.md)
- [Product Requirements Document](documentation/design-docs/prd/index.md)
- [Technology Stack & Architecture](documentation/overview/techstack.md)
- [Database Schema Plan](documentation/design-docs/db-plan.md)
- [Conventional Commits Guide](documentation/overview/conventional-commits.md)

