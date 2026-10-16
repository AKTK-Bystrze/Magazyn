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
2. Custom Hook (e.g., `useEquipmentManager`)
3. API Module → API Client (`src/lib/api/`)
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
3. **Session Processing** (`AuthListener.tsx`): Pushes token to `setSession`, writes `sb-magazyn-auth-token` cookie (managed by `@supabase/ssr`).
4. **Token Refresh**: Supabase auto-refreshes tokens. If a refresh token expires, a `SIGNED_OUT` event fires and redirects to login.

## 5. Security & Redirect Flow

- **SessionInfo Contract**: Must track `userId`, `role` (user|admin|super_admin), `isEnabled`, `creditBalance`, `username`.
- **Security Rules**:
  1. Never store tokens in `localStorage`.
  2. Use `SameSite=Lax` cookies for CSRF protection.
  3. Always trust `sessionInfo.role` from the backend, not JWT claims.
  4. Validate all redirect URLs (same-origin/whitelisted).
  5. Deterministic redirect DAG eliminates redirect loops by ensuring destinations never redirect back without state change.
- **Middleware (`src/middleware/index.ts`)**: Runs on every SSR request to hydrate `locals.user` and `locals.sessionInfo`.
- **RedirectManager (`src/lib/auth/redirect-manager.ts`)**: Central source of truth.
  - API: `getRedirectForAuthState(user, sessionInfo, currentPath, redirectParam, origin)`
  - **Access Matrix**:
    - **Disabled Users**: Can access `/account-disabled` and `/auth/session`. All other pages redirect to `/account-disabled`. Other API routes return 403.
    - **Enabled Users**: `super_admin`/`admin` → `/admin`, `user` → `/dashboard`. Unauthenticated users attempting protected routes go to `/login?redirect=<path>`.

## 6. Component Taxonomy & Decomposition

To maintain clean Single Responsibility Principle (SRP) separation, interactive UI is organized into three distinct structural tiers:

### Tier 1: Route Containers (`src/components/{domain}/*Container.tsx`)
- High-level orchestrators (`ReservationListContainer`, `EquipmentManagerContainer`, `UserListContainer`).
- Responsible for: TanStack Query hook consumption, coordinating modal visibility state via custom hooks (`useReservationDialogs`), and routing event handlers down to presentational islands.
- Contain zero presentation table or form markup.

### Tier 2: Presentation Islands (`src/components/{domain}/*View.tsx`, `*Table.tsx`)
- Interactive islands rendered on client pages (`ReservationTable`, `ReservationCartView`).
- Responsible for: View-level layout, sorting state, responsive wrappers, and coordinating presentational subcomponents.

### Tier 3: Decomposed Subcomponents & Shared Form Fields
- **Table Subcomponents**:
  - `ReservationTableRow.tsx`: Single-row rendering, status badges, formatted dates, and action button bindings.
  - `ReservationTableHeader.tsx`: Column titles with sort direction indicators.
  - `ReservationActionMenu.tsx`: Contextual action dropdowns (modify dates, return, cancel).
  - `ReservationTableStates.tsx`: Loading skeletons, empty state illustrations, and error fallbacks.
- **Cart Subcomponents**:
  - `AdminReservationDelegateSection.tsx`: Admin-only delegate selector assigning bookings to another user.
  - `CartAvailabilityAlerts.tsx`: Warning banners for date overlaps or insufficient user credits.
- **Shared Form Fields**:
  - `EquipmentFormFields.tsx`: Centralized form inputs (name, category, status, serial number, description) shared identically across `AddEquipmentDialog` and `EditEquipmentDialog`.
  - `UserFormFields.tsx`: Centralized inputs (email, username, role, credit balance) shared across `CreateUserDialog` and `EditUserDialog`.
  - `ReservationDateAdjustmentFields.tsx`: Date pickers and duration summaries shared between `ModifyDatesDialog` and `ReturnWithDatesDialog`.
  - `ConfirmationModal.tsx`: Standardized confirmation dialog built strictly on top of Radix/Shadcn dialog primitives.

## 7. Custom Hooks Architecture

Custom hooks are strictly categorized by responsibility:

### 1. Data Query Hooks
- Wrap TanStack Query `useQuery` calls with caching and typing.
- Examples: `useEquipmentSearch` (search filters + debouncing), `useTableSort` (in-memory and remote sorting).

### 2. Mutation & Checkout Hooks
- **`useCartCheckout.ts`**: Encapsulates cart submission logic, balance sufficiency checks, optimistic state transitions, error toast triggers, and cart reset on success.
- **`useReservationDateAdjustment.ts`**: Manages reservation date range modification, validates range boundaries, computes credit differences, and submits date adjustment mutations.

### 3. UI State & Interaction Hooks
- **`useReservationDialogs.ts`**: Manages open/closed states for all reservation modals (`modifyDates`, `returnEquipment`, `cancelConfirm`) and holds the active `selectedReservation`.
- **`useInfiniteScrollTrigger.ts`**: Reusable `IntersectionObserver` hook triggering pagination fetches when user scrolls near the bottom of lists.
- **`useDismissibleMessage.ts`**: Auto-dismissing alert timer with manual dismissal handlers for notifications and error banners.

## 8. Test Infrastructure & Shared Fixtures

Centralized testing utilities eliminate duplicated mock objects and boilerplate across Vitest suites:

### Shared Fixtures (`src/test/fixtures/`)
- **`auth-fixtures.ts`**: Provides type-safe mock generators:
  - `createMockUser(overrides?: Partial<User>): User`
  - `createMockSession(overrides?: Partial<Session>): Session`
  - `createMockSessionInfo(overrides?: Partial<SessionInfo>): SessionInfo`
- **`user-fixtures.ts`**: Provides standardized DTO generators:
  - `createMockUserDTO(overrides?: Record<string, unknown>)`

### Test Utilities (`src/test/test-utils.tsx`)
- **`createTestQueryClient()`**: Instantiates a fresh `QueryClient` configured with `{ defaultOptions: { queries: { retry: false } } }`.
- **`renderWithQueryClient(ui: React.ReactElement)`**: Wraps rendered components in `<QueryClientProvider>` for isolated testing.

## 9. Extension Points

### 9.1 Adding a New Filter / Search Facet
1. Declare filter state in the domain hook or container.
2. Add the UI control using Shadcn components (`Select`, `Input`, `Checkbox`).
3. Pass parameter to the client module in `src/lib/api/`.
4. Ensure the backend query binder (`*_query.go`) parses and sanitizes the parameter.

### 9.2 Adding a New Dialog Flow
1. Check if form fields can be extracted into a shared `*FormFields.tsx` component.
2. Add open/close state and selected item tracking in the container's dialog hook (e.g., `useReservationDialogs.ts`).
3. Implement dialog using Radix/Shadcn UI dialog primitives with keyboard accessibility (`Esc` / focus trap).
4. Connect submission to a TanStack Query mutation hook.

### 9.3 Adding a TanStack Query Mutation
1. Implement the API call in `src/lib/api/{domain}.ts`.
2. Wrap with `useMutation({ mutationFn: ... })`.
3. In `onSuccess`, invalidate relevant query keys (`queryClient.invalidateQueries({ queryKey: [...] })`).
4. Handle errors and user notifications with toast feedback or `useDismissibleMessage`.

## 10. Cross-References

- [Frontend Coding Guidelines](guidelines.md) — TypeScript, React component standards, and Tailwind CSS rules.
- [Frontend Testing Standards](testing.md) — Unit testing with Vitest and E2E testing with Playwright.
- [API Reference Documentation](../overview/api.md) — Backend endpoint specifications and BFF proxy contracts.
- [Reservation Flow](../flows/reservation-flow.md) — Full reservation lifecycle and UI state transitions.
