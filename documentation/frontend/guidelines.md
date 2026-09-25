# Frontend Coding Standards

## 1. Type Safety & Contracts
- **DO**: Define interfaces for all backend responses.
- **DO**: Use strict types instead of `any`.
- **DON'T**: Rely on optional chaining without handling undefined explicitly. Use guard clauses (Fail fast, fail clearly).

## 2. API Architecture
- **DO**: Use API Proxies (`/pages/api/`). Fetch backend data by grabbing `locals.accessToken` populated via `onRequest` middleware.
- **DON'T**: Call the backend URL directly from React components.

## 3. Component Development
- **Structure Pattern**: 1. Imports (external → internal → styles) 2. Types/Props 3. Main Component (Hooks → Logic/Handlers → Early Returns → Render).
- **DO**: Keep components under 300 lines. Maintain functional, stateless components where possible.
- **DO**: Wrap component trees that require data fetching in `<QueryProvider>` for SSR compatibility.
- **DO**: Pass the `isAdmin` prop to generic layout headers to conditionally render mobile sidebars.

## 4. Naming & Routing Conventions
- **DO** use `PascalCase` for React components and Types/Interfaces (no `I` prefix).
- **DO** use `kebab-case` for Astro pages, utilities, and API routes.
- **DO** use `SCREAMING_SNAKE_CASE` for constants.
- **DO** prefix boolean flags with `is`, `has`, `can`, or `should`.
- **CRITICAL**: Never hardcode route strings (e.g., `'/login'`). Always use `ROUTES` constants (e.g., `ROUTES.PUBLIC.LOGIN`).

## 5. File Structure & Constants
- Group by feature (e.g., `components/equipment/EquipmentCard.tsx`).
- **Constants Structure** (`lib/config/constants/`): Grouped by domain. 
  - **CRITICAL**: Enums in `status.ts` and `role.ts` must match the database ENUMs exactly.
  - **DON'T**: Use inline strings for UI text. Use centralized UI string constants (e.g., `ui-strings.ts`).

## 6. Error Handling
- **DO**: Use early returns and guard clauses.
- **DO**: Wrap complex widget trees with `<ErrorBoundary>`.
- **DO**: Handle `isLoading` and `error` states gracefully when using `useQuery`.
