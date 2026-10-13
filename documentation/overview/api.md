# API Documentation

## Overview

This document provides a tree-view structure and route reference for the Application Programming Interface (API) of the Equipment Rental System (Magazyn). It connects the [Backend Architecture](../backend/README.md) with the [Frontend Architecture](../frontend/architecture.md).

### Architecture Summary

- **Backend**: Go standard library `net/http` (`http.NewServeMux()`), exposing REST endpoints on port `:8080`.
- **Frontend / BFF**: Astro 5 SSR proxy endpoints under `frontend/src/pages/api/` forwarding authenticated requests to the backend.
- **Reverse Proxy**: In production/Docker environments, Caddy strips `/api` and routes directly to the Go backend on port `:8080`. During local SSR development, Astro BFF proxies forward requests with the user's `locals.accessToken`.
- **Database**: Supabase PostgreSQL (managed), accessed via `supabase-go` and atomic SQL RPC stored procedures.
- **Authentication**: Supabase Auth (Magic Links), verified on the Go backend using JWT verification middleware.

---

## 1. Go Backend REST API Routes (`backend/cmd/api/main.go`)

The backend registers routes directly on standard `net/http` ServeMux (no `/api/v1` prefix):

```text
/
├── GET  /health                                 # Public health check
│
├── /auth
│   ├── POST /auth/login                         # Public: initiate login
│   ├── POST /auth/logout                        # Auth: end session
│   └── GET  /auth/session                       # Auth: get current session & profile (enabled & disabled users)
│
├── /users
│   ├── GET  /users/me                           # Auth: get current user profile
│   ├── GET  /users/public                       # Auth: list public user profiles
│   ├── GET  /users/credits                      # Auth: credit leaderboard
│   ├── GET  /users                              # Admin, SuperAdmin: list all users
│   ├── POST /users                              # SuperAdmin: create user
│   ├── GET  /users/{id}                         # Admin, SuperAdmin: get user by ID
│   ├── PATCH /users/{id}                        # SuperAdmin: update user profile/role/status
│   └── POST /users/bulk-adjust-credits          # SuperAdmin: bulk adjust credit balances
│
├── /equipment-types
│   └── GET  /equipment-types                    # Auth: list equipment categories & rates
│
├── /equipment
│   ├── GET  /equipment                          # Auth: search & list equipment
│   ├── POST /equipment                          # Admin, SuperAdmin: create equipment item
│   ├── GET  /equipment/{id}                     # Auth: get equipment details with maintenance logs
│   ├── PATCH /equipment/{id}                    # Admin, SuperAdmin: update equipment status/details
│   ├── DELETE /equipment/{id}                   # Admin, SuperAdmin: archive equipment
│   ├── GET  /equipment/{id}/availability        # Auth: check availability for date range
│   └── POST /equipment/{id}/maintenance-logs    # Auth: add maintenance log entry
│
├── /reservations
│   ├── GET  /reservations                       # Auth: list reservations (scope=my or scope=all, filters, pagination)
│   ├── POST /reservations                       # Auth: create atomic reservation(s) & deduct credits
│   ├── GET  /reservations/dashboard             # Admin, SuperAdmin: reservation dashboard statistics
│   ├── PATCH /reservations/bulk                 # Admin, SuperAdmin: bulk update reservation statuses
│   ├── GET  /reservations/{id}                  # Auth: get reservation details with history
│   └── PATCH /reservations/{id}                 # Auth: update dates or cancel reservation
│
├── /credits
│   ├── GET  /credits/history                    # Auth: list user credit transaction history
│   └── /credits/requests
│       ├── GET   /credits/requests              # Auth: list credit requests
│       ├── POST  /credits/requests              # Auth: create new credit request
│       ├── PUT   /credits/requests/{id}         # Auth: update credit request
│       └── PATCH /credits/requests/{id}/status  # SuperAdmin: approve/reject credit request
│
├── /calendar
│   └── GET  /calendar/availability              # Auth: equipment calendar availability
│
└── /analytics
    ├── GET  /analytics/equipment-stats          # Admin, SuperAdmin: equipment utilization statistics
    └── GET  /analytics/user-stats               # Admin, SuperAdmin: user activity statistics
```

*Note: Prometheus metrics are served on an internal HTTP server on port `:9091` (`/metrics`).*

---

## 2. Frontend Astro BFF Proxies (`frontend/src/pages/api/`)

Astro server-side endpoints proxy incoming browser requests to the Go backend (`BACKEND_URL`):

| Astro Route | Methods | Backend Target | Description |
|---|---|---|---|
| `/api/auth/login` | `POST` | `/auth/login` | Login handler |
| `/api/auth/logout` | `POST` | Local / Backend | Clear session cookies & sign out |
| `/api/users` | `GET`, `POST` | `/users` | List users (`GET`), create user (`POST`) |
| `/api/users/me` | `GET` | `/users/me` | Current user profile |
| `/api/users/credits` | `GET` | `/users/credits` | Credit leaderboard |
| `/api/users/bulk-adjust-credits` | `POST` | `/users/bulk-adjust-credits` | SuperAdmin bulk credit adjustments |
| `/api/users/[id]` | `GET`, `PATCH` | `/users/{id}` (or `/users/public`) | User by ID or public users |
| `/api/equipment-types` | `GET` | `/equipment-types` | Equipment categories |
| `/api/equipment` | `GET`, `POST` | `/equipment` | List equipment (`GET`), create (`POST`) |
| `/api/equipment/[id]` | `GET`, `PATCH`, `DELETE` | `/equipment/{id}` | Equipment details, update, archive |
| `/api/equipment/[id]/availability` | `GET` | `/equipment/{id}/availability` | Item date availability check |
| `/api/equipment/[id]/maintenance-logs` | `POST` | `/equipment/{id}/maintenance-logs` | Add maintenance log |
| `/api/reservations` | `GET`, `POST` | `/reservations` | List reservations (`GET`), create (`POST`) |
| `/api/reservations/dashboard` | `GET` | `/reservations/dashboard` | Admin dashboard stats |
| `/api/reservations/bulk` | `PATCH` | `/reservations/bulk` | Bulk reservation status updates |
| `/api/reservations/[id]` | `GET`, `PATCH` | `/reservations/{id}` | Get reservation (`GET`), update/cancel (`PATCH`) |
| `/api/credits/history` | `GET` | `/credits/history` | Credit history ledger |
| `/api/credits/requests` | `GET`, `POST` | `/credits/requests` | List requests (`GET`), create request (`POST`) |
| `/api/credits/requests/[id]` | `PUT` | `/credits/requests/{id}` | Update credit request |
| `/api/credits/requests/[id]/status` | `PATCH` | `/credits/requests/{id}/status` | SuperAdmin review/status change |
| `/api/calendar/availability` | `GET` | `/calendar/availability` | Calendar view availability |
| `/api/analytics/equipment-stats` | `GET` | `/analytics/equipment-stats` | Equipment analytics view |
| `/api/analytics/user-stats` | `GET` | `/analytics/user-stats` | User activity analytics view |

---

## 3. Frontend Client & Hook Integration

Frontend components interact with the API using a typed architecture:

1. **Client API Modules** (`frontend/src/lib/api/`):
   - `auth.ts`: Authentication routines
   - `equipment-api.ts`: Equipment queries, mutations, maintenance logs
   - `reservations-api.ts`: Reservation lifecycle (create, list, update, bulk)
   - `users-api.ts`: User management, profile, bulk credit adjustments
   - `credits-api.ts`: Credit history queries
   - `credit-requests-api.ts`: Credit requests and reviews
2. **React Query Hooks** (`frontend/src/hooks/`):
   - Data fetching hooks (e.g., `useAvailabilityCheck`, `useEquipmentFilter`, `useTableSort`) wrap API calls with `@tanstack/react-query` for automatic caching and state invalidation.
3. **Data Transformers** (`frontend/src/lib/transformers/`):
   - Bidirectional mapping between backend `snake_case` DTOs and frontend `camelCase` domain models.
