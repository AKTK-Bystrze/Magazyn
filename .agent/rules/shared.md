---
trigger: always_on
---

# AI Rules for Magazyn

Club equipment rental system with credit-based billing, inventory management, and calendar availability tracking.

## Tech Stack

- Astro 7
- TypeScript 6
- React 19
- Tailwind 4
- Shadcn/ui
- Go 1.27

## Project Structure

When introducing changes to the project, always follow the directory structure below:

- `./frontend/src` - Frontend source code
- `./frontend/src/layouts` - Astro layouts
- `./frontend/src/pages` - Astro pages
- `./frontend/src/pages/api` - BFF API proxy endpoints
- `./frontend/src/middleware/index.ts` - Astro SSR auth and session middleware
- `./frontend/src/db` - Supabase generated database types
- `./frontend/src/types` - Frontend TypeScript types and DTOs
- `./frontend/src/components` - UI components in Astro (static) and React (dynamic)
- `./frontend/src/components/ui` - Primitives from Shadcn/ui
- `./frontend/src/lib` - API clients, auth helpers, transformers, and utilities
- `./frontend/public` - Static public assets
- `./backend` - Go API backend (`cmd/api`, `internal/`)
- `./infra` - Docker Compose, Caddyfile, and operations scripts
- `./supabase` - PostgreSQL migrations and seed data

When modifying the directory structure, always update this section.

## Coding practices

### Guidelines for clean code

- Use feedback from linters to improve the code when making changes.
- Prioritize error handling and edge cases.
- Handle errors and edge cases at the beginning of functions.
- Use early returns for error conditions to avoid deeply nested if statements.
- Place the happy path last in the function for improved readability.
- Avoid unnecessary else statements; use if-return pattern instead.
- Use guard clauses to handle preconditions and invalid states early.
- Implement proper error logging and user-friendly error messages.
- Consider using custom error types or error factories for consistent error handling.
