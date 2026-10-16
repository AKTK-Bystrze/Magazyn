# Documentation

This index provides navigation to all project documentation

## ⚡ Agent Quick-Reference & Task Matrix

The following task matrix maps core development workflows directly to their implementation paths, architectural constraints, and cross-referenced guides:

| Task | Primary Target Paths | Architecture Rules & Boundaries | Relevant Guides |
| :--- | :--- | :--- | :--- |
| **Add API Endpoint** | `backend/internal/types/`<br/>`backend/internal/handler/{domain}/`<br/>`backend/internal/service/{domain}/`<br/>`backend/internal/repository/supabase/`<br/>`backend/cmd/api/main.go`<br/>`frontend/src/lib/api/`<br/>`frontend/src/pages/api/` | Enforce Layered Architecture (`handler` → `service` → `repository`). Standard library `net/http` only; constructor injection; structured errors via `http_utils.go`; search sanitization via `validation.SanitizeSearchTerm()`; frontend Zod schema & bidirectional transformer. | [Backend Guide](backend/README.md)<br/>[API Reference](overview/api.md)<br/>[Detailed Architecture](overview/detailed-architecture.md) |
| **Decompose UI Dialog / Component** | `frontend/src/components/{domain}/`<br/>`frontend/src/hooks/`<br/>`frontend/src/lib/hooks/` | Single Responsibility Principle (SRP): split into Container vs Presentation Island vs Subcomponent; extract shared form fields (`*FormFields.tsx`); isolate modal state to custom hooks (`use*Dialogs.ts`); use Radix/Shadcn dialog patterns; zero inline styles. | [Frontend Architecture](frontend/architecture.md)<br/>[Frontend Guidelines](frontend/guidelines.md) |
| **Add DB Migration / RPC** | `supabase/migrations/`<br/>`backend/internal/repository/supabase/*_rpc.go`<br/>`backend/internal/types/` | Name migration `YYYYMMDDHHMMSS_*.sql`; use PostgreSQL transactions with `SECURITY DEFINER` for atomic multi-step mutations; encapsulate DB calls in `*_repository_rpc.go`; reflect schema and RPC parameters in database docs. | [Database Documentation](database/db-doc.md)<br/>[Backend Guide](backend/README.md) |
| **Add Test Suite / Cases** | `backend/internal/.../*_test.go`<br/>`backend/internal/testutils/mocks/`<br/>`backend/internal/testutils/helpers.go`<br/>`frontend/src/**/__tests__/*`<br/>`frontend/src/test/fixtures/`<br/>`frontend/src/test/test-utils.tsx` | Backend: table-driven tests (`t.Run`), centralized mocks in `testutils/mocks/`, HTTP context helpers (`NewAuthenticatedRequest`). Frontend: Vitest + RTL, shared fixtures in `test/fixtures/`, `renderWithQueryClient` wrapper. Real assertions only—no dummy facades. | [Testing Standards](frontend/testing.md)<br/>[Backend Guide](backend/README.md) |
| **Add Equipment Type / Inventory** | `backend/internal/repository/supabase/equipment_repository_*.go`<br/>`backend/internal/service/equipment/equipment_service_*.go`<br/>`backend/internal/handler/equipment/equipment_*.go`<br/>`frontend/src/components/equipment/` | Respect decomposed equipment sub-services (`equipment_service_mutation.go`, `equipment_service_availability.go`); use `equipment_query.go` binder for query parameters; validate status constants and ISO dates. | [Backend Guide](backend/README.md)<br/>[Frontend Architecture](frontend/architecture.md) |
| **Modify Reservation Flow** | `backend/internal/service/reservation/pricing.go`<br/>`backend/internal/service/reservation/reservation_service_create.go`<br/>`backend/internal/service/reservation/reservation_service_update.go`<br/>`backend/internal/repository/supabase/reservation_repository_rpc.go`<br/>`frontend/src/hooks/useCartCheckout.ts`<br/>`frontend/src/components/reservations/` | Pricing formulas strictly located in `pricing.go` via `validation.CalculateDays()`; credit deduction and refunds through atomic DB RPCs (`create_reservation_atomic`, `modify_reservation_dates_with_credits`); keep audit trail in `credit_history`. | [Reservation Flow](flows/reservation-flow.md)<br/>[Backend Guide](backend/README.md)<br/>[Database Documentation](database/db-doc.md) |

---

## 📦 Backend Documentation

- [Backend Developer Guide](backend/README.md) - Dense, precise reference for backend architecture, security, and conventions.

### Backend Rules
Backend rules and guidelines (e.g. testing, docker, db migrations) are maintained directly as agent rules in the .agent/rules/ directory at the project root.

---

## 💻 Frontend Documentation

- [Architecture](frontend/architecture.md) - Frontend design patterns, auth, and redirect logic
- [Coding Guidelines](frontend/guidelines.md) - TypeScript/React conventions and structure
- [Testing Standards](frontend/testing.md) - Unit and E2E testing documentation

---

## 🔄 Application Flows

- [Authentication Flow](flows/auth-flow.md) - Login/logout process
- [Reservation Flow](flows/reservation-flow.md) - Equipment reservation process
- [Reservation Request Flow](flows/reservation-request-flow.md) - Request handling

---

## 📐 Architecture & Overview

- [High-Level Architecture](overview/high-level-architecture.md) - Main components and data flows
- [Detailed Architecture](overview/detailed-architecture.md) - Layer breakdown, middleware, and patterns
- [API Documentation](overview/api.md) - REST API routes and BFF proxy endpoints
- [Technology Stack](overview/techstack.md) - Tech stack and architectural decisions
- [Project Structure](overview/project_structure.md) - Monorepo directory structure
- [Conventional Commits](overview/conventional-commits.md) - Commit message standards

---

## 📄 Product Requirements

- [Product Requirements Document (PRD)](product/prd/index.md) - Core user stories and requirements
- [UI Architecture Plan](product/ui-plan.md) - Frontend view layout and UI design
- [API Plan](product/api-plan.md) - Initial endpoint specifications
- [Database Schema Plan](product/db-plan.md) - Initial DB schema design

---

## 🗄️ Database

- [Database Documentation](database/db-doc.md) - Authoritative schema documentation and RPCs

---

## Navigation

- [← Back to Project README](../README.md)
