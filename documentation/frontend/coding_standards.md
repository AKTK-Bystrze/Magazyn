# Frontend Coding Standards

> **Purpose**: Comprehensive guidelines for contributing to the frontend codebase, incorporating best practices and lessons learned from production issues.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Naming Conventions](#naming-conventions)
3. [Type Safety & Data Contracts](#type-safety--data-contracts)
4. [API Architecture](#api-architecture)
5. [React Query Setup](#react-query-setup)
6. [Authentication & Middleware](#authentication--middleware)
7. [Data Transformation](#data-transformation)
8. [Environment Configuration](#environment-configuration)
9. [Component Development](#component-development)
10. [Error Handling](#error-handling)
11. [Quality Assurance](#quality-assurance)
12. [Documentation Standards](#documentation-standards)
13. [Common Pitfalls](#common-pitfalls)

---

## Core Principles

### 1. Type Safety First

**Always define types before writing implementation code.**

```tsx
// ❌ BAD: Using `any` or generic objects
const data = await api.get('/endpoint');
const items = data?.data || [];

// ✅ GOOD: Explicit type definitions
interface EquipmentResponse {
  equipment: EquipmentSearchItem[];
  pagination: PaginationMeta;
}

const { data } = await api.get<EquipmentResponse>('/endpoint');
const items = data?.equipment || [];
```

### 2. Fail Fast, Fail Clearly

Use early returns and guard clauses to handle edge cases immediately.

```tsx
// ❌ BAD: Nested conditions
function processData(data: unknown) {
  if (data) {
    if (Array.isArray(data)) {
      // ... lots of code
    }
  }
}

// ✅ GOOD: Guard clauses
function processData(data: unknown) {
  if (!data) return [];
  if (!Array.isArray(data)) {
    console.error('Expected array, got:', typeof data);
    return [];
  }
  
  // Happy path at the end
  return data.map(transform);
}
```

### 3. Documentation is Code

Treat documentation with the same care as code - it should be accurate, up-to-date, and reviewed.

---

## Naming Conventions

### Quick Reference

| Item | Convention | Example |
|------|-----------|---------|
| React Component File | PascalCase | `EquipmentCard.tsx` |
| Astro Page File | kebab-case | `account-disabled.astro` |
| Utility File | kebab-case | `cookie-utils.ts` |
| Component Name | PascalCase | `function EquipmentCard()` |
| Props Interface | ComponentName + Props | `EquipmentCardProps` |
| Event Handler | handle + Action | `handleSubmit` |
| Callback Prop | on + Action | `onSelect` |
| Boolean Function/Variable | is/has/can/should | `isAuthenticated()`, `isLoading` |
| Constant | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Type/Interface | PascalCase | `EquipmentSearchItem` |
| CSS Class | kebab-case | `equipment-card` |
| API Endpoint | kebab-case | `/api/equipment-types` |
| Custom Hook | use + Name | `useEquipmentSearch` |
| Directory | kebab-case | `components/equipment/` |

### File Naming

```
✅ EquipmentCard.tsx           (React component)
✅ login.astro                 (Astro page → /login)
✅ pages/api/equipment/index.ts (API route → GET /api/equipment)
✅ cookie-utils.ts             (Utility)
✅ types.ts                    (Shared types)

❌ equipment.tsx               (should be PascalCase)
❌ Login.astro                 (should be kebab-case)
❌ CookieUtils.ts              (should be kebab-case)
```

### Component Naming

```tsx
// ✅ GOOD: Clear, specific names with proper props interface
interface EquipmentCardProps {
  item: EquipmentSearchItem;
  onSelect: (id: string) => void;
}

export function EquipmentCard({ item, onSelect }: EquipmentCardProps) { }

// ❌ BAD: Generic or unclear
interface Props { }
export function Card() { }
```

### Function Naming

```tsx
// ✅ Event Handlers (internal)
const handleSubmit = () => { };
const handleFilterChange = (key: string, value: any) => { };

// ✅ Callback Props (passed to children)
interface Props {
  onSelect: (id: string) => void;
  onFilterChange: (key: string, value: any) => void;
}

// ✅ Utility Functions
function buildHeaders(): Headers { }
function validateToken(token: string): boolean { }
function transformEquipment(data: EquipmentDTO): Equipment { }

// ✅ Boolean Functions
function isAuthenticated(user: User | null): boolean { }
function hasPermission(role: string): boolean { }
```

### Variable Naming

```tsx
// ✅ Constants
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 25;

// ✅ Configuration
const backendUrl = import.meta.env.PUBLIC_BACKEND_URL;

// ✅ Boolean Variables
const isLoading = true;
const hasError = false;
const shouldShowModal = user?.role === 'admin';

// ✅ Arrays (plural)
const items = [...];
const equipmentTypes = [...];
```

### UI Constants & Strings

All Polish UI strings are centralized in `lib/config/constants/`. See [Architecture - Constants Pattern](./architecture.md#7-constants--i18n-pattern) for full details.

**Import Pattern**:
```tsx
// ✅ Import from barrel (most common)
import { 
  RESERVATION_STATUS,
  CORE_UI_STRINGS,
  EQUIPMENT_FILTER_UI_STRINGS,
} from '@/lib/config/constants';

// ✅ Import from domain (focused imports)
import { RESERVATION_STATUS } from '@/lib/config/constants/reservation';

// ❌ Don't hardcode Polish strings in components
<Button>Anuluj</Button>

// ✅ Use constants
<Button>{CORE_UI_STRINGS.CANCEL}</Button>
```

**Key Rules**:
1. **Never hardcode Polish strings** - Use constants for i18n readiness
2. **Status enums must match database** - Files marked ⚠️ in `constants/` are crucial
3. **Reuse `CORE_UI_STRINGS`** for common actions like Save, Cancel, Loading
4. **Add new strings to appropriate domain file** - Don't scatter in components

### Type & Interface Naming

```tsx
// ✅ GOOD: PascalCase, descriptive, no Hungarian notation
interface EquipmentSearchItem { }
interface PaginationMeta { }
type EquipmentStatus = 'ok' | 'broken' | 'blocked';

// ❌ BAD
interface IEquipmentSearchItem { }  // No 'I' prefix
interface Item { }  // Too generic
```

### API Route Naming

```
✅ GET  /api/equipment
✅ GET  /api/equipment/{id}
✅ GET  /api/equipment-types
✅ POST /api/auth/login

❌ GET  /api/equipments          (avoid plural 's' in our convention)
❌ GET  /api/EquipmentTypes      (should be kebab-case)
❌ GET  /api/get-equipment       (no verb in path)

Query Parameters (snake_case to match backend):
✅ GET /api/equipment?type_id=123&status=ok&page=1
❌ GET /api/equipment?typeId=123  (camelCase)
```

---

## Type Safety & Data Contracts

### Define Response Interfaces

Always match backend response structures exactly in your types.

**Problem**: Backend returned `{ equipment: [], pagination: {} }` but code expected `{ data: [], pagination: {} }`.

```tsx
// types.ts
export interface EquipmentListResponse {
  equipment: EquipmentSearchItem[];  // Match exact field name from backend
  pagination: PaginationMeta;
}

// Component
const { data } = useQuery({
  queryFn: () => api.get<EquipmentListResponse>('/api/equipment')
});

const items = data?.equipment || []; // Type-safe access
```

### Field Name Consistency

```tsx
// ❌ BAD: No type checking
<Input value={filters.q || ""} />

// ✅ GOOD: TypeScript validates at compile time
interface SearchParams {
  search?: string;
  typeId?: string;
  status?: string;
}

<Input value={filters.search || ""} />  // Type error if using 'q'
```

### Import All Required Types

```tsx
// ✅ Always import all types used in your file
import type {
  EquipmentSearchItem,
  EquipmentType,
  PaginationMeta,  // Don't forget utility types
} from "@/types";
```

---

## API Architecture

### Use API Proxies for Backend Calls

**Never call the backend directly from React components.**

```tsx
// ❌ BAD: Direct backend calls
const data = await fetch(`${BACKEND_URL}/equipment`);

// ✅ GOOD: Use frontend API proxies
const data = await api.get('/api/equipment');  // Proxied through Astro
```

### API Proxy Structure

All backend calls should go through Astro API routes in `src/pages/api/`.

**File**: `src/pages/api/equipment/index.ts`

```ts
import type { APIRoute } from 'astro';
import { BACKEND_URL } from '@/lib/config/api';

export const GET: APIRoute = async ({ locals, request }) => {
  // 1. Get auth token from middleware
  const token = locals.accessToken;
  
  // 2. Forward request to backend
  const url = new URL(request.url);
  const backendUrl = new URL(`${BACKEND_URL}/equipment`);
  backendUrl.search = url.search; // Forward query params
  
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // 3. Return response
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

### API Client Pattern

**File**: `src/lib/api.ts`

```ts
export const api = {
  get: async <T>(url: string, params?: Record<string, any>): Promise<{ data: T }> => {
    const headers = await buildHeaders();
    
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const queryString = queryParams.toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw errorData;
    }
    
    const resData = await response.json();
    return { data: resData };
  },
};
```

**Key Rules**:
1. ✅ Call relative URLs (`/api/equipment`) not absolute URLs
2. ✅ Let API proxies handle authentication headers
3. ✅ Let API proxies forward to backend
4. ✅ Return consistent `{ data: T }` structure

---

## React Query Setup

### Always Provide QueryClient

**Problem**: `useQuery` hooks failed with "No QueryClient set" error.

**Solution**: Wrap components using React Query with `QueryClientProvider`.

**File**: `src/components/providers/QueryProvider.tsx`

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create client per component tree for SSR compatibility
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**Usage**:

```tsx
// ✅ Wrap any component tree using useQuery
export default function ComponentWithProvider() {
  return (
    <QueryProvider>
      <ComponentUsingQueries />
    </QueryProvider>
  );
}
```

---

## Authentication & Middleware

### Token Forwarding Pattern

**Problem**: API proxies couldn't access session token because middleware and proxies used different Supabase instances.

**Solution**: Store validated token in `context.locals`.

**File**: `src/middleware/index.ts`

```ts
export const onRequest = defineMiddleware(async (context, next) => {
  // ... get token from cookie or session
  
  if (context.locals.user && token) {
    const sessionInfo = await getUserSession(token);
    
    // ✅ Store both session info AND token
    context.locals.sessionInfo = sessionInfo;
    context.locals.accessToken = token;  // API proxies can access this
  }
  
  return next();
});
```

**File**: `src/env.d.ts`

```ts
declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user: User | null;
      sessionInfo: SessionInfo | null;
      accessToken?: string;  // ✅ Add to type definition
    }
  }
}
```

**File**: `src/pages/api/equipment/index.ts`

```ts
export const GET: APIRoute = async ({ locals }) => {
  // ✅ Get token from locals (validated by middleware)
  const token = locals.accessToken;
  
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // ... forward to backend
};
```

---

## Data Transformation

### Transform Backend Data to Match Frontend Types

**Problem**: Backend returned snake_case flat structure, frontend expected camelCase nested structure.

**Backend Response**:
```json
{
  "equipment": [{
    "id": "123",
    "type_id": "456",
    "type_name": "kayak",
    "credit_cost_per_day": 4,
    "image_url": null
  }]
}
```

**Frontend Type**:
```tsx
interface EquipmentSearchItem {
  id: string;
  typeId: string;
  type: {
    id: string;
    name: string;
    creditCostPerDay: number;
  };
  imagePath: string | null;
}
```

**Solution**: Transform at the boundary (in the component using the data).

```tsx
const { data: equipmentData } = useQuery({
  queryKey: ["equipment", filters],
  queryFn: () => api.get<BackendEquipmentResponse>("/api/equipment", filters),
});

// ✅ Transform backend response to frontend types
const equipment: EquipmentSearchItem[] = (equipmentData?.data?.equipment || []).map((item) => ({
  id: item.id,
  name: item.name,
  description: item.description,
  typeId: item.type_id,
  type: {
    id: item.type_id,
    name: item.type_name,
    creditCostPerDay: item.credit_cost_per_day,
  },
  status: item.status,
  imagePath: item.image_url,
  internalId: item.internal_id,
  isFavorite: item.is_favorite,
}));
```

### Transformation Rules

1. ✅ **Transform at component level**, not in API client
2. ✅ **Document both backend and frontend structures** in comments
3. ✅ **Use explicit type annotations** for transformed data
4. ✅ **Handle missing fields** with defaults or null checks

---

## Environment Configuration

### Environment Variable Format

```bash
# ❌ BAD: Missing protocol
PUBLIC_BACKEND_URL=localhost:8080

# ✅ GOOD: Complete URL with protocol
PUBLIC_BACKEND_URL=http://localhost:8080
```

### Environment Variable Usage

```ts
// src/lib/config/api.ts

// ✅ Provide sensible defaults
export const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:8080';

// ✅ Validate format in development
if (import.meta.env.DEV) {
  try {
    new URL(BACKEND_URL);  // Throws if invalid
  } catch (e) {
    console.error('❌ Invalid BACKEND_URL:', BACKEND_URL);
    console.error('   Must include protocol (http:// or https://)');
  }
}
```

### .env.example Documentation

Always document expected format:

```bash
# Backend API URL - MUST include protocol (http:// or https://)
PUBLIC_BACKEND_URL=http://localhost:8080

# Supabase Configuration
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Component Development

### Mobile Sidebar Pattern for Role-Based Layouts

**Problem**: When creating layouts that support both admin and user roles, the mobile sidebar must respect the user's role.

**Context**: Desktop sidebars can be conditionally rendered in the layout based on `isAdmin` flag, but mobile sidebars are typically embedded inside header components that contain the hamburger menu trigger.

**Solution**: Pass the `isAdmin` prop through to header components so they can conditionally render the appropriate sidebar in their mobile sheet.

**Example Implementation**:

```tsx
// UserHeader.tsx
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { UserSidebar } from './UserSidebar';

interface UserHeaderProps {
  user: { email: string; id: string } | null;
  currentPath: string;
  creditBalance?: number;
  isAdmin?: boolean;  // ✅ Add this prop
}

export function UserHeader({ user, currentPath, creditBalance, isAdmin }: UserHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          {/* ✅ Conditionally render based on role */}
          {isAdmin ? (
            <AdminSidebar 
              currentPath={currentPath} 
              className="h-full border-r-0" 
              onNavigate={() => setIsOpen(false)}
            />
          ) : (
            <UserSidebar 
              currentPath={currentPath} 
              className="h-full border-r-0" 
              onNavigate={() => setIsOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>
      {/* ... rest of header */}
    </header>
  );
}
```

```astro
---
// AppLayout.astro
const isAdmin = sessionInfo?.role === 'admin' || sessionInfo?.role === 'super_admin';
---

<div class="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
  {/* Desktop Sidebar */}
  <div class="!hidden border-r bg-muted/40 lg:!block">
    {isAdmin ? (
      <AdminSidebar client:load currentPath={currentPath} />
    ) : (
      <UserSidebar client:load currentPath={currentPath} />
    )}
  </div>

  {/* Main Content */}
  <div class="flex flex-col">
    {/* ✅ Pass isAdmin to header for mobile sidebar */}
    <UserHeader 
      client:load 
      user={user ? { email: user.email || '', id: user.id } : null}
      currentPath={currentPath}
      creditBalance={sessionInfo?.creditBalance}
      isAdmin={isAdmin}
    />
    <main>
      <slot />
    </main>
  </div>
</div>
```

**Key Rules**:
1. ✅ **Always pass `isAdmin` prop** to header components in shared layouts
2. ✅ **Conditionally render sidebars** in both desktop and mobile views
3. ✅ **Test mobile view** when implementing role-based navigation
4. ❌ **Don't hardcode** a single sidebar type in header components used by multiple roles

---

### React Component Best Practices

```tsx
// ✅ Use functional components with TypeScript
interface ComponentProps {
  items: EquipmentSearchItem[];
  onSelect: (id: string) => void;
}

export function EquipmentList({ items, onSelect }: ComponentProps) {
  // ✅ Early return for edge cases
  if (!items.length) {
    return <EmptyState message="No equipment found" />;
  }
  
  // ✅ Use semantic HTML
  return (
    <div role="list">
      {items.map((item) => (
        <EquipmentCard
          key={item.id}  // ✅ Always use unique keys
          item={item}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
```

### Avoid React Warnings

```tsx
// ❌ BAD: Non-standard props on DOM elements
<Button asChild>
  <a href="/link">Link</a>
</Button>

// ✅ GOOD: Use standard props or style directly
<a 
  href="/link"
  className="btn-styles"  // Apply button styles to anchor
>
  Link
</a>
```

---

## Error Handling

### Graceful Degradation

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['equipment'],
  queryFn: fetchEquipment,
});

// ✅ Handle all states
if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data?.equipment?.length) return <EmptyState />;

// Happy path
return <EquipmentGrid items={data.equipment} />;
```

### Error Boundaries

Wrap complex React trees with error boundaries:

```tsx
// src/components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  // ... implement error boundary
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <EquipmentSearchContainer />
</ErrorBoundary>
```

---

## Quality Assurance

### Linting Tools

The frontend uses automated code quality tools:

- **Prettier**: Code formatting (enforced on commit)
- **TypeScript**: Type checking and compile-time validation
- **Vitest**: Test runner with coverage reporting
- **Husky + lint-staged**: Pre-commit hooks

### Running Linters

```bash
# Format Check (Prettier)
npx prettier --check "src/**/*.{ts,tsx,astro,json,md}"
npx prettier --write "src/**/*.{ts,tsx,astro,json,md}"  # Auto-fix

# Type Checking (TypeScript)
npx astro check
npx tsc --noEmit

# Run Tests
npm test
npm run test:coverage
npm run test:ui
```

### Pre-Commit Hooks

**Automatically enforced via Husky:**

When you commit code, the following happens automatically:
1. **lint-staged** runs Prettier on staged files
2. Files are auto-formatted if needed
3. Commit proceeds only if formatting succeeds

### Unit Tests

Test data transformations and business logic:

```tsx
// ✅ Test transformation logic
describe('Equipment data transformation', () => {
  it('transforms backend response to frontend format', () => {
    const backendData = {
      id: '123',
      type_name: 'kayak',
      credit_cost_per_day: 4,
    };
    
    const result = transformEquipment(backendData);
    
    expect(result.type.name).toBe('kayak');
    expect(result.type.creditCostPerDay).toBe(4);
  });
});
```

### Integration Tests

```tsx
// ✅ Test API proxies
describe('/api/equipment endpoint', () => {
  it('forwards requests to backend with auth token', async () => {
    const response = await GET({
      locals: { accessToken: 'mock-token' },
      request: new Request('http://localhost/api/equipment?page=1'),
    });
    
    expect(response.status).toBe(200);
  });
});
```

### IDE Integration (VS Code)

**Install extensions:**
- Prettier - Code formatter
- Astro
- TypeScript and JavaScript Language Features (built-in)

**Settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[astro]": {
    "editor.defaultFormatter": "astro-build.astro-vscode"
  }
}
```

### Quality Checklist

**Before committing:**
- [ ] No TypeScript errors in IDE
- [ ] All tests passing (`npm test`)
- [ ] Code formatted by Prettier (automatic on commit)
- [ ] No `console.log` statements (unless intentional)
- [ ] No `@ts-ignore` or `any` types (without justification)

**Before pushing:**
- [ ] Run `npx astro check` - no type errors
- [ ] Run `npm run test:coverage` - tests pass, coverage acceptable
- [ ] Check browser console for warnings/errors
- [ ] Load page without authentication → redirects to login
- [ ] Load page with authentication → displays data
- [ ] Test filtering and pagination
- [ ] Verify network requests use correct endpoints

---

## Documentation Standards

### When to Update Documentation

Update documentation when changes affect:

**Architecture Changes**:
- New directories or file structure → Update [architecture.md](./architecture.md)
- New architectural patterns → Add to relevant sections
- Changes to data flow → Update flow diagrams

**Coding Standards**:
- New naming conventions → Update this file
- New patterns or anti-patterns discovered → Add examples
- Error resolution patterns → Document in relevant section

**Domain-Specific Documentation**:
- Changes to redirect logic → Update [redirect-flow.md](./redirect-flow.md)
- New auth flows → Document security implications
- API integration changes → Update API sections

### Approval Process

> [!IMPORTANT]
> All documentation changes require review and approval before merging.

**For Minor Updates** (typo fixes, clarifications):
1. Make the change
2. Note the update in commit message
3. Submit for review

**For Major Updates** (new sections, restructuring):
1. Create a plan outlining changes
2. Request approval before making changes
3. Update documentation after approval
4. Request review of final documentation
5. Incorporate feedback and finalize

### What Requires Documentation

✅ **Always Document**:
- Public API changes
- New components or utilities
- Authentication/authorization changes
- Architectural decisions and trade-offs
- Breaking changes with migration guide
- Security changes (validation, auth flows)

🟡 **Usually Document**:
- Bug fixes that reveal patterns
- Refactoring that changes file locations or import paths

⚪ **Rarely Document**:
- Variable renaming (if follows conventions)
- Code formatting
- Minor optimizations

### Documentation Checklist

Before submitting documentation:

**Accuracy**:
- [ ] Code examples are tested and work
- [ ] File paths are correct and verified
- [ ] Links to other docs resolve correctly
- [ ] No references to removed/deprecated code

**Completeness**:
- [ ] All new concepts explained
- [ ] Examples provided for complex topics
- [ ] Edge cases documented
- [ ] Error handling covered

**Clarity**:
- [ ] Uses consistent terminology
- [ ] Follows existing documentation style
- [ ] Code blocks have language specified
- [ ] Use of emojis/alerts is appropriate

---

## Common Pitfalls

### ❌ Don't: Mix Backend and Frontend Concerns

```tsx
// ❌ BAD: Calling backend directly from component
const data = await fetch(`${BACKEND_URL}/equipment`);

// ✅ GOOD: Use API proxy
const data = await api.get('/api/equipment');
```

### ❌ Don't: Use `any` Type

```tsx
// ❌ BAD: Any defeats TypeScript
const data: any = await fetchData();

// ✅ GOOD: Define proper types
const data: EquipmentResponse = await fetchData();
```

### ❌ Don't: Ignore Type Mismatches

```tsx
// ❌ BAD: Accessing wrong property
const items = data?.data || [];  // Backend returns data.equipment

// ✅ GOOD: Match backend structure
const items = data?.equipment || [];
```

### ❌ Don't: Forget to Handle Loading States

```tsx
// ❌ BAD: No loading state
const { data } = useQuery(...);
return <div>{data.map(...)}</div>;  // Crashes if data is undefined

// ✅ GOOD: Handle all states
if (isLoading) return <LoadingSkeleton />;
if (!data) return <EmptyState />;
return <div>{data.map(...)}</div>;
```

### ❌ Don't: Hard-code Configuration

```tsx
// ❌ BAD: Hard-coded URLs
const response = await fetch('http://localhost:8080/api');

// ✅ GOOD: Use environment variables
const response = await fetch(`${BACKEND_URL}/api`);
```

---

## Quick Reference Checklist

When adding a new feature:

- [ ] Define TypeScript interfaces for all data structures
- [ ] Create API proxy in `src/pages/api/` if calling backend
- [ ] Wrap React components using hooks with `QueryProvider`
- [ ] Transform backend data to match frontend types
- [ ] Handle loading, error, and empty states
- [ ] Add proper TypeScript types to `src/env.d.ts` if extending `Locals`
- [ ] Validate environment variables in development
- [ ] Test authentication token forwarding
- [ ] Write unit tests for transformations
- [ ] Check browser console for warnings/errors

---

## Related Documentation

- [Architecture](./architecture.md)
- [React Guidelines](./standards/react.md)
- [Astro Guidelines](./standards/astro.md)
- [Shared Coding Standards](./standards/shared.md)
- [Vitest Testing](./standards/vitest-unit-testing.md)
- [Shadcn/ui Components](./standards/ui-shadcn-helper.md)
