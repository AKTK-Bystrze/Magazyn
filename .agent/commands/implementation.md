Your task is to implement a frontend feature based on the provided implementation plan and project rules.

## Required Information

Before starting, provide:
1. **Implementation Plan** — attach or reference the plan document (e.g., `.ai/[feature]-implementation-plan.md`)
2. **Any additional context** — specific requirements or constraints

## Project Context

Before implementing, review:

- `@src/types.ts` — all TypeScript types, DTOs, and interfaces
- `.agent/rules/shared.md` — tech stack, project structure, clean code practices
- `.agent/rules/frontend.md` — Tailwind, ARIA guidelines
- `.agent/rules/astro.md` — Astro pages, API routes, middleware
- `.agent/rules/react.md` — React components and hooks
- `.agent/rules/ui-shadcn-helper.md` — Shadcn/ui component usage
- `.agent/rules/backend.md` — Supabase and Zod validation
- `.agent/rules/api-supabase-astro-init.md` — Supabase SSR integration patterns
- `.agent/rules/good-practises.md` — documentation standards, DRY, constants management

## Implementation Approach

**Implement incrementally — max 3 steps at a time, then stop and wait for feedback.**

## Implementation Checklist

### 1. Component Structure
- Identify all components in the plan. Create a hierarchical structure.
- React components → `src/components/[feature]/`
- Custom hooks → `src/hooks/`
- Astro pages → `src/pages/`
- API routes → `src/pages/api/`

### 2. API Integration
- Use the **API Proxy pattern**: React → `/api/*` (Astro route) → Go backend.
- Inject `locals.accessToken` into the `Authorization` header when proxying.
- Handle API responses with the **Transformer layer** (Zod validation + snake_case → camelCase).

### 3. State Management
- Server state → React Query (`useQuery`, `useMutation`) via hooks in `src/hooks/`.
- UI state → `useState` / `useReducer` local to the component.
- Wrap trees requiring data fetching in `<QueryProvider>`.

### 4. Constants & UI Strings
- **Never** hardcode route strings — use `ROUTES` constants.
- **Never** hardcode UI text (especially Polish) inline — use `lib/config/constants/`.
- Status/role enums in constants **must** match the database ENUMs exactly.

### 5. Styling
- Tailwind CSS utility classes. Follow Shadcn/ui component patterns.
- Ensure responsiveness if required by the plan.

### 6. Error Handling
- Guard clauses and early returns for all error conditions.
- Handle `isLoading` and `error` states for every `useQuery`.
- Wrap complex trees with `<ErrorBoundary>`.

### 7. Type Safety
- Use types from `src/types.ts` for all DTOs.
- Use Zod for runtime validation in API routes.

### 8. Testing (if specified in the plan)
- Unit tests: follow `.agent/rules/vitest-unit-testing.md`.
- E2E tests: follow `.agent/rules/playwright-e2e-itesting.md`. Add `data-testid` attributes to interactive elements.

## Verification Before Each Iteration

1. ✅ Reflects the implementation plan accurately
2. ✅ All rule files followed
3. ✅ API Proxy + Transformer pattern used correctly
4. ✅ No hardcoded routes or UI strings
5. ✅ Error handling implemented
6. ✅ Types correct throughout
7. ✅ Prettier/lint clean (`npm run lint:fix`)
