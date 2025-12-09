# Developer Guide: Redirect System

**Last Updated**: 2025-12-09  
**Version**: 1.0  
**Audience**: Developers working on the Magazyn application

---

## Overview

This guide explains how to work with the centralized redirect system implemented in the Magazyn application. The system uses a single source of truth (`RedirectManager`) for all redirect decisions and provides type-safe utilities for route management.

---

## Table of Contents

1. [Adding a New Route](#adding-a-new-route)
2. [Creating a Protected Page](#creating-a-protected-page)
3. [Using Redirect Utilities](#using-redirect-utilities)
4. [Working with Cookies](#working-with-cookies)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Adding a New Route

### Step 1: Add to Route Constants

Update [routes.ts](file:///e:/bystrze/Magazyn/frontend/src/lib/config/routes.ts):

```typescript
export const ROUTES = {
  PUBLIC: {
    LOGIN: '/login',
    // Add your public route here
    NEW_PUBLIC_ROUTE: '/my-public-page',
  },
  PROTECTED: {
    ADMIN: '/admin',
    DASHBOARD: '/dashboard',
    ACCOUNT_DISABLED: '/account-disabled',
    // Add your protected route here
    NEW_PROTECTED_ROUTE: '/my-protected-page',
  },
} as const;
```

### Step 2: Update TypeScript Types

The types are automatically inferred from `ROUTES`, but if you need custom types:

```typescript
// These are auto-generated, but you can reference them
type PublicRoute = '/login' | '/my-public-page';
type ProtectedRoute = '/admin' | '/dashboard' | '/account-disabled' | '/my-protected-page';
type AppRoute = PublicRoute | ProtectedRoute;
```

### Step 3: Add to URL Validation Whitelist

Update [url-utils.ts](file:///e:/bystrze/Magazyn/frontend/src/lib/auth/url-utils.ts) to allow the route in redirects:

```typescript
export function isAllowedPath(pathname: string): boolean {
  const allowedPaths = [
    ROUTES.PUBLIC.LOGIN,
    ROUTES.PROTECTED.ADMIN,
    ROUTES.PROTECTED.DASHBOARD,
    ROUTES.PROTECTED.ACCOUNT_DISABLED,
    ROUTES.PROTECTED.NEW_PROTECTED_ROUTE, // Add your route here
  ];
  
  // ... rest of function
}
```

> [!IMPORTANT]
> **Security**: Only add routes to the whitelist if they should be allowed as redirect destinations. This prevents open redirect attacks.

### Step 4: Create the Page File

Create your page at `frontend/src/pages/my-protected-page.astro`:

```astro
---
import { ROUTES } from '@/lib/config/routes';

const { user, sessionInfo } = Astro.locals;

// For protected pages, validate authentication
if (!user || !sessionInfo) {
  return Astro.redirect(ROUTES.PUBLIC.LOGIN);
}

// For role-specific pages, validate role
if (!sessionInfo.role || sessionInfo.role !== 'admin') {
  return Astro.redirect(ROUTES.PROTECTED.DASHBOARD);
}
---

<html>
  <head>
    <title>My Protected Page</title>
  </head>
  <body>
    <h1>Welcome, {sessionInfo.email}</h1>
    <!-- Your content here -->
  </body>
</html>
```

---

## Creating a Protected Page

### Authentication Levels

The application supports three levels of page protection:

#### 1. Public Pages (No Authentication)
```astro
---
// No authentication checks needed
import Layout from '@/layouts/Layout.astro';
---
<Layout title="Public Page">
  <h1>Anyone can view this</h1>
</Layout>
```

#### 2. Authenticated Pages (Any Logged-In User)
```astro
---
import { ROUTES } from '@/lib/config/routes';

const { user, sessionInfo } = Astro.locals;

// Redirect if not authenticated
if (!user || !sessionInfo) {
  return Astro.redirect(ROUTES.PUBLIC.LOGIN);
}

// Redirect if account is disabled
if (!sessionInfo.isEnabled) {
  return Astro.redirect(ROUTES.PROTECTED.ACCOUNT_DISABLED);
}
---
<html>
  <body>
    <h1>Authenticated users only</h1>
    <p>Role: {sessionInfo.role}</p>
  </body>
</html>
```

#### 3. Role-Based Pages (Specific Roles Only)
```astro
---
import { ROUTES } from '@/lib/config/routes';
import { isAdmin, hasRole } from '@/lib/auth/role-utils';

const { user, sessionInfo } = Astro.locals;

// Redirect if not authenticated
if (!user || !sessionInfo) {
  return Astro.redirect(ROUTES.PUBLIC.LOGIN);
}

// Redirect if account is disabled
if (!sessionInfo.isEnabled) {
  return Astro.redirect(ROUTES.PROTECTED.ACCOUNT_DISABLED);
}

// Redirect if not authorized (admin or super_admin only)
if (!isAdmin(sessionInfo)) {
  return Astro.redirect(ROUTES.PROTECTED.DASHBOARD);
}
---
<html>
  <body>
    <h1>Admin Panel</h1>
    <p>Welcome, admin!</p>
  </body>
</html>
```

### Security Best Practices for Protected Pages

> [!WARNING]
> **Critical**: Always use `sessionInfo.role` for authorization checks, NEVER use `user.user_metadata.role`

```typescript
// ❌ WRONG - Uses stale data from JWT
const role = user.user_metadata?.role;

// ❌ WRONG - Fallback can use stale data
const role = sessionInfo?.role || user.user_metadata?.role;

// ✅ CORRECT - Fresh from database with RLS
if (!sessionInfo || !sessionInfo.role) {
  return Astro.redirect(ROUTES.PUBLIC.LOGIN);
}
const role = sessionInfo.role;
```

**Why?**
- `user.user_metadata` is cached in the JWT and can be stale
- When an admin changes a user's role, `user_metadata` doesn't update immediately
- A demoted admin could retain admin access if you use `user_metadata`
- `sessionInfo` is fetched fresh from the database on every request with Row Level Security (RLS)

---

## Using Redirect Utilities

### Client-Side Redirects (React Components)

```typescript
import { RedirectManager } from '@/lib/auth/redirect-manager';
import { ROUTES } from '@/lib/config/routes';
import { waitForCookieAndRedirect } from '@/lib/auth/cookie-utils';

function MyComponent() {
  const handleLogin = async (user, sessionInfo) => {
    // Get the appropriate redirect destination
    const redirectTo = RedirectManager.getRedirectForAuthState(
      user,
      sessionInfo,
      window.location.pathname,
      new URLSearchParams(window.location.search).get('redirect'),
      window.location.origin
    );
    
    if (redirectTo) {
      // Wait for cookie to be set, then redirect
      await waitForCookieAndRedirect(accessToken, redirectTo);
    }
  };
}
```

### Server-Side Redirects (Astro Pages)

```astro
---
import { ROUTES } from '@/lib/config/routes';

// Simple redirect
return Astro.redirect(ROUTES.PROTECTED.ADMIN);

// Redirect with query params preservation
const searchParams = new URL(Astro.request.url).searchParams;
return Astro.redirect(`${ROUTES.PUBLIC.LOGIN}?redirect=${encodeURIComponent(pathname)}`);
---
```

### Middleware Redirects

The middleware already handles most redirect logic via `RedirectManager`. You typically don't need to add redirect logic to middleware unless implementing new authentication flows.

---

## Working with Cookies

### Setting the Auth Cookie

```typescript
import { setAuthCookie } from '@/lib/auth/cookie-utils';

// After successful authentication
setAuthCookie(accessToken);
```

### Removing the Auth Cookie

```typescript
import { removeAuthCookie } from '@/lib/auth/cookie-utils';

// On logout
removeAuthCookie();
```

### Checking Cookie Presence

```typescript
import { hasAuthCookie } from '@/lib/auth/cookie-utils';

if (hasAuthCookie()) {
  console.log('User has auth cookie');
}
```

### Getting Cookie Value

```typescript
import { getAuthCookie } from '@/lib/auth/cookie-utils';

const token = getAuthCookie();
```

### Waiting for Cookie (Critical for Redirects)

```typescript
import { waitForCookie, waitForCookieAndRedirect } from '@/lib/auth/cookie-utils';

// Wait for cookie to be set before proceeding
await waitForCookie(300); // 300ms timeout

// Or combine wait + redirect
await waitForCookieAndRedirect(token, '/dashboard');
```

> [!IMPORTANT]
> **Always wait for cookie before redirecting** after login. Browser cookie setting is asynchronous. Redirecting before the cookie is set will cause redirect loops.

---

## Common Patterns

### Pattern 1: Role-Based Default Routes

```typescript
import { getDefaultRouteForUser } from '@/lib/auth/redirect-manager';

const defaultRoute = getDefaultRouteForUser(sessionInfo);
// Returns '/admin' for admin/super_admin
// Returns '/dashboard' for regular users
```

### Pattern 2: Safe Redirect with Validation

```typescript
import { validateRedirectUrl } from '@/lib/auth/url-utils';

const userInputUrl = searchParams.get('redirect');
const safeUrl = validateRedirectUrl(
  userInputUrl,
  window.location.origin,
  '/dashboard' // fallback if invalid
);

window.location.replace(safeUrl);
```

### Pattern 3: Conditional Rendering Based on Role

```astro
---
import { isAdmin, isSuperAdmin } from '@/lib/auth/role-utils';

const { sessionInfo } = Astro.locals;
---

{isAdmin(sessionInfo) && (
  <a href={ROUTES.PROTECTED.ADMIN}>Admin Panel</a>
)}

{isSuperAdmin(sessionInfo) && (
  <a href="/super-admin">Super Admin Settings</a>
)}
```

### Pattern 4: Custom Role Check

```typescript
import { hasRole } from '@/lib/auth/role-utils';

// Check for specific role
if (hasRole(sessionInfo, 'super_admin')) {
  // Super admin only logic
}

// Check for multiple roles
if (hasRole(sessionInfo, 'admin') || hasRole(sessionInfo, 'super_admin')) {
  // Admin or super_admin logic
}
```

---

## Troubleshooting

### Issue: Redirect Loop Detected

**Symptom**: Console shows "🚨 Redirect loop detected"

**Causes**:
1. Redirecting to the same page repeatedly
2. Circular redirects (A → B → A)
3. More than 3 redirects in 5 seconds

**Solution**:
```typescript
// Check redirect history
console.log(RedirectManager.getHistory());

// Reset if needed (for testing only)
RedirectManager.reset();
```

### Issue: User Not Redirected After Login

**Symptom**: User stays on login page after successful authentication

**Cause**: Cookie not set before redirect

**Solution**:
```typescript
// ❌ WRONG - Redirects immediately
setAuthCookie(token);
window.location.replace('/dashboard');

// ✅ CORRECT - Waits for cookie
setAuthCookie(token);
await waitForCookieAndRedirect(token, '/dashboard');
```

### Issue: External URL Allowed in Redirect

**Symptom**: User can be redirected to external sites

**Cause**: URL not validated before redirect

**Solution**:
```typescript
import { validateRedirectUrl } from '@/lib/auth/url-utils';

// Always validate user-provided URLs
const safeUrl = validateRedirectUrl(userUrl, origin, fallback);
window.location.replace(safeUrl);
```

### Issue: Stale Role Data

**Symptom**: User has wrong permissions after role change

**Cause**: Using `user.user_metadata.role` instead of `sessionInfo.role`

**Solution**:
```typescript
// ❌ WRONG
const role = user.user_metadata?.role;

// ✅ CORRECT
if (!sessionInfo?.role) {
  return Astro.redirect(ROUTES.PUBLIC.LOGIN);
}
const role = sessionInfo.role;
```

---

## Best Practices

### ✅ DO

1. **Always use route constants**
   ```typescript
   return Astro.redirect(ROUTES.PROTECTED.ADMIN);
   ```

2. **Always validate redirects**
   ```typescript
   const safe = validateRedirectUrl(userInput, origin, fallback);
   ```

3. **Always use `sessionInfo.role`**
   ```typescript
   const role = sessionInfo.role;
   ```

4. **Always wait for cookies before redirecting**
   ```typescript
   await waitForCookieAndRedirect(token, route);
   ```

5. **Always handle missing sessionInfo**
   ```typescript
   if (!sessionInfo) {
     return Astro.redirect(ROUTES.PUBLIC.LOGIN);
   }
   ```

### ❌ DON'T

1. **Don't hardcode routes**
   ```typescript
   return Astro.redirect('/admin'); // ❌
   ```

2. **Don't trust user input URLs**
   ```typescript
   window.location.replace(params.get('redirect')); // ❌ Open redirect!
   ```

3. **Don't use `user_metadata.role`**
   ```typescript
   const role = user.user_metadata?.role; // ❌ Stale data!
   ```

4. **Don't redirect before cookie is set**
   ```typescript
   setAuthCookie(token);
   window.location.replace('/dashboard'); // ❌ Race condition!
   ```

5. **Don't bypass `RedirectManager`**
   ```typescript
   // ❌ Implement custom redirect logic
   // ✅ Use RedirectManager.getRedirectForAuthState()
   ```

---

## Testing Your Changes

### Unit Tests

If you add new redirect logic, write tests:

```typescript
import { describe, it, expect } from 'vitest';
import { RedirectManager } from '@/lib/auth/redirect-manager';

describe('My new feature', () => {
  it('should redirect correctly', () => {
    const redirect = RedirectManager.getRedirectForAuthState(
      mockUser,
      mockSessionInfo,
      '/my-page',
      null,
      'http://localhost:4321'
    );
    
    expect(redirect).toBe('/expected-route');
  });
});
```

### Manual Testing Checklist

- [ ] Unauthenticated access redirects to login
- [ ] Disabled users redirect to account-disabled
- [ ] Role-based access works correctly
- [ ] No redirect loops occur
- [ ] Cookies are set properly
- [ ] No console errors

---

## Reference

### Key Files

- [routes.ts](file:///e:/bystrze/Magazyn/frontend/src/lib/config/routes.ts) - Route constants
- [redirect-manager.ts](file:///e:/bystrze/Magazyn/frontend/src/lib/auth/redirect-manager.ts) - Redirect logic
- [url-utils.ts](file:///e:/bystrze/Magazyn/frontend/src/lib/auth/url-utils.ts) - URL validation
- [cookie-utils.ts](file:///e:/bystrze/Magazyn/frontend/src/lib/auth/cookie-utils.ts) - Cookie management
- [role-utils.ts](file:///e:/bystrze/Magazyn/frontend/src/lib/auth/role-utils.ts) - Role helpers
- [middleware/index.ts](file:///e:/bystrze/Magazyn/frontend/src/middleware/index.ts) - Server-side redirects
- [AuthListener.tsx](file:///e:/bystrze/Magazyn/frontend/src/components/auth/AuthListener.tsx) - Client-side redirects

### Related Documentation

- [Redirect Flow Architecture](file:///e:/bystrze/Magazyn/frontend/docs/architecture/redirect-flow.md)
- [Security Practices](./security-practices.md)
- [Implementation Plan](./implementation-plan.md)

---

**Last Updated**: 2025-12-09  
**Maintainer**: Development Team
