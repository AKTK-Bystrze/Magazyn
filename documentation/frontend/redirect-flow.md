# Redirect Flow Architecture

**Last Updated**: 2025-03-14
**Version**: 2.0  

---

## Overview

This document describes the centralized redirect architecture. The system uses `RedirectManager` for all redirect decisions.

---

## High-Level Flow

```mermaid
graph TD
    A[User Request] --> B{Entry Point}
    B -->|Server-Side| C[Middleware]
    B -->|Client-Side| D[AuthListener]
    
    C --> E[RedirectManager.getRedirectForAuthState]
    D --> E
    
    E --> F{Authentication State}
    F -->|Unauthenticated| G[Redirect to /login]
    F -->|Authenticated| H{Account Status}
    
    H -->|Disabled| I[Redirect to /account-disabled]
    H -->|Enabled| J{Current Path Check}
    
    J -->|Login Page| K[Redirect to Default Route]
    J -->|Account-Disabled Page| K
    J -->|Root Path| K
    J -->|Valid Protected Page| L[Continue - No Redirect]
    
    K --> M{Role-Based Routing}
    M -->|admin/super_admin| N[/admin]
    M -->|user| O[/dashboard]
    
    G --> P[URL Validation]
    I --> P
    N --> P
    O --> P
    
    P --> Q{Safe Redirect?}
    Q -->|Yes| R[Execute Redirect]
    Q -->|No| S[Use Fallback Route]
    S --> R
```

---

## Redirect Decision Flow

### 1. Unauthenticated Users

```mermaid
stateDiagram-v2
    [*] --> CheckAuth
    CheckAuth --> IsOnLogin: No User
    IsOnLogin --> NoRedirect: Yes (already on login)
    IsOnLogin --> RedirectToLogin: No
    RedirectToLogin --> AddReturnURL: Path != /
    AddReturnURL --> [*]: /login?redirect=<path>
    RedirectToLogin --> [*]: /login (from /)
```

**Logic**:
- If already on `/login` → No redirect
- From root `/` → Redirect to `/login`
- From any other path → Redirect to `/login?redirect=<encoded-path>`

---

### 2. Disabled Users

```mermaid
stateDiagram-v2
    [*] --> CheckEnabled
    CheckEnabled --> IsOnDisabledPage: User Disabled
    IsOnDisabledPage --> NoRedirect: Yes
    IsOnDisabledPage --> RedirectToDisabled: No
    RedirectToDisabled --> [*]: /account-disabled
```

**Logic**:
- All disabled users → `/account-disabled` (regardless of role)
- Already on `/account-disabled` → No redirect
- **Security**: Disabled admins cannot access admin panel

---

### 3. Enabled Users

```mermaid
stateDiagram-v2
    [*] --> CheckPath
    CheckPath --> OnDisabledPage: Enabled User
    OnDisabledPage --> RedirectAway: Yes
    OnDisabledPage --> CheckIfLogin: No
    
    CheckIfLogin --> HandleLogin: On /login
    CheckIfLogin --> CheckIfRoot: Not on /login
    
    HandleLogin --> CheckRedirectParam
    CheckRedirectParam --> ValidateURL: Has redirect param
    CheckRedirectParam --> GetDefaultRoute: No param
    ValidateURL --> GetDefaultRoute: Invalid URL
    ValidateURL --> UseParam: Valid URL
    
    CheckIfRoot --> GetDefaultRoute: On /
    CheckIfRoot --> NoRedirect: On valid page
    
    GetDefaultRoute --> CheckRole
    CheckRole --> AdminRoute: admin/super_admin
    CheckRole --> UserRoute: user
    
    RedirectAway --> CheckRole
    AdminRoute --> [*]: /admin
    UserRoute --> [*]: /dashboard
    UseParam --> [*]: <safe-redirect>
    NoRedirect --> [*]
```

**Logic**:
- On `/account-disabled` → Redirect to default route (account re-enabled)
- On `/login` → Redirect to default route or safe redirect param
- On `/` → Redirect to default route based on role
- On valid protected page → No redirect

---

## RedirectManager Architecture

### Class Structure

```typescript
class RedirectManager {
  // Public API
  static getRedirectForAuthState(
    user: User | null,
    sessionInfo: SessionInfo | null,
    currentPath: string,
    redirectParam: string | null,
    origin: string
  ): string | null
}
```

### Key Methods

#### `getRedirectForAuthState()`
**Purpose**: Single source of truth for ALL redirect decisions

**Parameters**:
- `user`: Supabase user object (null if not authenticated)
- `sessionInfo`: Fresh session data from backend (null if not fetched)
- `currentPath`: Current URL pathname
- `redirectParam`: Optional redirect parameter from query string
- `origin`: Application origin (e.g., 'http://localhost:4321')

**Returns**: URL to redirect to, or `null` if no redirect needed

**Decision Tree**:
1. If `!user` → Login redirect with return URL
2. If `!sessionInfo.isEnabled` → `/account-disabled`
3. If enabled on `/account-disabled` → Default route
4. If on `/login` → Default route or safe redirect param
5. If on `/` → Default route
6. Else → `null` (no redirect)

---

## URL Validation & Security

### Validation Flow

```mermaid
graph LR
    A[User Input URL] --> B[isSafeRedirect]
    B --> C{Same Origin?}
    C -->|No| D[REJECT - External URL]
    C -->|Yes| E{In Whitelist?}
    E -->|No| F[REJECT - Not Whitelisted]
    E -->|Yes| G[ACCEPT]
    
    D --> H[validateRedirectUrl]
    F --> H
    G --> I[Use URL]
    H --> J[Use Fallback]
```

### Security Measures

**1. Origin Validation**
- Ensures URL has same origin (protocol + hostname + port)
- Blocks: `https://evil.com`, `http://localhost:3000`, `//evil.com`

**2. Whitelist Validation**
- Only allows routes defined in `ROUTES` config
- Current whitelist: `/login`, `/admin`, `/dashboard`, `/account-disabled`

**3. Role-Based Validation** 🆕
- Redirect targets are validated against user's role
- Admin routes (`/admin/*`) require `admin` or `super_admin` role
- Regular users cannot access admin routes even via redirect parameter

**4. Attack Vector Protection**
```typescript
// ❌ Blocked
isSafeRedirect('https://evil.com', origin)           // External
isSafeRedirect('javascript:alert(1)', origin)        // XSS
isSafeRedirect('data:text/html,<script>', origin)   // XSS
isSafeRedirect('/secret-backdoor', origin)           // Not whitelisted

// ✅ Allowed
isSafeRedirect('/admin', origin)                     // Whitelisted (role checked separately)
isSafeRedirect('/dashboard?tab=overview', origin)   // Query params OK

// 🔒 Role Validation (after URL validation)
// User with role='user' tries to redirect to /admin
const safeUrl = validateRedirectUrl('/admin', origin);
isRedirectAllowedForRole(safeUrl, 'user'); // false - blocked!
```

---

## Authorization Architecture

### Single Source of Truth

```mermaid
graph TD
    A[User Login] --> B[Backend Fetches Profile]
    B --> C[Database with RLS]
    C --> D[Fresh sessionInfo]
    D --> E[sessionInfo.role]
    
    E --> F[Middleware Uses sessionInfo.role]
    E --> G[AuthListener Uses sessionInfo.role]
    E --> H[Pages Use sessionInfo.role]
    
    I[user_metadata.role] -.->|NEVER USED| J[❌ Stale Data]
    
    style E fill:#90EE90
    style I fill:#FFB6C1
    style J fill:#FFB6C1
```

### Why sessionInfo.role Only?

**Problem with `user_metadata.role`**:
- Stale data (cached in JWT)
- Not updated when admin changes user role
- Demoted user could retain admin access

**Solution with `sessionInfo.role`**:
- Fresh from database on every request
- Protected by Row Level Security (RLS)
- Always reflects current user permissions

**Example**:
```typescript
// ❌ WRONG - Can be stale
const role = user.user_metadata?.role || sessionInfo?.role;

// ✅ CORRECT - Always fresh
const role = sessionInfo?.role;
if (!role) {
  return redirect('/login'); // Fail-safe
}
```

---

## Cookie Management

### Cookie Flow (Automatic via @supabase/ssr)

```mermaid
sequenceDiagram
    participant Client
    participant AuthListener
    participant Supabase as @supabase/ssr
    participant Browser
    
    Client->>AuthListener: SIGNED_IN event
    AuthListener->>Supabase: setSession(token)
    Supabase->>Browser: Auto-set HTTP cookies (sb-*-auth-token)
    Browser-->>AuthListener: Cookies set
    
    AuthListener->>Browser: window.location.replace(route)
```

### Cookie Attributes

**Automatically managed by `@supabase/ssr`**:

```typescript
// Cookie name format: sb-<project-ref>-auth-token
// Example: sb-gwamxxqarkcpvgzvpanc-auth-token
//
// Attributes (set automatically):
// - path=/
// - SameSite=Lax (CSRF protection)
// - Accessible by both browser and server
```

**Why @supabase/ssr?**
- ✅ No manual cookie management needed
- ✅ Consistent cookie handling between browser/server
- ✅ Automatic cleanup on signOut()
- ✅ PKCE flow support built-in

---

## Integration Points

### Middleware (Server-Side)

**File**: `frontend/src/middleware/index.ts`

**Flow**:
1. Fetch user session from Supabase
2. Fetch `sessionInfo` from backend `/api/session`
3. Call `RedirectManager.getRedirectForAuthState()`
4. If redirect needed, validate URL and redirect
5. Otherwise, continue to page

**Key Code**:
```typescript
const redirectTo = RedirectManager.getRedirectForAuthState(
  user,
  sessionInfo,
  pathname,
  redirectParam,
  url.origin
);

if (redirectTo) {
  return Response.redirect(new URL(redirectTo, url.origin), 302);
}
```

---

### AuthListener (Client-Side)

**File**: `frontend/src/components/auth/AuthListener.tsx`

**Flow**:
1. Listen for Supabase auth state changes
2. On `SIGNED_IN`, set auth cookie
3. Fetch `sessionInfo` from backend
4. Call `RedirectManager.getRedirectForAuthState()`
5. If redirect needed, wait for cookie then redirect
6. On `SIGNED_OUT`, clear cookie

**Key Code**:
```typescript
const redirectTo = RedirectManager.getRedirectForAuthState(
  user,
  sessionInfo,
  pathname,
  redirectParam,
  origin
);

if (redirectTo && pathname !== redirectTo) {
  await waitForCookieAndRedirect(accessToken, redirectTo);
}
```

---

## Route Configuration

### Centralized Routes

**File**: `frontend/src/lib/config/routes.ts`

```typescript
export const ROUTES = {
  PUBLIC: {
    LOGIN: '/login',
  },
  PROTECTED: {
    ADMIN: '/admin',
    DASHBOARD: '/dashboard',
    ACCOUNT_DISABLED: '/account-disabled',
  },
} as const;
```
---

## Error Handling

### Fallback Behavior

**When Redirects Fail**:
1. Invalid URL → Use fallback route
2. External URL → Use fallback route
3. Non-whitelisted path → Use fallback route
4. No sessionInfo → Redirect to `/login` (fail-safe)
5. Unknown role → Default to `/dashboard`

---

## Performance Considerations

### Optimization Strategies

1. **Single Session Fetch**
   - Middleware and AuthListener share session data
   - No duplicate network calls

2. **Static RedirectManager**
   - No instance creation overhead
   - Shared history across calls

3. **Early Returns**
   - Checks are ordered by frequency
   - Most common cases return early

4. **History Cleanup**
   - Auto-cleanup prevents memory leaks
   - Only recent redirects tracked

---

## Testing

### Coverage

- **Unit Tests**: ~80 test cases
- **Security Tests**: All OWASP attack vectors
- **Integration Tests**: End-to-end flows
- **Coverage**: >80% for all redirect logic

### Key Test Scenarios

✅ Unauthenticated access
✅ Disabled user handling
✅ Role-based redirects
✅ Security validation
✅ Edge cases (null, empty, malformed)

---

**Next**: See [Frontend Architecture](./architecture.md) and [Coding Standards](./coding_standards.md) for implementation details.
