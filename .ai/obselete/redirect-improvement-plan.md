# Redirect System Improvement Plan

**Date**: 2025-12-22 | **Status**: Draft

---

## Executive Summary

This plan addresses architectural flaws in the current redirect system. Improvements align with Supabase SSR best practices and industry standards.

> [!IMPORTANT]
> The current implementation has a **critical SSR state leakage issue** affecting production under concurrent load.

---

## Current Issues

| Priority | Issue | Impact |
|----------|-------|--------|
| 🔴 High | Static `redirectHistory` leaks across SSR requests | User A's redirects block User B |
| 🟡 Medium | Redirect param not validated against role | User could navigate to `/admin` URL even as regular user |
| 🟡 Medium | Not using `@supabase/ssr` package | Session isolation issues in SSR |

---

## Call Sites (Files Requiring Changes)

| File | Type | Usage |
|------|------|-------|
| [middleware/index.ts](file:///e:/bystrze/Magazyn/frontend/src/middleware/index.ts) | Server-side | `getRedirectForAuthState`, `canRedirect`, `recordRedirect` |
| [AuthListener.tsx](file:///e:/bystrze/Magazyn/frontend/src/components/auth/AuthListener.tsx) | Client-side | `getRedirectForAuthState`, `canRedirect`, `recordRedirect` |
| [redirect-manager.ts](file:///e:/bystrze/Magazyn/frontend/src/lib/auth/redirect-manager.ts) | Core logic | Source of truth (needs refactoring) |

---

## Phase 1: Fix Static State Leakage

### [MODIFY] [redirect-manager.ts](file:///e:/bystrze/Magazyn/frontend/src/lib/auth/redirect-manager.ts)

**Change**: Convert static `redirectHistory` to parameter-based context.

```diff
- private static redirectHistory: Array<{ from: string; to: string; timestamp: number }> = [];

+ // New interface for request-scoped context
+ export interface RedirectContext {
+   history: Array<{ from: string; to: string; timestamp: number }>;
+ }

- static canRedirect(from: string, to: string): boolean
+ static canRedirect(from: string, to: string, ctx: RedirectContext): boolean

- static recordRedirect(from: string, to: string): void
+ static recordRedirect(from: string, to: string, ctx: RedirectContext): void

  static getRedirectForAuthState(
    user: User | null,
    sessionInfo: SessionInfo | null,
    currentPath: string,
    redirectParam: string | null,
    origin: string,
+   ctx: RedirectContext
  ): string | null
```

---

### [MODIFY] [middleware/index.ts](file:///e:/bystrze/Magazyn/frontend/src/middleware/index.ts)

**Change**: Initialize request-scoped context in `Astro.locals`.

```diff
export const onRequest = defineMiddleware(async (context, next) => {
+  // Request-scoped redirect tracking
+  const redirectContext: RedirectContext = { history: [] };

   const redirectTo = RedirectManager.getRedirectForAuthState(
     context.locals.user,
     sessionInfo,
     url.pathname,
     redirectParam,
     url.origin,
+    redirectContext
   );

   if (redirectTo) {
-    if (!RedirectManager.canRedirect(url.pathname, redirectTo)) {
+    if (!RedirectManager.canRedirect(url.pathname, redirectTo, redirectContext)) {
       return new Response('Redirect loop detected', { status: 500 });
     }
-    RedirectManager.recordRedirect(url.pathname, redirectTo);
+    RedirectManager.recordRedirect(url.pathname, redirectTo, redirectContext);
```

---

### [MODIFY] [AuthListener.tsx](file:///e:/bystrze/Magazyn/frontend/src/components/auth/AuthListener.tsx)

**Change**: Use component-scoped context (via `useRef`) for client-side.

```diff
+ import { useRef } from 'react';
+ import type { RedirectContext } from '@/lib/auth/redirect-manager';

  export const AuthListener: React.FC = () => {
+   const redirectContextRef = useRef<RedirectContext>({ history: [] });

    // In redirect calls:
    const redirectTo = RedirectManager.getRedirectForAuthState(
      session.user,
      sessionInfo,
      window.location.pathname,
      redirectParam,
      window.location.origin,
+     redirectContextRef.current
    );
```

---

## Phase 2: Add Role-Based Redirect Validation

### [MODIFY] [redirect-manager.ts](file:///e:/bystrze/Magazyn/frontend/src/lib/auth/redirect-manager.ts)

**Change**: Validate redirect target against user's role before accepting.

```typescript
// NEW helper function
function isRedirectAllowedForRole(path: string, role: string | undefined): boolean {
  if (path.startsWith('/admin')) {
    return role === ADMIN_ROLE || role === SUPER_ADMIN_ROLE;
  }
  return true;
}

// In getRedirectForAuthState, update redirect param handling:
if (redirectParam) {
  const safeRedirect = validateRedirectUrl(redirectParam, origin, ROUTES.PUBLIC.LOGIN);
  if (safeRedirect !== ROUTES.PUBLIC.LOGIN && 
      isRedirectAllowedForRole(safeRedirect, sessionInfo?.role)) {
    return safeRedirect;
  }
  // Fall through to default route if not allowed
}
```

---

## Phase 3: Migrate to `@supabase/ssr`

> [!NOTE]
> This phase modernizes auth to use Supabase's recommended SSR package.

### 3.1 Install Package

```bash
cd frontend && npm install @supabase/ssr
```

---

### 3.2 [NEW] [supabase-ssr.ts](file:///e:/bystrze/Magazyn/frontend/src/lib/auth/supabase-ssr.ts)

Create request-scoped Supabase client factory:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export function createSupabaseServerClient(
  request: Request,
  cookies: AstroCookies
) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key: string) {
          return cookies.get(key)?.value;
        },
        set(key: string, value: string, options: CookieOptions) {
          cookies.set(key, value, options);
        },
        remove(key: string, options: CookieOptions) {
          cookies.delete(key, options);
        },
      },
    }
  );
}
```

---

### 3.3 [MODIFY] [middleware/index.ts](file:///e:/bystrze/Magazyn/frontend/src/middleware/index.ts)

Replace singleton client with per-request client:

```diff
- import { supabaseClient } from "../db/supabase.client";
+ import { createSupabaseServerClient } from "../lib/auth/supabase-ssr";

  export const onRequest = defineMiddleware(async (context, next) => {
-   context.locals.supabase = supabaseClient;
+   const supabase = createSupabaseServerClient(context.request, context.cookies);
+   context.locals.supabase = supabase;

-   const { data: { session } } = await supabaseClient.auth.getSession();
+   // Use getUser() for server-side validation (recommended by Supabase)
+   const { data: { user }, error } = await supabase.auth.getUser();
```

---

### 3.4 [DELETE] Cookie Fallback Logic

Remove manual cookie handling from middleware (lines 31-56) as `@supabase/ssr` handles this:

```diff
-   // Fallback: Check for manual auth cookie if session is missing
-   if (!context.locals.user) {
-     const authCookie = context.cookies.get(AUTH_COOKIE_NAME);
-     // ... fallback logic ...
-   }
```

---

## Verification Plan

### Unit Tests

```bash
cd frontend && npm run test -- src/lib/auth/__tests__/redirect-manager.test.ts
```

**Updates needed** for new context parameter in existing tests.

### E2E Tests

```bash
cd frontend && npx playwright test e2e/tests/auth.spec.ts
```

### Manual Verification

| Test | Steps |
|------|-------|
| Static state isolation | Two tabs, rapid redirects, verify no cross-contamination |
| Role validation | Login as user → go to `/login?redirect=/admin` → verify lands on `/dashboard` |
| SSR client isolation | Check server logs for no "Session found via standard method" after migration |

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Phase 1: API signature | Medium | Update all 2 call sites + tests in same PR |
| Phase 2: Role validation | Low | Adds security |
| Phase 3: `@supabase/ssr` | High | Most testing effort needed |

---

## Phase 4: Update Documentation

### [MODIFY] [redirect-flow.md](file:///e:/bystrze/Magazyn/frontend/docs/redirect-flow.md)

Update to reflect new architecture:

- **Class Structure section**: Update to show `RedirectContext` parameter in method signatures
- **Loop Detection section**: Document request-scoped history instead of static
- **Integration Points**: Update Middleware and AuthListener code snippets
- **Add new section**: "Request-Scoped Context" explaining SSR isolation

---

### [MODIFY] [auth.md](file:///e:/bystrze/Magazyn/frontend/docs/auth.md)

Update after Phase 3 migration:

- Replace singleton client documentation with `@supabase/ssr` factory pattern
- Update cookie handling documentation (now automatic)
- Add `createSupabaseServerClient` usage examples

---

### [MODIFY] [architecture.md](file:///e:/bystrze/Magazyn/frontend/docs/architecture.md)

Update Authentication Flow section:

- Document `@supabase/ssr` as the auth package
- Update middleware diagram to show per-request client creation

---

## Implementation Order

1. **Phase 1** first (fixes critical bug)
2. **Phase 2** next (security improvement)
3. **Phase 3** (largest scope, can be incremental)
4. **Phase 4** last (documentation after implementation complete)
