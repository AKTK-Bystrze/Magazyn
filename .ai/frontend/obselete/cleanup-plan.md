# Frontend Compliance & Cleanup Implementation Plan

**Created**: 2025-12-10  
**Status**: 📋 Planning  
**Estimated Effort**: 4-6 hours  
**Target Date**: TBD

---

## Overview

This plan addresses:
1. **Critical compliance violations** from the compliance review
2. **Code structure improvements** for better maintainability
3. **Architecture refinements** to match documented best practices

---

## Phase 1: Critical Compliance Fixes (Must Do) 🔴

**Estimated Time**: 2 hours  
**Priority**: CRITICAL  
**Blockers**: None

### 1.1 Remove Next.js Directives from React Components

**Issue**: `"use client"` directives are Next.js-specific and incompatible with Astro  
**Files Affected**:
- `src/components/ui/select.tsx`
- `src/components/ui/sheet.tsx`

**Implementation**:
```diff
# src/components/ui/select.tsx
- "use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
```

**Verification**: 
- [ ] Remove `"use client"` from both files
- [ ] Test components still work in Astro
- [ ] No console warnings about directives
- [ ] Run `npm run build` successfully

---

### 1.2 Set Up ESLint Infrastructure

**Issue**: No linting infrastructure despite documentation requirement  
**Files to Create/Modify**:
- `.eslintrc.js` (new)
- `package.json` (modify)

**Implementation**:

**Step 1**: Install dependencies
```bash
npm install --save-dev \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-astro \
  eslint-plugin-react \
  eslint-plugin-react-hooks
```

**Step 2**: Create `.eslintrc.js`
```javascript
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react'],
  settings: {
    react: {
      version: '19.0',
    },
  },
  rules: {
    // Enforce documented standards
    'react/react-in-jsx-scope': 'off', // Not needed in React 19
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
      extends: ['plugin:astro/recommended'],
    },
  ],
};
```

**Step 3**: Add scripts to `package.json`
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.astro",
    "lint:fix": "eslint . --ext .ts,.tsx,.astro --fix"
  }
}
```

**Verification**:
- [ ] `npm run lint` runs without errors
- [ ] ESLint catches "use client" directives
- [ ] Fix any linting errors found
- [ ] Update `.husky/pre-commit` to run linting

---

### 1.3 Add `prerender = false` to All API Routes

**Issue**: API routes may be pre-rendered instead of running server-side  
**Files Affected**: All files in `src/pages/api/`

**Implementation**:
```typescript
// Add to EVERY file in src/pages/api/
import type { APIRoute } from 'astro';

export const prerender = false; // ⬅️ ADD THIS LINE

export const GET: APIRoute = async ({ request, locals }) => {
  // existing code...
};
```

**Files to Update**:
- [ ] `src/pages/api/equipment/index.ts`
- [ ] `src/pages/api/equipment/[id].ts`
- [ ] `src/pages/api/equipment/[id]/index.ts` (if exists)
- [ ] `src/pages/api/equipment-types.ts`
- [ ] All other API route files

**Verification**:
- [ ] Every API route file has `export const prerender = false`
- [ ] API routes return fresh data, not cached responses
- [ ] Authentication works correctly

---

### 1.4 Add Zod Validation to API Routes

**Issue**: API routes forward unvalidated input to backend  
**Files Affected**: 
- `src/pages/api/equipment/index.ts`
- `src/pages/api/equipment-types.ts`

**Implementation**:

**Step 1**: Create validation schemas in `src/lib/schemas/api-schemas.ts` (new file)
```typescript
import { z } from 'zod';

export const equipmentQuerySchema = z.object({
  search: z.string().min(1).max(255).optional(),
  type_id: z.string().uuid().optional(),
  status: z.enum(['ok', 'broken', 'blocked']).optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(25),
});

export type EquipmentQuery = z.infer<typeof equipmentQuerySchema>;
```

**Step 2**: Update API routes to use validation
```typescript
import { equipmentQuerySchema } from '@/lib/schemas/api-schemas';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const rawParams = Object.fromEntries(url.searchParams);
  
  // Validate input
  const result = equipmentQuerySchema.safeParse(rawParams);
  if (!result.success) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid query parameters',
        details: result.error.format() 
      }), 
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  
  // Forward validated params
  const backendUrl = new URL(`${BACKEND_URL}/equipment`);
  Object.entries(result.data).forEach(([key, value]) => {
    if (value !== undefined) {
      backendUrl.searchParams.append(key, String(value));
    }
  });
  
  // ... rest of existing code
};
```

**Verification**:
- [ ] Invalid query params return 400 errors
- [ ] Valid queries work as expected
- [ ] Error messages are helpful for debugging

---

## Phase 2: High Priority Structural Improvements 🟠

**Estimated Time**: 2-3 hours  
**Priority**: HIGH  
**Blockers**: Phase 1 completion recommended

### 2.1 Split `types.ts` into Domain-Specific Files

**Issue**: Single 17KB types file becomes hard to navigate  
**Current**: `src/types.ts` (17,370 bytes)

**Proposed Structure**:
```
src/types/
├── index.ts              # Re-exports all types
├── auth.types.ts         # Auth, User, Session types
├── equipment.types.ts    # Equipment, EquipmentType, DTOs
├── api.types.ts          # API request/response types
└── common.types.ts       # Shared utility types (Pagination, etc.)
```

**Implementation**:

**Step 1**: Create new directory structure
```bash
mkdir -p src/types
```

**Step 2**: Extract domain types

**`src/types/auth.types.ts`**:
```typescript
// Auth-related types
export interface User {
  id: string;
  email: string;
  // ... other user fields
}

export interface SessionInfo {
  user: User;
  role: string;
  // ... other session fields
}

export interface LoginRequest {
  email: string;
}

export interface LoginResponse {
  message: string;
}
```

**`src/types/equipment.types.ts`**:
```typescript
// Equipment domain types
export interface EquipmentSearchItem {
  id: string;
  name: string;
  // ... other equipment fields
}

export interface EquipmentType {
  id: string;
  name: string;
  // ... other type fields
}

// Backend DTOs
export interface EquipmentDTO {
  id: string;
  internal_id: string;
  // ... snake_case backend fields
}

export interface EquipmentListResponseDTO {
  equipment: EquipmentDTO[];
  pagination: PaginationResponseDTO;
}
```

**`src/types/api.types.ts`**:
```typescript
// API request/response types
export interface PaginationMeta {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationResponseDTO {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

export interface EquipmentSearchParams {
  search?: string;
  type_id?: string;
  status?: EquipmentStatus;
  page?: number;
  perPage?: number;
}

export type EquipmentStatus = 'ok' | 'broken' | 'blocked';
```

**`src/types/common.types.ts`**:
```typescript
// Shared utility types
export interface ApiError {
  error: string;
  details?: unknown;
}
```

**`src/types/index.ts`** (barrel export):
```typescript
// Auth types
export type * from './auth.types';

// Equipment types
export type * from './equipment.types';

// API types
export type * from './api.types';

// Common types
export type * from './common.types';
```

**Step 3**: Update all imports

**Before**:
```typescript
import type { EquipmentSearchItem, PaginationMeta } from '@/types';
```

**After** (same import, barrel export handles it):
```typescript
import type { EquipmentSearchItem, PaginationMeta } from '@/types';
```

**Verification**:
- [ ] All existing imports still work
- [ ] TypeScript compilation successful
- [ ] No circular dependency warnings
- [ ] Delete old `src/types.ts` file

---

### 2.2 Consolidate `pages/` Directories

**Issue**: Duplicate `pages/` directory at root level  
**Current Structure**:
```
frontend/
├── pages/          # ❌ Unexpected location
└── src/
    └── pages/      # ✅ Documented location
```

**Investigation Required**:
1. Check what's in root-level `pages/`
2. Verify if it's used or leftover

**Implementation**:

**Step 1**: Audit root-level `pages/` directory
```bash
ls -la frontend/pages/
```

**Step 2**: Decision tree based on findings:

**If empty or obsolete**:
- [ ] Delete `frontend/pages/`
- [ ] Update `.gitignore` if needed

**If contains active files**:
- [ ] Move files to `src/pages/` with proper structure
- [ ] Update any references
- [ ] Delete `frontend/pages/` after verification

**If it's an Astro build artifact**:
- [ ] Add to `.gitignore`
- [ ] Document in `.gitignore` why it exists

**Verification**:
- [ ] `npm run build` still works
- [ ] All routes accessible
- [ ] No broken imports

---

## Phase 3: Medium Priority Refinements 🟡

**Estimated Time**: 2-3 hours  
**Priority**: MEDIUM  
**Blockers**: Phases 1 & 2 recommended

### 3.1 Standardize Test Organization

**Issue**: Tests scattered across source files  
**Current**: Tests next to components (e.g., `AuthListener.test.tsx`)

**Proposed Standard**:
```
src/
├── components/
│   └── auth/
│       ├── AuthListener.tsx
│       └── __tests__/          # ⬅️ NEW: Co-located tests
│           └── AuthListener.test.tsx
├── hooks/
│   └── __tests__/
│       └── use-equipment-search.test.ts
└── lib/
    └── auth/
        └── __tests__/
            └── redirect-manager.test.ts
```

**Alternative** (if preferred):
```
src/
└── __tests__/                  # Single test directory mirroring structure
    ├── components/
    │   └── auth/
    │       └── AuthListener.test.tsx
    ├── hooks/
    └── lib/
```

**Implementation**:

**Step 1**: Choose pattern (recommend co-located `__tests__/`)

**Step 2**: Move existing tests
```bash
# For co-located pattern
mkdir -p src/components/auth/__tests__
mv src/components/auth/AuthListener.test.tsx src/components/auth/__tests__/
```

**Step 3**: Update `vitest.config.ts` to find tests
```typescript
export default defineConfig({
  test: {
    // ... existing config
    include: [
      'src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}', // Keep for flexibility
    ],
  },
});
```

**Step 4**: Document standard in `docs/rules/vitest-unit-testing.md`

**Verification**:
- [ ] All tests still discovered by Vitest
- [ ] `npm test` runs all tests
- [ ] Coverage reports work correctly

---

### 3.2 Create Centralized Constants/Config Files

**Issue**: Magic numbers and hardcoded values scattered across codebase  
**Examples**:
- Debounce delays (300ms in `use-equipment-search.ts`)
- Default pagination (25 items)
- Query cache times

**Proposed Structure**:
```
src/lib/config/
├── api.ts              # ✅ Already exists
├── routes.ts           # ✅ Already exists
├── query.ts            # ⬅️ NEW: React Query defaults
└── constants.ts        # ⬅️ NEW: App-wide constants
```

**Implementation**:

**Step 1**: Create `src/lib/config/constants.ts`
```typescript
// Pagination defaults
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

// Debounce timings (milliseconds)
export const SEARCH_DEBOUNCE_MS = 300;
export const INPUT_DEBOUNCE_MS = 500;

// UI Constants
export const MOBILE_BREAKPOINT = 1024; // lg breakpoint

// Validation limits
export const MAX_SEARCH_LENGTH = 255;
export const MAX_UPLOAD_SIZE_MB = 10;
```

**Step 2**: Create `src/lib/config/query.ts`
```typescript
import { QueryClient } from '@tanstack/react-query';

export const QUERY_STALE_TIME = 5 * 60 * 1000; // 5 minutes
export const QUERY_CACHE_TIME = 10 * 60 * 1000; // 10 minutes

export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_CACHE_TIME,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
};

export function createQueryClient() {
  return new QueryClient(queryConfig);
}
```

**Step 3**: Update `QueryProvider.tsx` to use config
```typescript
import { createQueryClient } from '@/lib/config/query';

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => createQueryClient());
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**Step 4**: Replace magic numbers in code
```typescript
// Before
const [debouncedFilters, setDebouncedFilters] = useState(filters);
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedFilters(filters);
  }, 300); // ❌ Magic number
  return () => clearTimeout(timer);
}, [filters]);

// After
import { SEARCH_DEBOUNCE_MS } from '@/lib/config/constants';

const [debouncedFilters, setDebouncedFilters] = useState(filters);
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedFilters(filters);
  }, SEARCH_DEBOUNCE_MS); // ✅ Named constant
  return () => clearTimeout(timer);
}, [filters]);
```

**Verification**:
- [ ] All magic numbers replaced with constants
- [ ] Constants documented with comments
- [ ] No duplicate constant definitions
- [ ] Tests still pass

---

### 3.3 Expand API Modules to Domain-Specific Files

**Issue**: `src/lib/api.ts` mixes concerns (generic API client)  
**Current**: Single `api.ts` with generic `get` and `post` methods

**Proposed Structure**:
```
src/lib/api/
├── client.ts           # ⬅️ Generic HTTP client
├── equipment-api.ts    # ✅ Already exists (expand)
├── auth-api.ts         # ⬅️ NEW: Auth endpoints
└── types-api.ts        # ⬅️ NEW: Equipment types endpoints
```

**Implementation**:

**Step 1**: Move generic client to `src/lib/api/client.ts`
```typescript
// src/lib/api/client.ts
import { DEFAULT_HEADERS } from '@/lib/config/api';
import { supabase } from '@/lib/supabase';

async function buildHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export const apiClient = {
  async get<T>(url: string, params?: Record<string, any>): Promise<{ data: T }> {
    // ... existing implementation
  },
  
  async post<T>(url: string, data: any): Promise<{ data: T }> {
    // ... existing implementation
  },
  
  async put<T>(url: string, data: any): Promise<{ data: T }> {
    // ... add if needed
  },
  
  async delete<T>(url: string): Promise<{ data: T }> {
    // ... add if needed
  },
};
```

**Step 2**: Create domain-specific APIs

**`src/lib/api/auth-api.ts`**:
```typescript
import { apiClient } from './client';
import type { LoginRequest, LoginResponse } from '@/types';

export const authApi = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/api/auth/login', request);
    return data;
  },
  
  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout', {});
  },
};
```

**Step 3**: Update imports across codebase
```typescript
// Before
import { api } from '@/lib/api';
const response = await api.post('/api/auth/login', { email });

// After
import { authApi } from '@/lib/api/auth-api';
const response = await authApi.login({ email });
```

**Step 4**: Update `src/lib/api/index.ts` (barrel export)
```typescript
export { apiClient } from './client';
export { authApi } from './auth-api';
export { equipmentApi } from './equipment-api';
```

**Verification**:
- [ ] All API calls work as before
- [ ] Import paths updated
- [ ] Tests updated to use new imports
- [ ] TypeScript compilation successful

---

## Phase 4: Low Priority Enhancements 🟢

**Estimated Time**: 1-2 hours  
**Priority**: LOW  
**Blockers**: None (nice-to-have)

### 4.1 Add Asset Organization Structure

**Issue**: No documented structure for static assets  
**Current**: Basic `public/` directory

**Proposed Structure**:
```
public/
├── images/
│   ├── logos/
│   ├── icons/
│   └── equipment/       # Equipment photos
├── fonts/               # Custom fonts
└── favicon.svg

src/assets/              # Build-time assets (if needed)
└── icons/               # SVG icons for inline use
```

**Implementation**:

**Step 1**: Create directory structure
```bash
mkdir -p public/images/{logos,icons,equipment}
mkdir -p public/fonts
mkdir -p src/assets/icons
```

**Step 2**: Document in `docs/architecture.md`
```markdown
### Asset Organization

#### Public Assets (`public/`)
Static assets served as-is:
- `images/` - Categorized images (logos, icons, equipment)
- `fonts/` - Custom web fonts
- `favicon.svg` - Site favicon

#### Build Assets (`src/assets/`)
Assets processed during build:
- `icons/` - SVG icons for inline use
```

**Step 3**: Add example `.gitkeep` files
```bash
touch public/images/equipment/.gitkeep
```

**Verification**:
- [ ] Directory structure created
- [ ] Documentation updated
- [ ] Example assets placed correctly

---

### 4.2 Add i18n Structure (If Multi-Language Needed)

**Issue**: No internationalization support  
**Current**: Hardcoded Polish strings in UI

**Decision Required**: Is multi-language support needed?

**If YES, Proposed Structure**:
```
src/
├── i18n/
│   ├── index.ts         # i18n setup
│   ├── locales/
│   │   ├── pl.json      # Polish (default)
│   │   └── en.json      # English
│   └── utils.ts         # Translation helpers
└── middleware/
    └── index.ts         # Add locale detection
```

**Implementation** (if approved):

**Step 1**: Install i18n library
```bash
npm install --save @astrojs/i18n
```

**Step 2**: Create locale files

**`src/i18n/locales/pl.json`**:
```json
{
  "common": {
    "search": "Szukaj",
    "reset": "Resetuj",
    "loading": "Ładowanie..."
  },
  "equipment": {
    "title": "Sprzęt",
    "inventory": "Inwentarz sprzętu"
  }
}
```

**`src/i18n/locales/en.json`**:
```json
{
  "common": {
    "search": "Search",
    "reset": "Reset",
    "loading": "Loading..."
  },
  "equipment": {
    "title": "Equipment",
    "inventory": "Equipment Inventory"
  }
}
```

**Step 3**: Create translation helper
```typescript
// src/i18n/index.ts
import pl from './locales/pl.json';
import en from './locales/en.json';

const translations = { pl, en };

export function t(key: string, locale: string = 'pl'): string {
  const keys = key.split('.');
  let value: any = translations[locale as keyof typeof translations];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
}
```

**Verification** (if implemented):
- [ ] Translation function works
- [ ] Can switch between locales
- [ ] All UI strings extracted to JSON
- [ ] Documentation updated

**Note**: This is LOW priority - only implement if multi-language support is confirmed requirement.

---

## Phase 5: Documentation Updates 📚

**Estimated Time**: 30 minutes  
**Priority**: MEDIUM  
**Blockers**: Complete relevant phases first

### 5.1 Update `docs/rules/react.md`

**Issue**: Incorrect hook directory reference

**Change**:
```diff
- Extract logic into custom hooks in `src/components/hooks`
+ Extract logic into custom hooks in `src/hooks`
```

**File**: `frontend/docs/rules/react.md:10`

---

### 5.2 Update `docs/architecture.md`

**Changes needed after refactoring**:

1. Update types structure (after Phase 2.1)
2. Add API client structure (after Phase 3.3)
3. Add constants documentation (after Phase 3.2)
4. Add testing pattern (after Phase 3.1)

---

### 5.3 Add `.prettierrc`

**Issue**: Prettier config exists but no explicit rules file

**Implementation**:

Create `.prettierrc`
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "auto"
}
```

**Verification**:
- [ ] Run `npx prettier --check .`
- [ ] Fix any formatting issues
- [ ] Add to `.husky/pre-commit` if not already there

---

## Execution Checklist

### Before Starting
- [ ] Read entire plan
- [ ] Ensure clean git state
- [ ] Create feature branch: `git checkout -b fix/compliance-cleanup`
- [ ] Back up current `.env` files

### Phase Execution
- [ ] **Phase 1**: Critical Compliance Fixes (2 hours)
  - [ ] 1.1 Remove "use client" directives
  - [ ] 1.2 Set up ESLint
  - [ ] 1.3 Add prerender = false
  - [ ] 1.4 Add Zod validation
  - [ ] Run `npm run build` and `npm test`
  - [ ] Commit: `fix: resolve critical compliance violations`

- [ ] **Phase 2**: High Priority Structural Improvements (2-3 hours)
  - [ ] 2.1 Split types.ts
  - [ ] 2.2 Consolidate pages/ directories
  - [ ] Run `npm run build` and `npm test`
  - [ ] Commit: `refactor: improve code structure`

- [ ] **Phase 3**: Medium Priority Refinements (2-3 hours)
  - [ ] 3.1 Standardize tests
  - [ ] 3.2 Create constants
  - [ ] 3.3 Expand API modules
  - [ ] Run `npm run build` and `npm test`
  - [ ] Commit: `refactor: centralize config and expand APIs`

- [ ] **Phase 4**: Low Priority Enhancements (1-2 hours)
  - [ ] 4.1 Add asset structure
  - [ ] 4.2 Consider i18n (if needed)
  - [ ] Commit: `chore: improve asset organization`

- [ ] **Phase 5**: Documentation Updates (30 min)
  - [ ] Update all relevant docs
  - [ ] Commit: `docs: update after refactoring`

### After Completion
- [ ] Final `npm run lint`
- [ ] Final `npm test`
- [ ] Final `npm run build`
- [ ] Update compliance report
- [ ] Create PR with summary
- [ ] Request code review

---

## Risk Assessment

### Low Risk (Can do anytime)
- ✅ Documentation updates
- ✅ Adding constants
- ✅ ESLint setup
- ✅ Asset organization

### Medium Risk (Test thoroughly)
- ⚠️ Splitting types.ts (many imports to update)
- ⚠️ Moving tests (watch for path issues)
- ⚠️ API module expansion

### High Risk (Requires careful validation)
- 🔴 Removing "use client" (test all UI components)
- 🔴 Adding Zod validation (could break API calls)
- 🔴 Consolidating pages/ (verify build process)

---

## Success Criteria

### Phase 1 Success
- ✅ No "use client" directives in codebase
- ✅ `npm run lint` passes with zero errors
- ✅ All API routes have `prerender = false`
- ✅ Invalid API requests return 400 with validation errors

### Phase 2 Success
- ✅ Types organized into logical domain files
- ✅ All imports still work
- ✅ Only one `pages/` directory exists
- ✅ Build process unchanged

### Phase 3 Success  
- ✅ Tests organized consistently
- ✅ No magic numbers in code
- ✅ API calls organized by domain
- ✅ All tests pass

### Overall Success
- ✅ Compliance score increases from 78% to 95%+
- ✅ All critical violations resolved
- ✅ Code more maintainable and navigable
- ✅ Documentation accurate and current

---

## Rollback Plan

If issues arise during any phase:

1. **Immediate Rollback**: `git checkout .` (discard changes)
2. **Partial Rollback**: `git reset --hard <last-good-commit>`
3. **Selective Revert**: `git revert <commit-hash>`

**Always commit after each completed phase** to enable granular rollback.

---

## Appendix: Commands Reference

### Common Commands
```bash
# Linting
npm run lint
npm run lint:fix

# Testing
npm test
npm run test:ui
npm run test:coverage

# Building
npm run build
npm run preview

# Type checking
npx astro check

# Formatting
npx prettier --write .
npx prettier --check .
```

### Git Workflow
```bash
# Create feature branch
git checkout -b fix/compliance-cleanup

# Commit after each phase
git add .
git commit -m "fix: phase 1 - critical compliance fixes"

# Push and create PR
git push origin fix/compliance-cleanup
```

---

## Notes

- **Estimated Total Time**: 7-14 hours (depending on phases completed)
- **Can be done incrementally**: Each phase is independently valuable
- **Prioritize Phase 1**: Critical fixes should be done ASAP
- **Phase 4 is optional**: Only if requirements confirmed
- **Test after each phase**: Don't let issues accumulate

---

**Next Steps**: Review this plan and decide which phases to execute first. Recommend starting with Phase 1 (Critical Fixes) as it has the highest impact on code quality and compliance.
