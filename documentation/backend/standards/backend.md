---
description: 
globs: src/db/*.ts,src/middleware/*.ts,src/lib/*.ts
alwaysApply: false
---
### Backend and Database

- Use Supabase for backend services, including authentication and database interactions.
- Follow Supabase guidelines for security and performance.
- Use Zod schemas to validate data exchanged with the backend.
- Use supabase from context.locals in Astro routes instead of importing supabaseClient directly
- Use SupabaseClient type from `frontend/src/db/supabase.client.ts` to ensuring typing consistency
