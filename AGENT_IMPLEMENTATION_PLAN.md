# Agent Implementation Plan — HttpOnly Session Redesign

> **Worktree**: `E:\bystrze\Magazyn-session-redesign`
> **Branch**: `feat/httponly-session-redesign`
> **Base**: `main` (commit `5ba1769d`)
>
> This plan is self-contained. Read it fully before writing a single line of code.

---

## Goal

Replace Magazyn's client-side JWT cookie architecture (chunked `sb-magazyn-auth-token`, bilateral pruning, browser Supabase client) with a **single `HttpOnly` AES-256-GCM encrypted session cookie** managed entirely server-side.

**After this change:**
- The browser holds one cookie: `magazyn_sid=<JWE>`, `HttpOnly: true`, `SameSite: Lax`
- JavaScript **cannot read** the session cookie under any circumstances
- No chunking, no split-brain, no cross-session contamination possible
- The Go backend receives the same `Authorization: Bearer <access_token>` it already expects — **zero backend changes**

---

## Prerequisite Reading

Before starting, read these files in the worktree:

| File | Why |
|---|---|
| [`frontend/src/lib/auth/cookie-utils.ts`](frontend/src/lib/auth/cookie-utils.ts) | Understand what you are replacing |
| [`frontend/src/lib/auth/supabase-ssr.ts`](frontend/src/lib/auth/supabase-ssr.ts) | Understand what you are replacing |
| [`frontend/src/middleware/index.ts`](frontend/src/middleware/index.ts) | You will rewrite this |
| [`frontend/src/components/auth/AuthListener.tsx`](frontend/src/components/auth/AuthListener.tsx) | You will delete this |
| [`frontend/src/lib/api/proxy.ts`](frontend/src/lib/api/proxy.ts) | Keep unchanged — it is already correct |
| [`frontend/src/lib/auth/redirect-manager.ts`](frontend/src/lib/auth/redirect-manager.ts) | Keep unchanged — no redirect logic changes |
| [`frontend/src/lib/auth/session-utils.ts`](frontend/src/lib/auth/session-utils.ts) | Keep unchanged — still used by middleware |
| [`frontend/src/types/auth.types.ts`](frontend/src/types/auth.types.ts) | Understand `SessionInfo` shape |

---

## Environment Variable Required

Add to `frontend/.env` (and `frontend/.env.example`):

```
SESSION_ENCRYPTION_KEY=<64-char hex string>
SUPABASE_SERVICE_ROLE_KEY=<your Supabase service role key>
```

Generate the encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`SUPABASE_SERVICE_ROLE_KEY` must **never** be prefixed with `PUBLIC_`. It must only be accessible server-side (Astro SSR / middleware). Verify it is absent from any client bundle after implementation.

---

## Step-by-Step Implementation

### Step 1 — Create `frontend/src/lib/auth/session-store.ts`

**Create this file from scratch.** It must be server-only (never imported from any `.astro` client script or React component).

```typescript
// frontend/src/lib/auth/session-store.ts
// SERVER ONLY — never import from client-side code

export interface MagazynSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
  role: string;
  isEnabled: boolean;
}

const ENC_KEY_ENV = "SESSION_ENCRYPTION_KEY";

async function getKey(): Promise<CryptoKey> {
  const raw =
    (import.meta.env[ENC_KEY_ENV] as string | undefined) ||
    (typeof process !== "undefined" ? process.env[ENC_KEY_ENV] : undefined);
  if (!raw || raw.length < 64) {
    throw new Error(`${ENC_KEY_ENV} must be a 64-char hex string (32 bytes)`);
  }
  const bytes = Buffer.from(raw, "hex");
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSession(session: MagazynSession): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(session));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const encode = (buf: ArrayBuffer | Uint8Array) =>
    Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString("base64url");
  return `${encode(iv)}:${encode(ciphertext)}`;
}

export async function decryptSession(cookie: string): Promise<MagazynSession | null> {
  try {
    const [ivB64, ctB64] = cookie.split(":");
    if (!ivB64 || !ctB64) return null;
    const key = await getKey();
    const iv = Buffer.from(ivB64, "base64url");
    const ct = Buffer.from(ctB64, "base64url");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(plain)) as MagazynSession;
  } catch {
    return null; // tampered, corrupt, or wrong key
  }
}

export const SESSION_COOKIE = "magazyn_sid";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: import.meta.env.PROD, // true in production, false in local dev
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days (matches Supabase refresh token lifetime)
} as const;
```

---

### Step 2 — Create `frontend/src/pages/api/auth/callback.ts`

This is the **magic link landing handler**. Supabase redirects users here after clicking the link in their email. It replaces the client-side hash parsing in `AuthListener.tsx`.

```typescript
// frontend/src/pages/api/auth/callback.ts
import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import {
  encryptSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session-store";
import { getUserSession } from "@/lib/auth/session-utils";
import { RedirectManager } from "@/lib/auth/redirect-manager";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("code");
  if (!code) {
    return redirect("/login?error=missing_code");
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return redirect("/login?error=exchange_failed");
  }

  const { access_token, refresh_token, expires_at, user } = data.session;

  // Fetch authoritative role + enabled status from Go backend
  const sessionInfo = await getUserSession(access_token);
  if (!sessionInfo) {
    return redirect("/login?error=session_fetch_failed");
  }

  const encrypted = await encryptSession({
    userId: user.id,
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    role: sessionInfo.role,
    isEnabled: sessionInfo.isEnabled,
  });

  cookies.set(SESSION_COOKIE, encrypted, SESSION_COOKIE_OPTIONS);

  // Reuse existing redirect logic — no changes to RedirectManager
  const redirectTo = RedirectManager.getRedirectForAuthState(
    user,
    sessionInfo,
    "/login",
    url.searchParams.get("redirect"),
    url.origin,
  );

  return redirect(redirectTo ?? "/dashboard");
};
```

> **IMPORTANT**: After creating this file, update the Supabase project's redirect URL in Supabase Dashboard → Authentication → URL Configuration. Change the redirect URL from the current hash-based URL to `<your domain>/api/auth/callback`. For local dev: `http://localhost:4321/api/auth/callback`.

---

### Step 3 — Rewrite `frontend/src/middleware/index.ts`

**Replace the entire file contents** with the following. The only logic preserved from the original is the route guard (using `RedirectManager`) and API auth enforcement.

```typescript
// frontend/src/middleware/index.ts
import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";
import {
  decryptSession,
  encryptSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session-store";
import { getUserSession } from "@/lib/auth/session-utils";
import { RedirectManager } from "@/lib/auth/redirect-manager";
import { ApiErrors, handleApiError } from "@/lib/errors/api-error";
import { StructuredLogger } from "@/lib/utils/logger";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const traceId = context.request.headers.get("X-Trace-Id") || crypto.randomUUID();
  context.locals.trace_id = traceId;

  const logger = new StructuredLogger({ trace_id: traceId });
  context.locals.logger = logger;

  logger.info("Request received", { path: url.pathname });

  try {
    const rawCookie = context.cookies.get(SESSION_COOKIE)?.value ?? null;
    let session = rawCookie ? await decryptSession(rawCookie) : null;

    if (session) {
      // Proactive server-side token refresh (60s before expiry)
      if (Date.now() / 1000 >= session.expiresAt - 60) {
        logger.info("Access token near expiry, refreshing server-side");

        const supabase = createClient(
          import.meta.env.PUBLIC_SUPABASE_URL,
          import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
        );

        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: session.refreshToken,
        });

        if (error || !data.session) {
          logger.warn("Refresh token expired or revoked, clearing session", {
            error: error?.message,
          });
          context.cookies.delete(SESSION_COOKIE, { path: "/" });
          session = null;
        } else {
          session = {
            ...session,
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at ?? session.expiresAt,
          };

          // Rewrite cookie with new tokens
          context.cookies.set(
            SESSION_COOKIE,
            await encryptSession(session),
            SESSION_COOKIE_OPTIONS,
          );

          logger.info("Session refreshed and cookie rewritten");
        }
      }
    }

    if (session) {
      context.locals.accessToken = session.accessToken;
      context.locals.userId = session.userId;

      const sessionInfo = await getUserSession(session.accessToken);
      context.locals.sessionInfo = sessionInfo;
      context.locals.user = sessionInfo
        ? { id: session.userId, email: sessionInfo.email }
        : null;

      if (sessionInfo) {
        logger.info("User authenticated", {
          userId: session.userId,
          role: sessionInfo.role,
        });
      }
    } else {
      context.locals.user = null;
      context.locals.sessionInfo = null;
      context.locals.accessToken = null;
      context.locals.userId = null;
      logger.debug("No authenticated session");
    }

    // Static asset passthrough
    const isStaticAsset =
      /\.(css|js|mjs|map|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|mp4|webm)$/i.test(
        url.pathname,
      );

    // Page route guard
    if (!url.pathname.startsWith("/api/") && !isStaticAsset) {
      const redirectTo = RedirectManager.getRedirectForAuthState(
        context.locals.user,
        context.locals.sessionInfo,
        url.pathname,
        url.searchParams.get("redirect"),
        url.origin,
      );
      if (redirectTo) {
        logger.info("Redirecting request", { from: url.pathname, to: redirectTo });
        return context.redirect(redirectTo);
      }
    }

    // API route auth enforcement
    const isAuthApiRoute = url.pathname.startsWith("/api/auth");
    if (url.pathname.startsWith("/api/") && !isAuthApiRoute) {
      if (!context.locals.user) {
        throw ApiErrors.unauthorized("Authentication required");
      }
      if (context.locals.sessionInfo && !context.locals.sessionInfo.isEnabled) {
        throw ApiErrors.forbidden("Account is disabled. Please contact an administrator.");
      }
    }

    return next();
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (context.request.url.includes("/api/")) return handleApiError(error);
    context.locals.logger?.error("Middleware error", {
      name: err.name,
      error: err.message,
    });
    return new Response("Internal Server Error", { status: 500 });
  }
});
```

---

### Step 4 — Rewrite `frontend/src/pages/api/auth/logout.ts`

**Replace the entire file:**

```typescript
// frontend/src/pages/api/auth/logout.ts
import type { APIRoute } from "astro";
import { SESSION_COOKIE } from "@/lib/auth/session-store";

export const POST: APIRoute = async ({ cookies, locals }) => {
  locals.logger?.info("User logging out");
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return Response.json({ message: "Logged out" });
};
```

---

### Step 5 — Delete These Files

Delete each file using `git rm`. Do not leave them behind.

```bash
git rm frontend/src/lib/auth/cookie-utils.ts
git rm frontend/src/lib/auth/supabase-ssr.ts
git rm frontend/src/lib/supabase.ts
git rm frontend/src/components/auth/AuthListener.tsx
git rm frontend/src/lib/auth/logout.ts
```

Also delete their test files (they test deleted logic):
```bash
git rm frontend/src/lib/auth/__tests__/cookie-utils.test.ts
git rm frontend/src/lib/auth/__tests__/supabase-ssr.test.ts
git rm frontend/src/components/auth/__tests__/AuthListener.test.tsx
git rm frontend/src/components/auth/__tests__/AuthListener.stress.test.tsx
git rm frontend/src/lib/auth/__tests__/logout.test.ts
```

---

### Step 6 — Update `BaseLayout.astro` (remove `AuthListener`)

Find `BaseLayout.astro` (likely at `frontend/src/layouts/BaseLayout.astro`). Remove:
- The `import { AuthListener } from ...` import
- The `<AuthListener ... />` component usage
- The `initialUserId` prop passing

The SSR-rendered page no longer needs to embed user identity into the HTML for client-side cross-validation — the server manages this entirely.

---

### Step 7 — Audit React Components for Supabase Client Usage

Search for any React component that imports from `@/lib/supabase` or `@supabase/ssr`:

```bash
grep -r "from.*@/lib/supabase" frontend/src/components --include="*.tsx" --include="*.ts" -l
grep -r "from.*@supabase/ssr" frontend/src/components --include="*.tsx" --include="*.ts" -l
```

For each file found:
- If it uses `supabase.auth.*` → the auth logic must move to a server API route or be removed
- If it calls backend APIs directly using the access token → replace with a call to the Astro proxy (`/api/...`) using `credentials: "same-origin"` (cookie is sent automatically)

React components **must not** import or use the Supabase client after this change.

---

### Step 8 — Add a Simple Logout Trigger to Replace `logout.ts`

Wherever `handleLogout()` was called in React, replace with:

```typescript
// Simple fetch-based logout (works in any React component)
async function logout() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  window.location.href = "/login";
}
```

Or use a plain HTML form — no JavaScript required:

```html
<form method="POST" action="/api/auth/logout">
  <button type="submit">Log out</button>
</form>
```

---

### Step 9 — Update `frontend/src/lib/api/auth.ts`

Check this file. If it exposes any Supabase auth functions to React, audit and remove them. API calls from React should go through `/api/*` proxy routes only.

---

### Step 10 — TypeScript: Update `locals` type declarations

Find the `env.d.ts` or equivalent Astro type augmentation file (usually `frontend/src/env.d.ts`). Update `App.Locals` to remove any Supabase client references and ensure `accessToken`, `userId`, `sessionInfo`, and `user` are typed correctly:

```typescript
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    trace_id: string;
    logger: import("./lib/utils/logger").StructuredLogger;
    user: { id: string; email: string } | null;
    userId: string | null;
    accessToken: string | null;
    sessionInfo: import("./types/auth.types").SessionInfo | null;
    // Remove: supabase (the @supabase/ssr server client — no longer used)
  }
}
```

---

### Step 11 — Verification Checklist

After implementing all steps, verify:

- [ ] `npm run build` in `frontend/` completes with zero TypeScript errors
- [ ] `npm run dev` starts, magic link login flow reaches `/api/auth/callback` and sets `magazyn_sid` cookie
- [ ] In browser DevTools → Application → Cookies: `magazyn_sid` has `HttpOnly` checked, value is opaque ciphertext
- [ ] No `sb-magazyn-auth-token` cookies anywhere in DevTools
- [ ] Navigating to `/dashboard` renders correctly with authenticated user data
- [ ] Clicking logout deletes `magazyn_sid` and redirects to `/login`
- [ ] Opening a second tab and logging in as a different user does NOT contaminate the first tab's next page load (each SSR request reads the cookie independently)
- [ ] `grep -r "sb-magazyn-auth-token" frontend/src --include="*.ts" --include="*.tsx"` returns zero results
- [ ] `grep -r "createBrowserClient\|parseCookieHeader\|pruneCookieList" frontend/src` returns zero results

---

### Step 12 — Rewrite E2E Session Integrity Test

The existing `frontend/e2e/tests/auth/session-integrity.spec.ts` tests for chunked cookie coexistence and `window.supabase.auth.refreshSession()` — both of which no longer exist.

Replace with these assertions:

```typescript
// What to verify in the new E2E test:

// 1. After magic link login: magazyn_sid cookie is HttpOnly
const cookies = await page.context().cookies();
const sid = cookies.find(c => c.name === "magazyn_sid");
expect(sid).toBeDefined();
expect(sid?.httpOnly).toBe(true);
expect(sid?.sameSite).toBe("Lax");

// 2. No old Supabase cookies present
const oldCookies = cookies.filter(c => c.name.startsWith("sb-"));
expect(oldCookies).toHaveLength(0);

// 3. After POST /api/auth/logout: magazyn_sid is gone
await page.request.post("/api/auth/logout");
const postLogoutCookies = await page.context().cookies();
expect(postLogoutCookies.find(c => c.name === "magazyn_sid")).toBeUndefined();

// 4. With tampered cookie: redirected to /login
await page.context().addCookies([{ name: "magazyn_sid", value: "tampered", ... }]);
await page.goto("/dashboard");
await expect(page).toHaveURL(/.*\/login/);
```

---

## What Must NOT Change

| File / Component | Reason |
|---|---|
| `frontend/src/lib/api/proxy.ts` | Already correct BFF proxy — reads `locals.accessToken` injected by middleware |
| `frontend/src/lib/auth/redirect-manager.ts` | Pure logic, no session coupling |
| `frontend/src/lib/auth/roles.ts` | Pure logic |
| `frontend/src/lib/auth/session-utils.ts` | Used by middleware to call Go backend `GET /auth/session` |
| `frontend/src/lib/auth/url-utils.ts` | Pure logic |
| `frontend/src/pages/api/**` (non-auth routes) | All use `createProxyHandler` — no changes needed |
| Go backend (`internal/middleware/auth`) | Receives same `Authorization: Bearer` header — zero changes |

---

## Cookie Comparison After Implementation

| | Before | After |
|---|---|---|
| Cookie name | `sb-magazyn-auth-token` + `.0`, `.1` | `magazyn_sid` |
| Cookie count | 1–3 | Always 1 |
| `HttpOnly` | `false` | `true` |
| JS readable | Yes (`document.cookie`) | **No** |
| Size | 3,000–6,000 bytes | ~1,800–2,200 bytes (AES-GCM overhead is ~40 bytes) |
| Chunking required | Yes | **Never** |
| Split-brain possible | Yes | **Impossible** |
| Cross-tab contamination | Yes | **Impossible** |
| Token refresh location | Browser JS timer | Server (per-request, transparent) |

---

## If You Get Stuck

- **`crypto.subtle` not available**: Ensure Node.js ≥ 18 or add `import { webcrypto } from "node:crypto"; global.crypto = webcrypto;` to the Astro server entry.
- **`SUPABASE_SERVICE_ROLE_KEY` leaking to client bundle**: In Astro, any `import.meta.env.*` variable NOT prefixed with `PUBLIC_` is automatically excluded from client bundles. Confirm by building and checking the client bundle.
- **Magic link still goes to hash URL**: You must update the redirect URL in Supabase Dashboard. The client-side hash flow is completely removed.
- **Middleware TypeScript errors on `locals.supabase`**: Remove it from `App.Locals` in `env.d.ts`.

