# Frontend Architecture

> **Purpose**: Comprehensive overview of the frontend architecture, project structure, and code organization patterns.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Code Organization](#code-organization)
4. [Data Flow](#data-flow)
5. [Architectural Patterns](#architectural-patterns)

---

## Architecture Overview

### Tech Stack

- **Framework**: Astro 5 (Static Site Generation + Server-Side Rendering)
- **UI Library**: React 19 (for interactive components)
- **Styling**: Tailwind CSS 4 + Shadcn/ui components
- **Language**: TypeScript 5
- **State Management**: React Query (@tanstack/react-query)
- **Authentication**: Supabase Auth (`@supabase/ssr` for SSR)
- **Testing**: Vitest + React Testing Library

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
├─────────────────────────────────────────────────────────┤
│  Astro Pages (.astro)     React Components (.tsx)       │
│  ├─ Static Content        ├─ Interactive UI             │
│  └─ SSR Pages             └─ Client-side State          │
├─────────────────────────────────────────────────────────┤
│              Astro Middleware (index.ts)                 │
│  ├─ Authentication Check                                 │
│  ├─ Session Management                                   │
│  └─ Route Protection                                     │
├─────────────────────────────────────────────────────────┤
│            Frontend API Proxies (/pages/api/)            │
│  ├─ /api/equipment → Backend /equipment                 │
│  ├─ /api/equipment-types → Backend /equipment-types     │
│  └─ /api/auth/* → Backend /auth/*                       │
├─────────────────────────────────────────────────────────┤
│                 Go Backend (PORT 8080)                   │
│  ├─ Authentication                                       │
│  ├─ Business Logic                                       │
│  └─ Database Access (Supabase)                          │
└─────────────────────────────────────────────────────────┘
```

### Design Philosophy

1. **Server-First**: Use Astro's SSR capabilities for initial page loads
2. **Progressive Enhancement**: Add React only where interactivity is needed
3. **Type Safety**: TypeScript everywhere, strict mode enabled
4. **API Proxy Pattern**: Never call backend directly from client components
5. **Component Composition**: Small, focused components over large monoliths

---

## Project Structure

```
frontend/
├── docs/                           # Documentation
│   ├── architecture.md             # This file
│   ├── coding_standards.md         # Coding guidelines
│   └── redirect-flow.md            # Redirect logic
│
├── public/                         # Static assets (served as-is)
│   ├── favicon.png                 # Site favicon
│   ├── logo-bystrze-kolor.png      # Brand logo (light theme)
│   ├── bystrze-logo-czarno-biale.png # Brand logo (dark theme)
│   └── placeholder-equipment.svg   # Placeholder images
│
├── src/
│   ├── components/                 # React components
│   │   ├── auth/                   # Authentication (feature-based)
│   │   ├── equipment/              # Equipment domain
│   │   ├── providers/              # React context providers
│   │   └── ui/                     # Shadcn/ui components
│   │
│   ├── db/                         # Database clients & types
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── use-equipment-search.ts
│   │   └── use-debounce.ts
│   │
│   ├── layouts/                    # Astro layouts
│   │
│   ├── lib/                        # Utilities and services
│   │   ├── api/                    # API utilities and clients
│   │   ├── auth/                   # Auth utilities
│   │   ├── config/                 # Configuration files
│   │   │   ├── constants/          # Organized constants (Polish UI)
│   │   │   │   ├── index.ts        # Barrel export
│   │   │   │   ├── app.ts          # Pagination, timing, storage
│   │   │   │   ├── ui-core.ts      # Core UI strings (actions, states)
│   │   │   │   ├── navigation.ts   # Nav labels, breadcrumbs
│   │   │   │   ├── validation.ts   # Validation messages
│   │   │   │   ├── reservation/    # Reservation domain
│   │   │   │   │   ├── status.ts   # ⚠️ DB enum + labels
│   │   │   │   │   └── ui-strings.ts
│   │   │   │   ├── equipment/      # Equipment domain
│   │   │   │   │   ├── status.ts   # ⚠️ DB enum + labels
│   │   │   │   │   └── ui-strings.ts
│   │   │   │   ├── user/           # User domain
│   │   │   │   │   ├── role.ts     # ⚠️ DB enum + labels
│   │   │   │   │   └── ui-strings.ts
│   │   │   │   └── credit/
│   │   │   │       └── ui-strings.ts
│   │   │   ├── constants.ts        # Legacy re-export
│   │   │   ├── routes.ts           # Route constants
│   │   │   ├── nav-config.ts       # Navigation config
│   │   │   ├── api.ts              # API config
│   │   │   └── query.ts            # React Query config
│   │   ├── errors/                 # Error handling
│   │   ├── schemas/                # Validation schemas
│   │   ├── transformers/           # Data transformation layer
│   │   └── validators/             # Runtime validation (Zod)
│   │
│   ├── middleware/                 # Astro middleware
│   │
│   ├── pages/                      # Astro pages (routes)
│   │   ├── api/                    # API endpoints (proxies)
│   │   │   ├── auth/
│   │   │   └── equipment/
│   │   │
│   │   ├── equipment/              # /equipment routes
│   │   ├── reservations/           # /reservations routes
│   │   └── index.astro             # Home page
│   │
│   ├── styles/                     # Global styles
│   │
│   ├── test/                       # Test utilities
│   │
│   ├── types/                      # Type definitions (domain-specific)
│   │   ├── index.ts                # Barrel export
│   │   ├── auth.types.ts           # Auth & user types
│   │   ├── api.types.ts            # API structures & pagination
│   │   ├── common.types.ts         # Shared utilities
│   │   ├── reservation-cart.types.ts # Cart types
│   │   │
│   │   ├── equipment/              # Equipment domain
│   │   │   ├── index.ts
│   │   │   ├── equipment.types.ts
│   │   │   ├── maintenance.types.ts
│   │   │   └── dtos.types.ts
│   │   │
│   │   ├── reservations/           # Reservations domain
│   │   │   ├── index.ts
│   │   │   └── reservation.types.ts
│   │   │
│   │   ├── credits/                # Credits domain
│   │   │   ├── index.ts
│   │   │   ├── history.types.ts
│   │   │   └── requests.types.ts
│   │   │
│   │   └── analytics/              # Analytics domain
│   │       ├── index.ts
│   │       └── analytics.types.ts
│   │
│   ├── env.d.ts                    # TypeScript environment declarations
│
├── .env                            # Environment variables (gitignored)
├── astro.config.mjs                # Astro configuration
├── tailwind.config.mjs             # Tailwind configuration
└── tsconfig.json                   # TypeScript configuration
```

---

## Code Organization

### Directory Organization Principles

#### 1. **Feature-Based Organization** (for `components/`)
Group components by domain/feature, not by type.

```
✅ GOOD: components/equipment/EquipmentCard.tsx
❌ BAD: components/cards/EquipmentCard.tsx
```

#### 2. **Type-Based Organization** (for `lib/`)
Utilities are organized by purpose since they're cross-cutting (e.g., `lib/auth/`, `lib/validators/`).

#### 3. **Route-Based Organization** (for `pages/`)
Pages mirror the URL structure (e.g., `pages/equipment/index.astro` → `/equipment`).

### Component Structure Pattern

```tsx
// 1. Imports (external -> internal -> styles)
import * as React from "react";
import { EquipmentCard } from "./EquipmentCard";
import type { EquipmentSearchItem } from "@/types";

// 2. Types & Constants
interface EquipmentGridProps { ... }

// 3. Main Component
export function EquipmentGrid({ items }: EquipmentGridProps) {
  // 3a. Hooks
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  
  // 3b. Logic/Handlers
  const handleSelect = (id: string) => setSelectedId(id);
  
  // 3c. Early Returns
  if (!items.length) return <EmptyState />;
  
  // 3d. Render
  return (
    <div className="grid">
      {items.map(item => <EquipmentCard key={item.id} {...item} />)}
    </div>
  );
}
```

### State Management

1. **Server State (React Query)**: Co-located with data usage.
2. **UI State (useState/useReducer)**: Co-located with components.
3. **URL State (Search Params)**: Managed by custom hooks.

---

## Data Flow

### Request Flow (User Action → Backend)

```
1. User Action
   ↓
2. React Component (Handler)
   ↓
3. Custom Hook (useEquipmentList)
   ↓
4. Equipment API Module (equipment-api.ts)
   ↓
5. API Client (src/lib/api.ts)
   ↓
6. Frontend API Proxy (pages/api/equipment/index.ts)
   ↓
7. Backend (Go API) -> Returns snake_case JSON
   ↓
8. Transformer Layer (Zod Validation + Transformation)
   ↓
9. React Query (Caches camelCase Data)
   ↓
10. Component Re-render
```

### Authentication Flow (Overview)

1. **Login**: User logs in -> Magic Link -> `set-cookie`
2. **Middleware**: Creates per-request Supabase client, validates session, sets `locals.user` & `locals.accessToken`
3. **API Proxy**: Injects `Authorization: Bearer <token>` from `locals`
4. **Backend**: Validates JWT token

See `middleware/index.ts`, `lib/auth/supabase-ssr.ts`, and `lib/auth/` for implementation.

### Redirect Flow Architecture

**The application uses a centralized redirect system.**
For full details, patterns, and diagrams, see **[redirect-flow.md](./redirect-flow.md)**.

**Key Rule**: Always use `ROUTES` constants.

```typescript
import { ROUTES } from '@/lib/config/routes';

// ✅ Correct
return Astro.redirect(ROUTES.PUBLIC.LOGIN);

// ❌ Wrong
return Astro.redirect('/login');
```

---

## Architectural Patterns

### 1. API Proxy Pattern
**Frontend API routes act as proxies** to the Go backend.
- Handles Auth injection
- Manages CORS
- Abstracts backend URLs

### 2. Provider Pattern
Wrap component trees with `QueryProvider` to ensure SSR compatibility.

```tsx
<QueryProvider>
  <ComponentUsingQueries />
</QueryProvider>
```

### 3. Middleware Pattern
Centralized request handling in `src/middleware/index.ts` for:
- Authentication validation
- Route protection
- Redirect logic
- Token management

### 4. Container/Presentational Pattern
Separate data fetching from UI rendering.
- **Container**: `EquipmentSearchContainer` (fetches data)
- **Presentational**: `EquipmentGrid` (renders data)

### 5. Type-Safe Transformer Pattern
**Problem**: Backend sends `snake_case`, frontend needs `camelCase`.
**Solution**: 4-layer architecture.

**The 4 Layers**:
1. **DTOs**: `types/equipment/dtos.types.ts` (Backend shape)
2. **Validators**: `lib/validators/` (Zod schemas)
3. **Transformers**: `lib/transformers/` (Functions)
4. **Frontend Types**: `types/equipment/equipment.types.ts` (App shape)

**Example (Bidirectional)**:

```typescript
// Incoming: Backend -> Frontend (snake_case -> camelCase)
export function transformEquipmentDTO(dto: unknown): EquipmentSearchItem {
  const validated = equipmentDTOSchema.parse(dto); // Zod validation
  return {
    id: validated.id,
    creditCost: validated.credit_cost, // Transformation
    // ...
  };
}

// Outgoing: Frontend -> Backend (camelCase -> snake_case)
export function transformCreateCommand(cmd: CreateCommand): unknown {
  return {
    equipment_id: cmd.equipmentId,
    start_date: cmd.startDate,
    // ...
  };
}
```

### 6. Error Boundary Pattern
Wrap complex component trees with `<ErrorBoundary>` to prevent full app crashes.

### 7. Constants & i18n Pattern

**Problem**: UI strings scattered across components, inconsistent terminology, hard to maintain.
**Solution**: Centralized constants organized by domain in `lib/config/constants/`.

**Directory Structure**:
```
constants/
├── index.ts              # Barrel export
├── app.ts                # App-wide settings (pagination, timing)
├── ui-core.ts            # Shared Polish strings (actions, states)
├── navigation.ts         # Nav labels, breadcrumbs
├── validation.ts         # Validation error messages
│
├── reservation/
│   ├── status.ts         # ⚠️ CRUCIAL: DB enum + labels
│   └── ui-strings.ts     # View/dialog strings
│
├── equipment/
│   ├── status.ts         # ⚠️ CRUCIAL: DB enum + labels
│   └── ui-strings.ts     # Filter/manager strings
│
├── user/
│   ├── role.ts           # ⚠️ CRUCIAL: DB enum + labels
│   └── ui-strings.ts     # Validation messages
│
└── credit/
    └── ui-strings.ts     # Credit history strings
```

**Key Rules**:
1. **Crucial files** (`status.ts`, `role.ts`) contain enums that **must match database exactly**
2. **UI strings** are grouped by domain for discoverability
3. **Core strings** (`ui-core.ts`) are reused across domains

**Usage**:
```typescript
// Import from barrel (most common)
import { RESERVATION_STATUS, CORE_UI_STRINGS } from '@/lib/config/constants';

// Import from domain (for focused imports)
import { RESERVATION_STATUS } from '@/lib/config/constants/reservation';
```

**Key Terminology** (Polish):
- **credits** → `godzinki` (little hours)
- **cart** → `worek` (bag)

---

## File Size Guidelines

- **Components**: Max ~200-300 lines
- **Utilities**: Max ~150 lines
- **Types**: Split if >500 lines
- **Constants**: Split by domain (~50-100 lines per file)

---

## Related Documentation

- [Coding Standards](./coding_standards.md)
- [Redirect Flow](./redirect-flow.md)
- [Astro Guidelines](../.agent/rules/astro.md)
- [React Guidelines](../.agent/rules/react.md)

