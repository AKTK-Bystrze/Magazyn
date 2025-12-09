# Redirect Loop Fix Report

**Date**: 2025-12-08  
**Issue**: Enabled users experiencing redirect/refresh loop on login page  
**Status**: ✅ RESOLVED

---

## Problem Summary

Super admin users were stuck in a redirect loop when logging in via magic link.

---

## Root Causes Found & Fixed

### 1. Missing SSR Mode in Astro Config 🔴 CRITICAL
**File**: `astro.config.mjs`

Without `output: 'server'`, Astro defaulted to static mode where middleware only ran for API routes, not page requests.

```diff
 export default defineConfig({
+  output: 'server', // Required for SSR middleware
   integrations: [react()],
```

### 2. Admin Page Using Wrong Role Source
**File**: `admin.astro`

Was checking `user.user_metadata?.role` (undefined) instead of `sessionInfo.role` from backend.

```diff
-const userRole = user.user_metadata?.role;
+const userRole = sessionInfo?.role || user.user_metadata?.role;
```

### 3. SessionInfo Not Passed to Pages
**File**: `middleware/index.ts`

Middleware was fetching sessionInfo but not storing it in `context.locals`.

```diff
+context.locals.sessionInfo = sessionInfo;
```

### 4. Cookie Timing Race Condition
**File**: `AuthListener.tsx`

Redirect happened before cookie was fully set. Fixed with delay and verification.

### 5. Duplicate Redirect Triggers
**File**: `AuthListener.tsx`

Both hash handler and SIGNED_IN event were triggering redirects. Fixed with `isRedirectInProgress` flag.

### 6. Supabase Client Conflict
**File**: `lib/supabase.ts`

Browser client had `detectSessionInUrl: true` conflicting with manual hash processing.

---

## Files Modified

| File | Change |
|------|--------|
| `astro.config.mjs` | Added `output: 'server'` |
| `middleware/index.ts` | Store `sessionInfo` in locals |
| `admin.astro` | Use `sessionInfo.role` |
| `env.d.ts` | Add `sessionInfo` type |
| `AuthListener.tsx` | Cookie timing + redirect flag |
| `lib/supabase.ts` | `detectSessionInUrl: false` |

---

## Verification

- ✅ Magic link login works
- ✅ Super admin lands on `/admin` page
- ✅ No redirect loops
- ✅ Session info correctly passed to pages
