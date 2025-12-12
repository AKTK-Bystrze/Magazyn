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
- **Authentication**: Supabase Auth
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
│   └── coding_standards.md         # Coding guidelines
│
├── public/                         # Static assets (served as-is)
│   └── favicon.svg
│
├── src/
│   ├── components/                 # React components
│   │   ├── auth/                   # Authentication components
│   │   │   ├── AuthListener.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   └── MagicLinkHandler.tsx
│   │   │
│   │   ├── equipment/              # Equipment domain components
│   │   │   ├── EquipmentCard.tsx
│   │   │   ├── EquipmentGrid.tsx
│   │   │   ├── EquipmentSearchContainer.tsx
│   │   │   └── FilterSidebar.tsx
│   │   │
│   │   ├── providers/              # React context providers
│   │   │   └── QueryProvider.tsx   # React Query setup
│   │   │
│   │   └── ui/                     # Shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── ...
│   │
│   ├── db/                         # Database clients & types
│   │   ├── database.types.ts       # Generated Supabase types
│   │   └── supabase.client.ts      # Supabase client singleton
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── use-equipment-search.ts
│   │   └── use-debounce.ts
│   │
│   ├── layouts/                    # Astro layouts
│   │   └── BaseLayout.astro
│   │
│   ├── lib/                        # Utilities and services
│   │   ├── api/                    # API utilities
│   │   │   └── client.ts
│   │   │
│   │   ├── auth/                   # Auth utilities
│   │   │   ├── __tests__/          # Auth tests
│   │   │   ├── cookie-utils.ts
│   │   │   ├── redirect-manager.ts
│   │   │   ├── role-utils.ts
│   │   │   └── session-utils.ts
│   │   │
│   │   ├── config/                 # Configuration
│   │   │   ├── api.ts              # API endpoints config
│   │   │   ├── routes.ts           # Route constants
│   │   │   ├── constants.ts        # App constants
│   │   │   └── query.ts            # React Query config
│   │   │
│   │   ├── errors/                 # Error handling
│   │   │   └── api-error.ts
│   │   │
│   │   ├── schemas/                # Validation schemas
│   │   │   ├── auth-schemas.ts
│   │   │   └── api-schemas.ts      # API validation
│   │   │
│   │   ├── transformers/          # Data transformation layer
│   │   │   ├── equipment.transformer.ts
│   │   │   ├── availability.transformer.ts
│   │   │   └── reservation.transformer.ts
│   │   │
│   │   ├── validators/            # Runtime validation (Zod)
│   │   │   ├── equipment.validator.ts
│   │   │   └── availability.validator.ts
│   │   │
│   │   ├── api/                   # API client modules
│   │   │   ├── index.ts            # Barrel export
│   │   │   ├── client.ts           # Generic HTTP client
│   │   │   ├── auth.ts             # Auth endpoints
│   │   │   └── equipment-api.ts    # Equipment endpoints
│   │   │
│   │   ├── utils/                 # Utility functions
│   │   │   ├── debug.ts            # Development logging
│   │   │   ├── cart-storage.ts     # Cart persistence
│   │   │   ├── cart-validation.ts  # Cart validation
│   │   │   ├── date-utils.ts       # Date helpers
│   │   │   └── text-utils.ts       # Text formatting
│   │   │
│   │   ├── supabase.ts             # Supabase helpers
│   │   └── utils.ts                # General utilities
│   │
│   ├── middleware/                 # Astro middleware
│   │   └── index.ts                # Auth & routing middleware
│   │
│   ├── pages/                      # Astro pages (routes)
│   │   ├── api/                    # API endpoints (proxies)
│   │   │   ├── auth/               # Auth endpoints
│   │   │   │   ├── login.ts
│   │   │   │   ├── logout.ts
│   │   │   │   └── verify.ts
│   │   │   │
│   │   │   ├── equipment/          # Equipment endpoints
│   │   │   │   └── index.ts        # GET /api/equipment
│   │   │   │
│   │   │   └── equipment-types.ts  # GET /api/equipment-types
│   │   │
│   │   ├── equipment/              # Equipment pages
│   │   │   └── index.astro         # /equipment (search page)
│   │   │
│   │   ├── account-disabled.astro  # /account-disabled
│   │   ├── admin.astro             # /admin
│   │   ├── dashboard.astro         # /dashboard
│   │   ├── index.astro             # / (home)
│   │   └── login.astro             # /login
│   │
│   ├── styles/                     # Global styles
│   │   └── global.css              # Tailwind base + custom
│   │
│   ├── test/                       # Test utilities
│   │   ├── setup.ts                # Vitest setup
│   │   ├── mocks.ts                # Test mocks
│   │   └── utils.ts                # Test helpers
│   │
│   ├── types/                      # Type definitions (domain-specific)
│   │   ├── index.ts                # Barrel export
│   │   ├── auth.types.ts           # Auth & user types
│   │   ├── equipment.types.ts      # Equipment & reservations
│   │   ├── api.types.ts            # API structures & pagination
│   │   └── common.types.ts         # Shared utilities
│   │
│   ├── env.d.ts                    # TypeScript environment declarations
│
├── .env                            # Environment variables (gitignored)
├── .env.example                    # Environment template
├── astro.config.mjs                # Astro configuration
├── tailwind.config.mjs             # Tailwind configuration
├── tsconfig.json                   # TypeScript configuration
└── vitest.config.ts                # Vitest configuration
```

---

## Code Organization

### Directory Organization Principles

#### 1. **Feature-Based Organization** (for `components/`)

Group components by domain/feature, not by type.

```
✅ GOOD: Organized by feature
components/
├── auth/
│   ├── LoginForm.tsx
│   ├── MagicLinkHandler.tsx
│   └── AuthListener.tsx
│
└── equipment/
    ├── EquipmentCard.tsx
    ├── EquipmentGrid.tsx
    └── FilterSidebar.tsx

❌ BAD: Organized by type
components/
├── forms/
│   └── LoginForm.tsx
├── handlers/
│   └── MagicLinkHandler.tsx
└── listeners/
    └── AuthListener.tsx
```

**Why**: Related components stay together, making features easier to understand and navigate.

#### 2. **Type-Based Organization** (for `lib/`)

Utilities are organized by type/purpose since they're cross-cutting concerns.

```
lib/
├── auth/           # All auth-related utilities
├── config/         # Configuration files
├── errors/         # Error handling utilities
└── schemas/        # Validation schemas
```

#### 3. **Route-Based Organization** (for `pages/`)

Pages mirror the URL structure for clarity.

```
pages/
├── equipment/
│   └── index.astro      → /equipment
│
├── admin.astro          → /admin
└── dashboard.astro      → /dashboard
```

### Component Organization

#### File Structure Pattern

Each component file should follow this structure:

```tsx
// 1. Imports (external libraries first, then internal)
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EquipmentCard } from "./EquipmentCard";
import type { EquipmentSearchItem } from "@/types";

// 2. Type definitions
interface EquipmentGridProps {
  items: EquipmentSearchItem[];
  isLoading: boolean;
}

// 3. Constants (if any)
const GRID_COLUMNS = 3;

// 4. Main component
export function EquipmentGrid({ items, isLoading }: EquipmentGridProps) {
  // 4a. Hooks (state, queries, effects)
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  
  // 4b. Derived state
  const hasItems = items.length > 0;
  
  // 4c. Event handlers
  const handleSelect = (id: string) => {
    setSelectedId(id);
  };
  
  // 4d. Early returns (loading, error, empty states)
  if (isLoading) return <LoadingSkeleton />;
  if (!hasItems) return <EmptyState />;
  
  // 4e. Render (happy path)
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <EquipmentCard
          key={item.id}
          item={item}
          onSelect={handleSelect}
          isSelected={item.id === selectedId}
        />
      ))}
    </div>
  );
}

// 5. Helper components (if small and specific to this file)
function LoadingSkeleton() {
  return <div>Loading...</div>;
}

function EmptyState() {
  return <div>No items found</div>;
}
```

### API Proxy Organization

API proxies in `pages/api/` follow a consistent pattern:

```ts
// pages/api/equipment/index.ts
import type { APIRoute } from 'astro';
import { BACKEND_URL } from '@/lib/config/api';

/**
 * Equipment list endpoint
 * GET /api/equipment -> Backend GET /equipment
 */
export const GET: APIRoute = async ({ locals, request }) => {
  // 1. Get auth token from middleware
  const token = locals.accessToken;
  
  // 2. Build backend URL with query params
  const url = new URL(request.url);
  const backendUrl = new URL(`${BACKEND_URL}/equipment`);
  backendUrl.search = url.search;
  
  // 3. Forward with authentication
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // 4. Return response
  const response = await fetch(backendUrl.toString(), {
    method: 'GET',
    headers,
  });
  
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
```

### State Management Organization

#### React Query (Server State)

Located in components using the data:

```tsx
// components/equipment/EquipmentSearchContainer.tsx
const { data, isLoading, error } = useQuery({
  queryKey: ["equipment", filters],
  queryFn: () => api.get("/api/equipment", filters),
});
```

#### React State (UI State)

Co-located with components:

```tsx
// components/equipment/FilterSidebar.tsx
const [isOpen, setIsOpen] = useState(false);
```

#### URL State (Search Params)

Managed by custom hooks:

```tsx
// hooks/use-equipment-search.ts
export function useEquipmentSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  return {
    filters: {
      search: searchParams.get('search') || '',
      typeId: searchParams.get('type_id'),
    },
    updateFilter,
  };
}
```

---

## Data Flow

### Request Flow (User Action → Backend)

```
1. User Action (e.g., clicks "Search")
   ↓
2. React Component Handler
   ↓
3. Update URL params or trigger query
   ↓
4. React Query calls queryFn
   ↓
5. Custom Hook (useEquipmentList)
   ↓
6. Equipment API Module (equipment-api.ts)
   ↓
7. API Client (src/lib/api.ts)
   ↓
8. Frontend API Proxy (pages/api/equipment/index.ts)
   ├─ Gets auth token from locals
   ├─ Forwards to backend
   └─ Returns response
   ↓
9. Backend (Go API)
   ├─ Validates JWT
   ├─ Executes business logic
   └─ Queries database
   ↓
10. Response returns (snake_case JSON)
   ↓
11. Transformer Layer
   ├─ Zod validates response structure
   ├─ Transforms snake_case → camelCase
   └─ Restructures flat → nested
   ↓
12. React Query caches transformed result
   ↓
13. Component re-renders with clean data
```

### Authentication Flow

```
1. User enters email on /login
   ↓
2. LoginForm submits to /api/auth/login
   ↓
3. Backend sends magic link email
   ↓
4. User clicks link
   ↓
5. Supabase redirects to /#access_token=...
   ↓
6. MagicLinkHandler extracts token from hash
   ↓
7. Sets cookie via /api/auth/verify
   ↓
8. Middleware validates cookie on next request
   ↓
9. Middleware stores token in locals.accessToken
   ↓
10. User redirected to dashboard/admin
```

### Middleware Flow

```
Every Request
   ↓
Middleware (src/middleware/index.ts)
   ↓
1. Check for auth cookie
   ├─ Yes: Validate with Supabase
   │       ├─ Valid: Get user session
   │       │         ├─ Store in locals.user
   │       │         ├─ Store token in locals.accessToken
   │       │         └─ Store session in locals.sessionInfo
   │       │
   │       └─ Invalid: Clear cookie, treat as unauthenticated
   │
   └─ No: Unauthenticated
   ↓
2. Check route protection
   ├─ Public route (/login): Allow
   ├─ API route (/api/*): Require auth
   └─ Protected page: Require auth
   ↓
3. Check user status
   ├─ Disabled: Redirect to /account-disabled
   └─ Enabled: Continue
   ↓
4. Apply redirect rules (RedirectManager)
   ↓
5. Continue to page/API handler
```

---

## Architectural Patterns

### 1. API Proxy Pattern

**Problem**: Frontend shouldn't call backend directly (CORS, auth headers, URL changes)

**Solution**: Frontend API routes act as proxies

```
Client Component → /api/equipment → Backend /equipment
```

**Benefits**:
- ✅ Single point for auth token injection
- ✅ CORS handled server-side
- ✅ Backend URL changes don't affect components
- ✅ Can add logging, rate limiting, caching

### 2. Provider Pattern

**Problem**: React Query needs `QueryClient` context

**Solution**: Wrap component trees with `QueryProvider`

```tsx
// Provides QueryClient to all children
<QueryProvider>
  <ComponentUsingQueries />
</QueryProvider>
```

**Benefits**:
- ✅ SSR-compatible (new client per tree)
- ✅ Isolated cache per component tree
- ✅ Easy to configure query defaults

### 3. Middleware Pattern

**Problem**: Auth logic duplicated across pages

**Solution**: Centralized middleware for auth and routing

```tsx
// All requests go through middleware
export const onRequest = defineMiddleware(async (context, next) => {
  // Validate auth
  // Store user in context.locals
  // Apply redirects
  return next();
});
```

**Benefits**:
- ✅ Single source of truth for auth
- ✅ Consistent redirect logic
- ✅ Token available to API proxies

### 4. Container/Presentational Pattern

**Problem**: Components mix data fetching and UI

**Solution**: Separate data (container) from presentation

```tsx
// Container: Handles data fetching
function EquipmentSearchContainer() {
  const { data, isLoading } = useQuery(...);
  return <EquipmentGrid items={data} isLoading={isLoading} />;
}

// Presentational: Handles UI rendering
function EquipmentGrid({ items, isLoading }: Props) {
  return <div>...</div>;
}
```

**Benefits**:
- ✅ Easier to test UI in isolation
- ✅ Reusable presentational components
- ✅ Clear separation of concerns

### 5. Custom Hook Pattern

**Problem**: Repeated logic across components

**Solution**: Extract to custom hooks

```tsx
// Reusable search logic
export function useEquipmentSearch() {
  const [params, setParams] = useSearchParams();
  
  return {
    filters: {
      search: params.get('search') || '',
      typeId: params.get('type_id'),
    },
    updateFilter: (key, value) => {
      // Update URL params
    },
  };
}
```

**Benefits**:
- ✅ Reusable across components
- ✅ Testable in isolation
- ✅ Encapsulates complex logic

### 6. Type-Safe Transformer Pattern

**Problem**: Backend sends snake_case flat DTOs, frontend needs camelCase nested types

**Solution**: 4-layer transformation architecture

```
Backend (Go)     →  Validators  →  Transformers  →  Frontend Types
snake_case JSON      (Zod)         (Functions)      camelCase nested
```

#### Layer 1: Backend DTO Types

Define exact backend structure in `types.ts`:

```typescript
// Backend DTO Types (snake_case - matches Go JSON)
export interface EquipmentDTO {
  id: string;
  internal_id: string;
  type_id: string;
  type_name: string;
  credit_cost_per_day: number;
  // ... snake_case fields
}

export interface EquipmentListResponseDTO {
  equipment: EquipmentDTO[];
  pagination: PaginationResponseDTO;
}
```

#### Layer 2: Runtime Validators

Zod schemas in `lib/validators/equipment.validator.ts`:

```typescript
import { z } from 'zod';

export const equipmentDTOSchema = z.object({
  id: z.string().uuid(),
  internal_id: z.string().min(1),
  type_id: z.string().uuid(),
  type_name: z.string().min(1),
  credit_cost_per_day: z.number().int().min(0),
  // ... validate all backend fields
});

export const equipmentListResponseDTOSchema = z.object({
  equipment: z.array(equipmentDTOSchema),
  pagination: paginationResponseDTOSchema,
});
```

#### Layer 3: Transformer Functions

Transform in `lib/transformers/equipment.transformer.ts`:

```typescript
import type { EquipmentDTO } from '@/types';
import type { EquipmentSearchItem } from '@/types';
import { equipmentDTOSchema } from '@/lib/validators/equipment.validator';

export function transformEquipmentDTO(dto: unknown): EquipmentSearchItem {
  // Runtime validation
  const validated = equipmentDTOSchema.safeParse(dto);
  
  if (!validated.success) {
    console.error('Validation failed', validated.error.format());
    throw new EquipmentTransformError('Invalid data', dto);
  }

  // Transform: snake_case → camelCase, flat → nested
  return {
    id: validated.data.id,
    name: validated.data.name ?? 'Unnamed',
    typeId: validated.data.type_id,
    type: {
      id: validated.data.type_id,
      name: validated.data.type_name,
      creditCostPerDay: validated.data.credit_cost_per_day,
    },
    // ... transform all fields
  };
}
```

#### Layer 4: API Integration

Auto-transform in `lib/api/equipment-api.ts`:

```typescript
import { transformEquipmentListResponse } from '@/lib/transformers/equipment.transformer';

export const equipmentApi = {
  async list(params) {
    const response = await api.get('/api/equipment', params);
    // Automatic transformation
    return transformEquipmentListResponse(response.data);
  }
};
```

#### Optional Layer 5: Custom Hooks

Encapsulate in `hooks/use-equipment-api.ts`:

```typescript
export function useEquipmentList(filters) {
  return useQuery({
    queryKey: ['equipment', filters],
    queryFn: () => equipmentApi.list(filters), // Returns transformed data
  });
}
```

#### Component Usage (Final Result)

Components use clean, transformed data:

```tsx
function EquipmentSearchContainer() {
  // ✅ Data is already transformed!
  const { data, isLoading } = useEquipmentList(filters);
  
  const equipment = data?.equipment ?? []; // camelCase, nested
  
  return <EquipmentGrid items={equipment} />;
}
```

**Benefits**:
- ✅ **Automated**: Transformers run automatically via API layer
- ✅ **Type-Safe**: Full TypeScript safety throughout
- ✅ **Maintainable**: Update one file when backend changes
- ✅ **Resilient**: Runtime validation catches bad data
- ✅ **Error Handling**: Custom errors with detailed logging
- ✅ **Testable**: Each layer testable in isolation

**File Organization**:
```
src/
├── types.ts                                # Backend DTOs + Frontend types
├── lib/
│   ├── validators/equipment.validator.ts   # Zod schemas
│   ├── transformers/equipment.transformer.ts # Transform functions
│   └── api/equipment-api.ts                # API with auto-transform
└── hooks/
    └── use-equipment-api.ts                 # Query hooks
```

**Error Flow**:
```
Backend sends invalid data
  ↓
Zod validation catches it
  ↓
Console.error with details
  ↓
Throw EquipmentTransformError
  ↓
Component shows error state
```

**Example Error Output**:
```javascript
// Console shows:
Equipment DTO validation failed {
```
  errors: { credit_cost_per_day: ["Expected number, received string"] },
  receivedData: { /* actual data */ }
}
```

#### Bidirectional Transformers (Outgoing Data)

**Problem**: Frontend needs to send data to backend in snake_case format

**Solution**: Create reverse transformers for commands/mutations

Transform in `lib/transformers/reservation.transformer.ts`:

```typescript
import type { CreateReservationsCommand } from '@/types';

/**
 * Transforms frontend command to backend format
 * Converts camelCase → snake_case for API submission
 */
export function transformCreateReservationsCommand(
  command: CreateReservationsCommand
): unknown {
  return {
    reservations: command.reservations.map((item) => ({
      equipment_id: item.equipmentId,
      start_date: item.startDate,
      end_date: item.endDate,
    })),
    ...(command.userId && { user_id: command.userId }),
  };
}
```

**Usage in Components**:

```tsx
import { transformCreateReservationsCommand } from '@/lib/transformers/reservation.transformer';

const handleSubmit = async () => {
  // 1. Create command with camelCase (TypeScript-safe)
  const command: CreateReservationsCommand = {
    reservations: items.map(item => ({
      equipmentId: item.id,
      startDate: startDate,
      endDate: endDate,
    })),
  };

  // 2. Transform to backend format (snake_case)
  const backendCommand = transformCreateReservationsCommand(command);

  // 3. Send to API
  const response = await fetch('/api/reservations', {
    method: 'POST',
    body: JSON.stringify(backendCommand),
  });
};
```

**Benefits**:
- ✅ **Consistency**: Same pattern for both directions
- ✅ **Type Safety**: Frontend code uses TypeScript types
- ✅ **Single Source of Truth**: Transformation logic in one place
- ✅ **Maintainable**: Easy to update when backend changes
- ✅ **Reusable**: Same transformer used across all components

**Complete Bidirectional Flow**:
```
Frontend (camelCase)
  ↓
Outgoing Transformer (camelCase → snake_case)
  ↓
API Proxy
  ↓
Backend (snake_case)
  ↓
Response (snake_case)
  ↓
Incoming Transformer (snake_case → camelCase)
  ↓
Frontend (camelCase)
```

### 7. Error Boundary Pattern

**Problem**: Component errors crash entire app

**Solution**: Wrap risky components with error boundaries

```tsx
<ErrorBoundary>
  <ComplexComponent />
</ErrorBoundary>
```

**Benefits**:
- ✅ Graceful error handling
- ✅ Can show fallback UI
- ✅ Prevents full app crashes

---

## File Size Guidelines

Keep files focused and maintainable:

- **Components**: Max ~200-300 lines
- **Utilities**: Max ~150 lines
- **Types**: Group related types, split if >500 lines
- **API Proxies**: Max ~100 lines (should be simple)

If a file grows too large:
1. Extract helper functions to utilities
2. Split into multiple components
3. Move types to separate file

---

## Import Organization

Order imports consistently:

```tsx
// 1. External libraries
import * as React from "react";
import { useQuery } from "@tanstack/react-query";

// 2. UI components (external)
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 3. Internal components
import { EquipmentCard } from "./EquipmentCard";
import { FilterSidebar } from "./FilterSidebar";

// 4. Hooks
import { useEquipmentSearch } from "@/hooks/use-equipment-search";

// 5. Utilities
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// 6. Types
import type { EquipmentSearchItem } from "@/types";
```

---

## Related Documentation

- [Coding Standards](./coding_standards.md)
- [Astro Guidelines](../.agent/rules/astro.md)
- [React Guidelines](../.agent/rules/react.md)
- [Frontend Guidelines](../.agent/rules/frontend.md)
