# Authentication Logic Documentation

> [!NOTE]
> **STATUS: ✅ Related Issues Have Been RESOLVED** - See [report.md](file:///e:/bystrze/Magazyn/.ai/loop/report.md)  
> The redirect loop affecting super_admin users has been fixed.

This document provides a detailed analysis of the authentication logic in the Magazyn equipment rental application.

## Table of Contents

1. [Overview](#overview)
2. [Backend Authentication Flow](#backend-authentication-flow)
3. [Frontend Authentication Flow](#frontend-authentication-flow)
4. [Session Management](#session-management)
5. [Token Handling](#token-handling)
6. [User Enablement Status](#user-enablement-status)

## Overview

The application uses **Supabase Auth** with magic link (OTP) authentication. The system has a dual-layer architecture:

- **Backend**: Go server on port 8080 (`localhost:8080`)
- **Frontend**: Astro application on port 4321 (`localhost:4321`)

Authentication involves coordination between:
- Supabase authentication service
- Backend Go API for session validation and profile data
- Frontend Astro middleware for SSR route protection
- Client-side React components for auth state management

## Backend Authentication Flow

### 1. Login Initiation (`POST /auth/login`)

**File**: `backend/internal/handler/auth.handler.go` → `HandleLogin()`

**Flow**:
1. Receives email from user via POST request
2. Validates email is present
3. Calls `AuthService.Login(email)`

**File**: `backend/internal/service/auth.service.go` → `Login()`

```go
func (s *AuthService) Login(email string) error {
    // Send magic link via OTP
    // CreateUser: true allows new users to be created via login page
    // New users are created as disabled by default (see handle_new_user trigger)
    // SuperAdmin must enable users before they can access the application
    err := config.SupabaseClient.Auth.OTP(types.OTPRequest{
        Email:      email,
        CreateUser: true,
    })
}
```

**Key Points**:
- Creates new users automatically with `CreateUser: true`
- New users are created **disabled by default** via database trigger
- Returns success after sending magic link email

### 2. Token Verification Middleware

**File**: `backend/internal/middleware/auth.middleware.go` → `AuthMiddleware()`

**Flow** (applied to protected routes):

1. **Extract Token** (lines 19-36):
   - Reads `Authorization` header
   - Expects format: `Bearer <token>`
   - Validates format and extracts token

2. **Verify Token with Supabase** (lines 38-47):
   ```go
   user, err := config.SupabaseClient.Auth.WithToken(token).GetUser()
   ```
   - Validates token with Supabase Auth service
   - Returns 401 if token is invalid or expired

3. **Fetch User Profile** (lines 51-61):
   ```go
   var profiles []model.PublicProfilesSelect
   _, err = config.SupabaseClient.From("profiles").Select("*", "exact", false)
           .Eq("id", user.ID.String()).ExecuteTo(&profiles)
   ```
   - Queries `profiles` table to get user details
   - Includes `isEnabled` status

4. **Type Compatibility Check** (lines 63-75):
   - Ensures user object matches expected type (`*types.User`)
   - Handles both `*types.User` and `*types.UserResponse`

5. **Add to Context** (lines 77-101):
   - Stores user in request context at `appcontext.UserContextKey`
   - Stores profile in context at `appcontext.UserProfileContextKey`

6. **Check IsEnabled Status** (lines 84-95):
   ```go
   if !profile.IsEnabled && r.URL.Path != "/auth/session" {
       logger.Warnf(r.Context(), "❌ Access denied for disabled user: %s (%s) accessing %s", 
                    profile.Username, profile.Email, r.URL.Path)
       http.Error(w, "Account is disabled. Please contact an administrator.", http.StatusForbidden)
       return
   }
   ```
   
   **CRITICAL**: 
   - Disabled users are **blocked from all API endpoints** EXCEPT `/auth/session`
   - This exception allows disabled users to fetch their session info
   - Frontend needs session info to determine redirect to `/account-disabled`

### 3. Session Endpoint (`GET /auth/session`)

**File**: `backend/internal/handler/auth.handler.go` → `HandleGetSession()`

**Flow**:
1. **Extract User from Context** (lines 79-91):
   - Retrieves user stored by `AuthMiddleware`
   - Type assertion to `*types.User`
   - Returns 401 if user not found or type mismatch

2. **Fetch Complete Session** (lines 96-106):
   ```go
   session, err := h.service.GetSession(r.Context(), user.ID.String())
   ```

**File**: `backend/internal/service/auth.service.go` → `GetSession()`

**Flow**:
1. **Query Profile** (lines 65-71):
   ```go
   var profiles []model.PublicProfilesSelect
   _, err := config.SupabaseClient.From("profiles").Select("*", "exact", false)
           .Eq("id", userId).ExecuteTo(&profiles)
   ```

2. **Validate Profile Exists** (lines 73-76):
   - Returns error if no profile found
   - This should not happen for authenticated users

3. **Construct Response** (lines 90-98):
   ```go
   response := &SessionResponse{
       UserId:        profile.Id,
       Email:         profile.Email,
       Username:      profile.Username,
       Role:          profile.Role,
       CreditBalance: profile.CreditBalance,
       IsEnabled:     profile.IsEnabled,  // ⚠️ CRITICAL FIELD
   }
   ```

**Response DTO** (`backend/internal/service/auth.dto.go`):
```go
type SessionResponse struct {
    UserId        string `json:"userId"`        // camelCase for frontend
    Email         string `json:"email"`
    Username      string `json:"username"`
    Role          string `json:"role"`
    CreditBalance int32  `json:"creditBalance"`
    IsEnabled     bool   `json:"isEnabled"`     // ⚠️ Key field
    ExpiresAt     string `json:"expiresAt"`
}
```

### 4. Logout (`POST /auth/logout`)

**File**: `backend/internal/handler/auth.handler.go` → `HandleLogout()`

**Flow**:
1. Extracts token from Authorization header
2. Calls `AuthService.Logout()` with token
3. Invalidates session via Supabase: `config.SupabaseClient.Auth.WithToken(token).Logout()`

## Frontend Authentication Flow

### 1. Server-Side Middleware

**File**: `frontend/src/middleware/index.ts` → `onRequest()`

**Execution**: Runs on **every request** to Astro pages

**Flow**:

#### Step 1: Get Session from Supabase (lines 19-21)
```typescript
const { data: { session } } = await supabaseClient.auth.getSession();
context.locals.user = session?.user || null;
```

#### Step 2: Fallback - Check Manual Auth Cookie (lines 25-56)
```typescript
const authCookie = context.cookies.get("magazyn-auth-token");
if (authCookie?.value) {
    const { data: { user }, error } = await supabaseClient.auth.getUser(authCookie.value);
    if (user && !error) {
        context.locals.user = user;
        token = authCookie.value;
    }
}
```

**Why**: The Supabase client is configured with `persistSession: false` and `detectSessionInUrl: false`, so cookie fallback is necessary.

#### Step 3: Fetch Session Info from Backend (lines 66-72)
```typescript
let sessionInfo: SessionInfo | null = null;
if (context.locals.user && token) {
    sessionInfo = await getUserSession(token);  // Calls backend GET /auth/session
}
```

**getUserSession()** (`frontend/src/lib/auth/session-utils.ts`):
```typescript
const response = await fetch(`${BACKEND_URL}/auth/session`, {
    method: "GET",
    headers: {
        "Authorization": `Bearer ${accessToken}`,
    },
});
const data = await response.json();
return data as SessionInfo;  // { userId, email, username, role, creditBalance, isEnabled, expiresAt }
```

#### Step 4: Route Protection Based on isEnabled

**Redirect Disabled Users to `/account-disabled`** (lines 76-85):
```typescript
if (
    context.locals.user &&
    sessionInfo &&
    !sessionInfo.isEnabled &&
    !isAccountDisabledRoute &&
    !isPublicRoute
) {
    return Response.redirect(new URL("/account-disabled", url.origin).toString(), 302);
}
```

**Redirect Enabled Users Away from `/account-disabled`** (lines 87-92):
```typescript
if (isAccountDisabledRoute && sessionInfo?.isEnabled) {
    const defaultRoute = getDefaultRouteForUser(context.locals.user, sessionInfo);
    return Response.redirect(new URL(defaultRoute, url.origin).toString(), 302);
}
```

### 2. Client-Side Auth Listener

**File**: `frontend/src/components/auth/AuthListener.tsx`

**Purpose**: Handles Supabase auth events and manages client-side redirects

**Key Responsibilities**:

1. **Process Magic Link Tokens in URL Hash** (lines 27-112)
2. **Listen to Supabase Auth State Changes** (lines 118-184)
3. **Sync Auth Cookie** (lines 122-131)
4. **Fetch Session Info and Redirect** (lines 136-177)

#### Magic Link Processing (checkHashForToken)

**Triggered**: When URL contains `#access_token=...` (after clicking magic link)

**Flow**:
1. Parse hash parameters to extract `access_token` and `refresh_token`
2. Set Supabase session: `supabase.auth.setSession({ access_token, refresh_token })`
3. **Fetch session info** from backend (lines 57-60):
   ```typescript
   const sessionInfo = await getUserSession(data.session.access_token);
   ```
4. **Check isEnabled** and determine redirect (lines 62-88):
   ```typescript
   if (!sessionInfo.isEnabled) {
       redirectTo = '/account-disabled';
   } else {
       redirectTo = getDefaultRouteForUser(data.session.user, sessionInfo);
   }
   ```
5. Clean URL hash and redirect

#### Auth State Change Handler

**Triggered**: On `SIGNED_IN`, `SIGNED_OUT`, and other auth events

**Flow for SIGNED_IN** (lines 133-177):

1. **Set Auth Cookie** (lines 122-131):
   ```typescript
   document.cookie = `magazyn-auth-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
   ```
   - Cookie name: `magazyn-auth-token`
   - No `Secure` flag (to work on localhost HTTP)
   - `SameSite=Lax` for CSRF protection

2. **Fetch Session Info** (lines 136-139):
   ```typescript
   const sessionInfo = await getUserSession(session.access_token);
   ```

3. **Determine Redirect** (lines 145-159):
   ```typescript
   if (sessionInfo && !sessionInfo.isEnabled) {
       redirectTo = '/account-disabled';
   } else {
       redirectTo = getDefaultRouteForUser(session.user, sessionInfo);
   }
   ```

4. **Redirect if Not on Target Page** (lines 167-177)

### 3. Role-Based Default Routes

**File**: `frontend/src/lib/auth/role-utils.ts` → `getDefaultRouteForUser()`

**Logic**:
```typescript
export function getDefaultRouteForUser(user: User | null, sessionInfo?: SessionInfo | null): string {
    if (!user) return "/login";
    
    // Check if user account is disabled
    if (sessionInfo && !sessionInfo.isEnabled) {
        return "/account-disabled";  // ⚠️ CRITICAL: Always redirect disabled users here
    }
    
    const role = sessionInfo?.role || user.user_metadata?.role;
    
    switch (role) {
        case "super_admin":
        case "admin":
            return "/admin";
        case "user":
            return "/dashboard";
        default:
            return "/dashboard";
    }
}
```

## Session Management

### Backend Session Storage

- **Database Table**: `profiles`
- **Fields**: 
  - `id` (UUID, matches Supabase Auth user ID)
  - `email`
  - `username`
  - `role` (enum: `user`, `admin`, `super_admin`)
  - `credit_balance` (int)
  - `is_enabled` (boolean) ⚠️
  - `created_at`, `updated_at`

### Frontend Session Types

**File**: `frontend/src/types.ts`

```typescript
export type SessionInfo = {
    userId: string;
    email: string;
    username: string;
    role: Enums<"user_role">;
    creditBalance: number;
    isEnabled: boolean;        // ⚠️ CRITICAL FIELD
    expiresAt: string;
};
```

## Token Handling

### Token Flow

1. **Magic Link Click** → Supabase generates tokens → URL hash contains `access_token` and `refresh_token`
2. **AuthListener** extracts tokens and calls `supabase.auth.setSession()`
3. **AuthListener** stores token in cookie: `magazyn-auth-token`
4. **Middleware** reads cookie and validates with Supabase
5. **API Requests** send token in `Authorization: Bearer <token>` header

### Token Storage

- **Cookie**: `magazyn-auth-token`
  - Path: `/`
  - Max-Age: 1 year (31,536,000 seconds)
  - SameSite: `Lax`
  - Secure: Not set (for localhost HTTP)

### Token Validation

- **Backend**: `config.SupabaseClient.Auth.WithToken(token).GetUser()`
- **Returns**: Full user object if valid, error if expired/invalid
- **Frequency**: Every protected API request

## User Enablement Status

### Database Trigger

New users are created with `is_enabled = false` by default via a database trigger named `handle_new_user`.

### isEnabled Checks

#### Backend
1. **AuthMiddleware** (line 87):
   - Blocks disabled users from all endpoints EXCEPT `/auth/session`
   - Returns 403 Forbidden

#### Frontend Server-Side Middleware
1. **Check on Every Request** (line 76-85):
   - Redirects disabled users to `/account-disabled`
   - Allows access to public routes and `/account-disabled` itself

2. **Reverse Check** (line 88):
   - Redirects enabled users away from `/account-disabled` to their role-based default route

#### Frontend Client-Side

1. **AuthListener** (multiple locations):
   - After magic link processing (line 80-84)
   - After SIGNED_IN event (line 151-155)
   - Always checks `sessionInfo.isEnabled` before redirecting

2. **Role Utils** (line 16-18):
   - `getDefaultRouteForUser()` checks `isEnabled` first
   - Returns `/account-disabled` for disabled users regardless of role

### Account Disabled Page

**File**: `frontend/src/pages/account-disabled.astro`

**Features**:
- Shows account pending activation message
- "Check Account Status" button: Fetches session info and checks `isEnabled`
- If enabled, redirects to `/` (which triggers role-based redirect)
- Logout button: Clears cookie and localStorage

## Summary

The authentication system has multiple layers of protection and redundancy:

1. **Backend validates every request** via middleware
2. **Frontend middleware protects routes** server-side
3. **Client-side AuthListener** handles auth events and redirects
4. **isEnabled checks** occur at backend, frontend SSR, and client-side
5. **Disabled users** can only access `/account-disabled` and `/login`
6. **Token stored in cookie** for SSR and sent in headers for API calls
