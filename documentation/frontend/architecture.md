# Frontend Architecture & Data Flow

## 1. Tech Stack
- **Framework**: Astro 5 (Static Site Generation + Server-Side Rendering)
- **UI Library**: React 19 (interactive components)
- **Styling**: Tailwind CSS 4 + Shadcn/ui
- **Language**: TypeScript 5
- **State Management**: React Query (`@tanstack/react-query`)
- **Authentication**: Supabase Auth (`@supabase/ssr`)
- **Testing**: Vitest (Unit) + Playwright (E2E)

## 2. API Proxy Pattern
The Astro SSR layer acts as a proxy between the frontend client and the Go backend:
1. **Client Request**: React component fetches from `/api/*` via React Query.
2. **Astro Route**: Matches `/pages/api/[...path].ts`. Extracts `locals.accessToken` populated by Astro Middleware.
3. **Backend Request**: Astro forwards the request to the Go API, appending `Authorization: Bearer <token>`.
4. **Response**: Relays backend data back to the client.
**Why?** Keeps the JWT secure in a server-side HTTP-only cookie and avoids CORS issues.

## 3. Authentication Flow (Magic Links)
1. **Initiate**: User requests login. `supabase.auth.signInWithOtp` sends an email via Mailpit (local) or SMTP (prod).
2. **Callback**: User clicks the email link containing `#access_token=...`.
3. **Session Processing**: 
   - `AuthListener.tsx` detects the hash change.
   - Pushes token to `supabase.auth.setSession`.
   - Writes standard `magazyn-auth-token` cookie for the API proxies.
4. **Redirection**: Calls `RedirectManager` to navigate based on role.

## 4. Redirect Flow & Middleware
- **Middleware (`src/middleware/index.ts`)**: Runs on every SSR request. Extracts the `magazyn-auth-token` cookie and hydrates `locals.user`.
- **RedirectManager (`src/lib/auth/redirect-manager.ts`)**: Central source of truth for routing logic.
  - `super_admin`, `admin` -> `/admin`
  - `user` -> `/dashboard`
  - Disabled accounts -> `/account-disabled`
- **Protection**: If an unauthenticated user accesses `/dashboard`, they are redirected to `/login?redirect=/dashboard`. Upon successful authentication, they are routed back to their initial destination unless it violates security rules (e.g. users attempting to reach `/admin`).
