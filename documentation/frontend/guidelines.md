# Frontend Coding Standards

## 1. Type Safety & Contracts
- **DO**: Define interfaces (e.g., `EquipmentSearchItem`) for all backend responses matching exact snake_case to camelCase transformations.
- **DO**: Use strict types instead of `any`.
- **DON'T**: Rely on optional chaining without handling undefined explicitly. Use guard clauses.

## 2. API Architecture
- **DO**: Use API Proxies (`/pages/api/`). Pass backend calls through Astro to manage auth tokens cleanly.
- **DON'T**: Call the backend URL directly from React components.
- **DO**: Fetch backend data in API routes by grabbing `locals.accessToken` populated via the `onRequest` middleware.

## 3. Component Development
- **DO**: Keep components under 300 lines. 
- **DO**: Maintain functional, stateless components where possible.
- **DO**: Wrap component trees that require data fetching in `<QueryProvider>` for SSR compatibility.
- **DON'T**: Use inline strings for UI text (especially Polish strings). Use constants from `lib/config/constants`.
- **DO**: Pass the `isAdmin` prop to generic layout headers to conditionally render mobile sidebars.

## 4. Naming Conventions
- **DO** use `PascalCase` for React components (`EquipmentCard.tsx`).
- **DO** use `kebab-case` for Astro pages (`account-disabled.astro`), utilities (`cookie-utils.ts`), and API routes.
- **DO** prefix boolean flags with `is`, `has`, `can`, or `should`.
- **DO** use `SCREAMING_SNAKE_CASE` for constants.
- **DO** use `PascalCase` for Types and Interfaces, without an `I` prefix.

## 5. File Structure
- Group by feature (e.g., `components/equipment/EquipmentCard.tsx`).
- Constants are grouped by domain (e.g., `lib/config/constants/reservation/status.ts`). Status enums must match the database exactly.

## 6. Error Handling
- **DO**: Use early returns and guard clauses.
- **DO**: Wrap complex widget trees with `<ErrorBoundary>`.
- **DO**: Handle `isLoading` and `error` states gracefully when using `useQuery`.
