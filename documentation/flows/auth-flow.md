# Authentication & Token Workflow

> **Purpose**: High-level overview of authentication and token handling across the Magazyn application.

---

## Overview

Magazyn uses **Supabase Auth** for identity management with **JWT tokens** for API authentication. The architecture implements a hybrid SSR/CSR model with centralized redirect logic and role-based access control (RBAC).

### Key Components

| Layer                 | Component        | Responsibility                                                    |
| --------------------- | ---------------- | ----------------------------------------------------------------- |
| **Frontend (SSR)**    | Astro Middleware | Session validation, token refresh, route protection              |
| **Frontend (Client)** | Callback handoff | Reads the magic-link fragment and hands tokens to the server      |
| **Backend**           | Auth Middleware  | JWT validation, user context injection                            |
| **Backend**           | RBAC Middleware  | Role-based endpoint protection                                    |
| **Supabase**          | Auth Service     | User identity, JWT issuance, magic links                          |

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Astro as Astro SSR
    participant Backend as Go Backend
    participant Supabase

    User->>Browser: Access protected page
    Browser->>Astro: Request with cookie
    Astro->>Astro: Check auth cookie
    Astro->>Supabase: Validate token (getUser)
    Supabase-->>Astro: User object
    Astro->>Backend: GET /auth/session (Bearer token)
    Backend->>Supabase: Validate JWT + fetch profile
    Supabase-->>Backend: User + Profile (RLS enforced)
    Backend-->>Astro: SessionInfo (role, isEnabled)
    Astro->>Astro: RedirectManager decision
    Astro-->>Browser: Page or redirect
```

---

## Token Lifecycle

### 1. Token Acquisition (Login)

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Supabase
    participant Callback as Callback page (/api/auth/callback)
    participant Astro as Astro SSR

    User->>Browser: Click magic link
    Browser->>Supabase: Verify OTP token
    Supabase-->>Browser: Redirect with #access_token (fragment)
    Browser->>Callback: Page script reads fragment, POSTs tokens
    Callback->>Supabase: Validate access token (getUser)
    Supabase-->>Callback: User object
    Callback->>Astro: Set HttpOnly magazyn_sid cookie
    Callback->>Browser: Redirect to dashboard/admin
```

### 2. Token Propagation (API Calls)

```
┌─────────────────────────────────────────────────────────────────┐
│ React Component → API Client → Frontend API Proxy → Go Backend │
└─────────────────────────────────────────────────────────────────┘
                         ↓
    1. Cookie sent automatically with request
    2. Astro middleware extracts token from cookie
    3. Token stored in context.locals.accessToken
    4. API proxy adds Authorization: Bearer <token>
    5. Backend middleware validates token
    6. User/Profile injected into request context
```

### 3. Token Validation (Backend)

```go
// Authorization header → Extract Bearer token → Verify with Supabase
token := strings.Split(authHeader, " ")[1]
user, err := repo.GetUser(ctx, token)    // Supabase validates JWT
profile, err := repo.GetProfile(ctx, user.ID, token)  // RLS-enforced fetch
```

---

## Session Management

### Frontend Session Info

Fetched from Go backend at `/auth/session`:

```typescript
interface SessionInfo {
  userId: string;
  role: "user" | "admin" | "super_admin";
  isEnabled: boolean;
  creditBalance: number;
  username: string;
}
```

> **Security**: Always use `sessionInfo.role` from backend (fresh from DB with RLS), never `user_metadata.role` (can be stale).

### Cookie Configuration

**One server-managed, encrypted, HttpOnly cookie** (see `src/lib/auth/session-store.ts`):

| Attribute | Value                    | Purpose                                    |
| --------- | ------------------------ | ------------------------------------------ |
| Name      | `magazyn_sid`            | Encrypted session (AES-256-GCM)            |
| Path      | `/`                      | Site-wide availability                     |
| SameSite  | Lax                      | CSRF protection                            |
| HttpOnly  | Yes                      | Never readable by JavaScript               |
| Max-Age   | 30 days                  | Session lifetime                           |

> **Note**: The cookie holds `userId`, `accessToken`, `refreshToken` and `expiresAt`, encrypted with `SESSION_ENCRYPTION_KEY`. The middleware refreshes tokens server-side 60 s before expiry and updates the cookie. Logout revokes the Supabase session and clears all cookies.

---

## Authorization Layers

### 1. Route Protection (Frontend)

**Astro Middleware** (`src/middleware/index.ts`):

- Validates auth cookie/session
- Fetches `sessionInfo` from backend
- Delegates to `RedirectManager` for routing decisions
- Blocks disabled users from API routes

### 2. API Protection (Frontend)

All `/api/*` routes (except `/api/auth/*`) require authentication:

```typescript
if (!context.locals.user) {
  throw ApiErrors.unauthorized("Authentication required");
}
if (sessionInfo && !sessionInfo.isEnabled) {
  throw ApiErrors.forbidden("Account is disabled");
}
```

### 3. JWT Validation (Backend)

**Auth Middleware** (`internal/middleware/auth/`):

- Extracts Bearer token from `Authorization` header
- Validates token with Supabase
- Fetches user profile with RLS
- Blocks disabled users (except `/auth/session`)

### 4. Role-Based Access (Backend)

**RBAC Middleware**:

```go
// Protect admin endpoints
router.Use(authMiddleware, RequireRoles("admin", "super_admin"))
```

---

## Redirect Architecture

Centralized in `RedirectManager` class with loop prevention:

| User State      | Current Path | Action                       |
| --------------- | ------------ | ---------------------------- |
| Unauthenticated | Any          | → `/login?redirect=<path>`   |
| Disabled        | Any          | → `/account-disabled`        |
| Enabled         | `/login`     | → Default route (role-based) |
| Enabled         | `/`          | → `/admin` or `/dashboard`   |
| Enabled         | Valid page   | Continue                     |

**Default Routes by Role**:

- `admin` / `super_admin` → `/admin`
- `user` → `/dashboard`

---

## Security Measures

1. **Token Security**
   - JWT validated server-side on every request
   - Access/refresh tokens stay in the HttpOnly `magazyn_sid` cookie, encrypted with AES-256-GCM
   - Tokens appear in the URL fragment only during the magic-link handoff and are forwarded to the server immediately

2. **Authorization Single Source of Truth**
   - Role/status from `sessionInfo` (backend DB with RLS)
   - Never trust `user_metadata` for authorization

3. **Redirect Validation**
   - Same-origin only
   - Whitelist-based path validation
   - Deterministic DAG structure prevents redirect loops without artificial throttle counters

4. **Disabled User Handling**
   - Blocked at both frontend and backend layers
   - Only `/auth/session` endpoint accessible

---

## Related Documentation

- **Frontend Architecture**: [architecture.md](../frontend/architecture.md)
- **Backend Auth**: [Backend Developer Guide](../backend/README.md)
