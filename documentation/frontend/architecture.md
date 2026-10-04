# Frontend Architecture & Data Flow

## 1. Tech Stack
- **Framework**: Astro 5 (Static Site Generation + Server-Side Rendering)
- **UI Library**: React 19 (interactive components)
- **Styling**: Tailwind CSS 4 + Shadcn/ui
- **Language**: TypeScript 5
- **State Management**: React Query (`@tanstack/react-query`)
- **Authentication**: Supabase Auth (`@supabase/ssr`)
- **Testing**: Vitest (Unit) + Playwright (E2E)

## 2. API Proxy Pattern & Full Request Flow
The Astro SSR layer proxies requests to the Go backend to keep JWTs secure in HTTP-only cookies and avoid CORS.
**Full Request Chain**:
1. User Action → React Component Handler
2. Custom Hook (e.g., `useEquipmentList`)
3. API Module → API Client (`src/lib/api.ts`)
4. **Frontend API Proxy** (`/pages/api/*`): Extracts `locals.accessToken` via middleware.
5. **Go Backend**: Proxy forwards request with `Authorization: Bearer <token>`. Returns `snake_case` JSON.
6. **Transformer Layer**: Zod validation + transforms to `camelCase`.
7. React Query caches data → Component Re-renders.

## 3. Type-Safe Transformer Pattern
**Rule**: Backend sends `snake_case`, frontend uses `camelCase`.
- **4 Layers**: DTOs (backend shape) → Zod Validators → Transformers (functions) → Frontend Types (app shape).
- Transforms must be bidirectional when sending data back (e.g., camelCase → snake_case).

## 4. Authentication Flow (Magic Links)
1. **Initiate**: `supabase.auth.signInWithOtp` sends email.
2. **Callback**: User clicks link containing `#access_token=...`.
3. **Session Processing** (`AuthListener.tsx`): Pushes token to `setSession`, writes `magazyn-auth-token` cookie.
4. **Token Refresh**: Supabase auto-refreshes tokens. If a refresh token expires, a `SIGNED_OUT` event fires and redirects to login.

## 5. Security & Redirect Flow
- **SessionInfo Contract**: Must track `userId`, `role` (user|admin|super_admin), `isEnabled`, `creditBalance`, `username`.
- **Security Rules**:
  1. Never store tokens in `localStorage`.
  2. Use `SameSite=Lax` cookies for CSRF protection.
  3. Always trust `sessionInfo.role` from the backend, not JWT claims.
  4. Validate all redirect URLs (same-origin/whitelisted).
  5. Prevent redirect loops (max 3 in 5s).
- **Middleware (`src/middleware/index.ts`)**: Runs on every SSR request to hydrate `locals.user` and `locals.sessionInfo`.
- **RedirectManager (`src/lib/auth/redirect-manager.ts`)**: Central source of truth.
  - API: `getRedirectForAuthState(user, sessionInfo, currentPath, redirectParam, origin)`
  - **Access Matrix**:
    - **Disabled Users**: Can access `/account-disabled` and `/api/auth/session`. All other pages redirect to `/account-disabled`. Other API routes return 403.
    - **Enabled Users**: `super_admin`/`admin` → `/admin`, `user` → `/dashboard`. Unauthenticated users attempting protected routes go to `/login?redirect=<path>`.
