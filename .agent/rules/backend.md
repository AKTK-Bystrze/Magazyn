---
description: 
globs: frontend/src/db/*.ts,frontend/src/middleware/*.ts,frontend/src/lib/*.ts
alwaysApply: false
---
### Backend and Database

- Use Supabase for backend services, including authentication and database interactions.
- Follow Supabase guidelines for security and performance.
- Use Zod schemas to validate data exchanged with the backend.
- Astro App.Locals does NOT expose a Supabase client; use server-managed HttpOnly encrypted session cookie (`magazyn_sid`) and forward authenticated requests to the Go backend via Bearer token in `context.locals.accessToken`.
- For database types, use `Database` from `frontend/src/db/database.types.ts`.
