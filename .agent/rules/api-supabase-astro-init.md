---
description: Supabase & Astro Integration Architecture
globs: 
alwaysApply: false
---
# Supabase & Astro Integration Architecture

This document describes the server-side integration between Supabase Auth and Astro SSR in Magazyn.

## Overview

Magazyn uses a **server-managed, encrypted HttpOnly session cookie** (`magazyn_sid`) rather than exposing Supabase clients or JWTs directly to client-side code.

- **No client-side Supabase client**: The browser holds only an encrypted HttpOnly cookie.
- **No `locals.supabase`**: Astro `App.Locals` does NOT expose a Supabase client.
- **Server-side Session Store**: All session encryption, decryption, and cookie lifecycle are handled in `src/lib/auth/session-store.ts` via AES-256-GCM using `SESSION_ENCRYPTION_KEY`.

## Architecture & Lifecycle

1. **Callback (`src/pages/api/auth/callback.ts`)**:
   - Validates tokens received from the magic-link handoff using a temporary server-side Supabase client.
   - Fetches authoritative user role and status from the Go backend (`GET /auth/session`).
   - Encrypts the session and sets the `magazyn_sid` HttpOnly cookie.

2. **Middleware (`src/middleware/index.ts`)**:
   - Decrypts `magazyn_sid` using `decryptSession`.
   - Checks token expiration; proactively refreshes via Supabase Auth server-side if near expiry (< 60s).
   - Injects `user`, `accessToken`, and `sessionInfo` into `context.locals`.
   - Delegates navigation control to `RedirectManager`.

3. **TypeScript Definitions (`src/env.d.ts`)**:

```ts
import type { SessionInfo } from "./types";

declare global {
  namespace App {
    interface Locals {
      trace_id: string;
      logger: import("./lib/utils/logger").StructuredLogger;
      user: { id: string; email: string } | null;
      accessToken: string | null;
      sessionInfo: SessionInfo | null;
    }
  }
}
```
