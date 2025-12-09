# Redirect Loop Debugging Plan - Enabled Users

> [!NOTE]
> **STATUS: ✅ RESOLVED** - See [report.md](file:///e:/bystrze/Magazyn/.ai/loop/report.md) for fix details

**Issue**: Enabled users experiencing redirect/refresh loop on login page  
**User**: `appbystrze@gmail.com` (role: `super_admin`, `isEnabled: true`)  
**Date**: 2025-12-08  
**Resolution Date**: 2025-12-08  
**Browser Log Reference**: `frontend-browser-debug.log`
**Related Documentation**: [cookie-session-description.md](file:///e:/bystrze/Magazyn/.ai/loop/cookie-session-description.md#L573-L592), [auth-description.md](file:///e:/bystrze/Magazyn/.ai/loop/auth-description.md), [redirect-description.md](file:///e:/bystrze/Magazyn/.ai/loop/redirect-description.md)

---

## Executive Summary

> [!IMPORTANT]
> **This issue has been RESOLVED.** The root cause was confirmed as **missing SSR mode in Astro config** combined with **cookie timing race conditions** and **duplicate redirect triggers**.

An **enabled super_admin user** was stuck in a redirect/refresh loop when accessing the login page. Analysis of logs revealed a clear pattern:

1. User lands on `/login` page
2. `AuthListener` component detects `SIGNED_IN` event
3. Component fetches backend session (`isEnabled: true`, `role: super_admin`)
4. Component redirects to `/admin` (role-based default route)
5. **Page refreshes/reloads** back to `/login`
6. **Loop repeats indefinitely**

The loop cycle time is approximately **2-3 seconds** per iteration.

> [!IMPORTANT]
> **Documented Issue Confirmed**: This matches the known issue documented in [cookie-session-description.md](file:///e:/bystrze/Magazyn/.ai/loop/cookie-session-description.md#L573-L592) under "**Potential Issues and Edge Cases → 1. Race Condition: Cookie Set After Redirect**".

### Key Architectural Context

From the documentation review:

1. **Supabase Client Config** ([supabase.client.ts](file:///e:/bystrze/Magazyn/frontend/src/db/supabase.client.ts)):
   - `persistSession: false` → Session NOT stored server-side
   - `detectSessionInUrl: false` → URL hash must be manually processed
   - `autoRefreshToken: false` → No automatic token refresh

2. **Cookie Timing** ([cookie-session-description.md:506](file:///e:/bystrze/Magazyn/.ai/loop/cookie-session-description.md#L506)):
   > "⚠️ **Timing Issue**: Cookie is set **AFTER** session establishment, creating race condition window."

3. **Session Flow**:
   - Magic link click → `checkHashForToken()` processes hash
   - Calls `setSession()` → Triggers `SIGNED_IN` event
   - Event handler sets cookie **asynchronously**
   - Meanwhile, hash processing **already initiated redirect**
   - Result: **Cookie not yet set when redirect request happens**

---

## Observed Symptoms from Logs

### Pattern from `frontend-browser-debug.log`

Each cycle shows this exact sequence:

```
[BROWSER] React DevTools warning
[BROWSER] 🔧 Supabase Client Configuration
[BROWSER] 🔔 AuthListener: Auth event: SIGNED_IN
[BROWSER] 🍪 AuthListener: Auth cookie set
[BROWSER] ✅ AuthListener: User signed in: "appbystrze@gmail.com"
[BROWSER] 🔍 AuthListener: Fetching detailed session info...
[BROWSER] 📡 Fetching user session from backend...
[BROWSER] ✅ Session info received: { isEnabled: true, role: "super_admin" }
[BROWSER] Checking redirect (auth event): current=/login, target=/admin
[BROWSER] Redirecting to: /admin
[BROWSER] 🔔 AuthListener: Auth event: INITIAL_SESSION
[BROWSER] 🍪 AuthListener: Auth cookie set
[BROWSER] Session active: "appbystrze@gmail.com"
```

**Then the cycle repeats** - indicating page reload back to `/login`

### Key Observations

1. ✅ **Authentication works**: Backend confirms `isEnabled: true`, `role: super_admin`
2. ✅ **Session fetch works**: Backend returns proper session data
3. ✅ **Cookie is set**: `magazyn-auth-token` cookie is created
4. ✅ **Redirect logic executes**: AuthListener correctly identifies redirect target as `/admin`
5. ❌ **Redirect fails**: After redirecting to `/admin`, page reloads back to `/login`
6. 🔄 **Multiple auth events**: `SIGNED_IN` → `INITIAL_SESSION` sequence repeats

### Backend Logs (Terminal 769620)

Backend shows repeated successful session fetches:
```
✅ Session retrieved successfully for user c07c34fd-d654-4ab8-84dc-ecc23a90277d
Profile found - Username: appbystrze, Email: appbystrze@gmail.com, Enabled: true
✅ Auth successful - proceeding to handler
```

No backend errors - all authentication succeeds.

### Frontend Logs (Terminal 835536)

Frontend middleware logs show:
```
📋 Middleware: Session info received: Enabled=true, Role=super_admin
[200] POST /api/logger 296ms
```

Middleware is executing and receiving correct session info.

---

## Root Cause Hypotheses

### 🔴 Hypothesis A: Client-Side vs Server-Side Race Condition

**Problem**: AuthListener (client-side) redirects to `/admin` BEFORE cookie is available to middleware

**Flow**:
1. User accesses `/login` 
2. Page loads, AuthListener mounts
3. AuthListener detects `SIGNED_IN` event
4. AuthListener sets cookie (`document.cookie = ...`)
5. AuthListener executes redirect: `window.location.href = '/admin'`
6. **Browser makes request to `/admin`** 
7. **RACE**: Cookie may not be sent with this request yet
8. Middleware runs on `/admin` request
9. **If no cookie**: Middleware sees unauthenticated user
10. Middleware redirects to `/login?redirect=/admin`
11. AuthListener on `/login` sees authenticated user
12. **LOOP**

**Evidence**:
- Browser log shows cookie being set IMMEDIATELY before redirect
- No delay between cookie set and redirect
- Cookie is set via JavaScript, which is async to navigation

**Likelihood**: ⭐⭐⭐⭐⭐ **VERY HIGH**

> [!WARNING]
> **This is the CONFIRMED ISSUE from existing documentation**  
> See [cookie-session-description.md:573-592](file:///e:/bystrze/Magazyn/.ai/loop/cookie-session-description.md#L573-L592):  
> *"Scenario: User logs in via magic link → checkHashForToken() calls setSession() → Function redirects immediately → onAuthStateChange event fires **AFTER** redirect initiated → Cookie set **AFTER** new page request sent → Middleware on new page doesn't see cookie → Redirects back to login"*

**Additional Evidence from Documentation**:
1. AuthListener sets cookie at line 126 **inside** `onAuthStateChange` callback
2. But `checkHashForToken()` redirects at line 101 **outside** the event handler
3. Browser navigation happens **synchronously** (blocking)
4. Event handler fires **asynchronously** (non-blocking)
5. **Guaranteed race condition**

---

### 🟡 Hypothesis B: Multiple AuthListener Instances

**Problem**: Multiple instances of AuthListener firing conflicting redirects

**Flow**:
1. Page loads with AuthListener component
2. Component mounts, sets up `onAuthStateChange` subscription
3. `SIGNED_IN` event fires → redirects to `/admin`
4. New page loads with new AuthListener instance
5. New instance mounts, detects session
6. Fires `INITIAL_SESSION` event
7. May trigger additional redirect logic

**Evidence**:
- Logs show both `SIGNED_IN` and `INITIAL_SESSION` events in sequence
- Each page load creates new React component instance
- Subscription cleanup happens in `useEffect` return

**Likelihood**: ⭐⭐⭐ **MEDIUM**

---

### 🟡 Hypothesis C: Middleware Redirect of Authenticated User from `/login`

**Problem**: Middleware redirects authenticated user away from `/login`, creating conflict with client-side logic

**Code Reference**: `middleware/index.ts` lines 134-149

```typescript
if (url.pathname === "/login" && context.locals.user) {
    const redirect = url.searchParams.get("redirect");
    if (redirect && redirect !== "/login" && redirect !== "/") {
        return Response.redirect(new URL(redirect, url.origin).toString(), 302);
    } else {
        const defaultRoute = getDefaultRouteForUser(context.locals.user, sessionInfo);
        return Response.redirect(new URL(defaultRoute, url.origin).toString(), 302);
    }
}
```

**Flow**:
1. Middleware sees authenticated user on `/login`
2. Middleware redirects to role default route (`/admin`)
3. `/admin` page loads with AuthListener
4. **Something redirects back to `/login`**
5. Middleware redirects again to `/admin`
6. **LOOP**

**Missing piece**: What redirects from `/admin` back to `/login`?

**Likelihood**: ⭐⭐⭐ **MEDIUM** (explains the redirect, but not what sends user back)

---

### 🟡 Hypothesis D: `/admin` Page Missing or Access Denied

**Problem**: `/admin` route doesn't exist or redirects back to `/login`

**Check**:
- Does `/admin` page exist in `frontend/src/pages/`?
- Does `/admin` have its own redirect logic?
- Does middleware block access to `/admin` for authenticated users?

**Likelihood**: ⭐⭐ **LOW** (backend logs show successful auth, middleware should allow)

> [!NOTE]
> **Middleware Redundancy Confirmed**: [cookie-session-description.md:607-617](file:///e:/bystrze/Magazyn/.ai/loop/cookie-session-description.md#L607-L617) documents:
> - Frontend middleware validates token with Supabase
> - Backend validates same token again
> - This is known redundancy but not causing the loop

---

### 🟢 Hypothesis E: Stale Session / Token Issues

**Problem**: Session is valid client-side but invalid server-side

**Evidence Against**:
- Backend logs show successful token verification
- Backend confirms `isEnabled: true`
- Session fetch returns valid data

**Likelihood**: ⭐ **VERY LOW** (logs contradict this)

---

## Step-by-Step Investigation Plan

### Phase 1: Confirm Cookie Timing Issue ⭐⭐⭐⭐⭐

**Objective**: Verify if cookie is sent with redirect request to `/admin`

#### Step 1.1: Add Network Request Logging

**File**: `frontend/src/components/auth/AuthListener.tsx`

**Add before redirect (line 174)**:
```typescript
// Log cookies before redirect
console.log('🔍 REDIRECT DEBUG: Cookies before navigation:', document.cookie);
console.log('🔍 REDIRECT DEBUG: Current path:', window.location.pathname);
console.log('🔍 REDIRECT DEBUG: Target path:', redirectTo);

// Add a small delay to ensure cookie propagation
await new Promise(resolve => setTimeout(resolve, 100));

window.location.href = redirectTo;
```

**Purpose**: Confirm cookie exists before redirect

> [!TIP]
> This diagnostic directly tests the race condition hypothesis

---

#### Step 1.2: Add Middleware Cookie Inspection

**File**: `frontend/src/middleware/index.ts`

**Add at line 59 (right after URL parsing)**:
```typescript
console.log('🔍 REDIRECT DEBUG - Middleware Check:');
console.log('  Path:', url.pathname);
console.log('  Has user:', !!context.locals.user);
console.log('  User email:', context.locals.user?.email);
console.log('  Cookie header:', context.request.headers.get('cookie'));
```

**Purpose**: See what cookies middleware receives

---

#### Step 1.3: Browser DevTools Network Tab

**Manual Steps**:
1. Open browser DevTools → Network tab
2. Enable "Preserve log" 
3. Clear network log
4. Access `/login` page
5. **Watch for redirect to `/admin`**
6. **Inspect the request to `/admin`**:
   - Check Request Headers → Cookie
   - Is `magazyn-auth-token` present?
7. **Watch for subsequent redirect back to `/login`**
   - What triggered it?
   - Status code? (302?)

**Expected Results**:
- **If cookie missing**: Confirms Hypothesis A
- **If cookie present**: Rules out Hypothesis A, investigate further

---

### Phase 2: Check for Multiple Redirects

**Objective**: Identify all sources of redirects

#### Step 2.1: Add Redirect Tracking

**Create new file**: `frontend/src/lib/debug/redirect-tracker.ts`

```typescript
// Track all redirects to detect loops
const redirectLog: Array<{ from: string; to: string; source: string; timestamp: number }> = [];

export function logRedirect(from: string, to: string, source: string) {
  const entry = { from, to, source, timestamp: Date.now() };
  redirectLog.push(entry);
  
  console.log(`🔄 REDIRECT: ${from} → ${to} (via ${source})`);
  
  // Detect loop
  const recentRedirects = redirectLog.slice(-5);
  const paths = recentRedirects.map(r => r.to);
  const uniquePaths = new Set(paths);
  
  if (paths.length === 5 && uniquePaths.size <= 2) {
    console.error('⚠️ REDIRECT LOOP DETECTED:', recentRedirects);
  }
  
  return redirectLog;
}
```

**Use in AuthListener** (line 174):
```typescript
import { logRedirect } from '@/lib/debug/redirect-tracker';

// Before redirect
logRedirect(window.location.pathname, redirectTo, 'AuthListener-SIGNED_IN');
window.location.href = redirectTo;
```

**Use in Middleware** (lines 84, 91, 120, 130, 147):
```typescript
import { logRedirect } from '../lib/debug/redirect-tracker';

// Example at line 84:
console.log("🔄 Redirecting disabled user to /account-disabled");
logRedirect(url.pathname, '/account-disabled', 'Middleware-DisabledCheck');
return Response.redirect(...);
```

**Purpose**: Track every redirect to see circular patterns

---

### Phase 3: Verify `/admin` Route

**Objective**: Confirm `/admin` page exists and is accessible

#### Step 3.1: Check File Existence

**Command**:
```bash
ls -la frontend/src/pages/admin*
```

**Expected**: File exists (`.astro` or directory with `index.astro`)

---

#### Step 3.2: Check for Redirect in `/admin` Page

**File**: `frontend/src/pages/admin.astro` (or `admin/index.astro`)

**Look for**:
- Any `Astro.redirect()` calls
- Any `<meta http-equiv="refresh">` tags
- Any client-side `window.location` assignments

**Purpose**: Rule out self-redirect from target page

---

### Phase 4: Test Cookie Propagation Delay

**Objective**: Confirm if adding delay fixes the issue

#### Step 4.1: Add Delay Before Redirect

**File**: `frontend/src/components/auth/AuthListener.tsx`

**Modify redirect logic (line 172-174)**:

```typescript
if (currentPath !== targetPath) {
  logToServer('INFO', 'Redirecting to:', redirectTo);
  
  // TEMPORARY FIX: Add delay to ensure cookie is set
  await new Promise(resolve => setTimeout(resolve, 200));
  
  window.location.href = redirectTo;
}
```

**Test**:
1. Save file
2. Clear browser cache and cookies
3. Navigate to `/login`
4. **Observe**: Does loop still occur?

**Expected**:
- **If loop stops**: Confirms Hypothesis A (cookie timing issue)
- **If loop continues**: Issue is elsewhere

---

### Phase 5: Disable Client-Side Redirects

**Objective**: Test if middleware alone can handle redirects

#### Step 5.1: Temporarily Disable AuthListener Redirects

**File**: `frontend/src/components/auth/AuthListener.tsx`

**Comment out redirect (lines 172-174)**:

```typescript
if (currentPath !== targetPath) {
  logToServer('INFO', '[DISABLED] Would redirect to:', redirectTo);
  // TEMPORARILY DISABLED FOR TESTING
  // window.location.href = redirectTo;
}
```

**Test**:
1. Access `/login` with valid session
2. **Observe**: Does middleware redirect to `/admin`?
3. **Does `/admin` page load successfully?**

**Expected**:
- **If `/admin` loads**: Client-side redirect is causing conflict
- **If still loops**: Middleware issue

---

## Diagnostic Code Snippets

### Enhanced Logging Bundle

Add to `frontend/src/middleware/index.ts` at **line 134**:

```typescript
if (url.pathname === "/login" && context.locals.user) {
  console.log('🔍 MIDDLEWARE: Authenticated user on /login');
  console.log('  User:', context.locals.user.email);
  console.log('  Session Info:', sessionInfo);
  console.log('  Redirect param:', url.searchParams.get("redirect"));
  console.log('  Cookies:', context.request.headers.get('cookie'));
  
  const redirect = url.searchParams.get("redirect");
  // ... rest of code
}
```

Add to `frontend/src/components/auth/AuthListener.tsx` at **line 170**:

```typescript
logToServer('INFO', `🔍 AUTH LISTENER: Redirect decision`);
logToServer('INFO', `  Current: ${currentPath}`); 
logToServer('INFO', `  Target: ${targetPath}`);
logToServer('INFO', `  SessionInfo:`, sessionInfo);
logToServer('INFO', `  User:`, session.user.email);
logToServer('INFO', `  Cookies:`, document.cookie);
```

---

### Browser Console Redirect Detector

Paste in browser console:

```javascript
// Detect and log all redirects
let redirectCount = 0;
const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href');

Object.defineProperty(window.location, 'href', {
  set: function(url) {
    redirectCount++;
    console.log(`🔄 REDIRECT #${redirectCount}:`, window.location.pathname, '→', url);
    console.trace('Redirect stack trace');
    originalHref.set.call(window.location, url);
  },
  get: originalHref.get
});

console.log('✅ Redirect detector installed');
```

---

## Verification Tests

### Test 1: Manual Navigation to `/admin`

**Steps**:
1. Log in successfully (get valid session)
2. Wait for any redirects to complete
3. **Manually type** `http://localhost:4321/admin` in address bar
4. Press Enter

**Expected Result**:
- **If `/admin` loads successfully**: Redirect issue is in JavaScript code
- **If redirects back to `/login`**: Middleware or `/admin` page issue

---

### Test 2: Disabled User Flow (Control Test)

**Steps**:
1. Set user `isEnabled` to `false` in database
2. Log in with magic link
3. Observe redirect behavior

**Expected Result**:
- Should redirect to `/account-disabled`
- Should NOT loop
- **If loops**: Issue affects both enabled and disabled users
- **If works**: Issue is specific to enabled user redirect logic

---

### Test 3: Direct `/admin` Access While Logged In

**Steps**:
1. Log in successfully (may loop on `/login`)
2. Open new browser tab
3. Navigate directly to `http://localhost:4321/admin`

**Expected Result**:
- **If `/admin` loads**: Cookie is valid, redirect is issue
- **If redirects to `/login`**: Cookie not persisting across requests

---

## Immediate Quick Fixes to Test

### Quick Fix A: Add Redirect Delay (2 lines)

**File**: `frontend/src/components/auth/AuthListener.tsx` line 174

```typescript
// Change from:
window.location.href = redirectTo;

// To:
setTimeout(() => window.location.href = redirectTo, 150);
```

**Why**: Ensures cookie is set before navigation

---

### Quick Fix B: Use `window.location.replace()` (1 line)

**File**: `frontend/src/components/auth/AuthListener.tsx` line 174

```typescript
// Change from:
window.location.href = redirectTo;

// To:
window.location.replace(redirectTo);
```

**Why**: Prevents browser from adding to history, may prevent back-navigation loops

---

### Quick Fix C: Force Cookie with `SameSite=None; Secure` (Only for localhost testing)

**File**: `frontend/src/components/auth/AuthListener.tsx` line 126

```typescript
// Change from:
document.cookie = `magazyn-auth-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;

// To:
document.cookie = `magazyn-auth-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Domain=localhost`;
```

**Why**: Explicitly set cookie domain

---

## Expected Findings

Based on the log analysis, **Hypothesis A (Cookie Timing Race Condition)** is most likely:

### Predicted Root Cause

1. **AuthListener** sets cookie via JavaScript
2. **Immediately** redirects to `/admin` (no delay)
3. **Browser** navigation happens before cookie is attached to request
4. **Middleware** on `/admin` request sees NO cookie
5. **Middleware** redirects to `/login?redirect=/admin`
6. **AuthListener** on `/login` sees session, redirects to `/admin`
7. **INFINITE LOOP**

### Predicted Fix

Add 100-200ms delay between cookie setting and redirect:

```typescript
// Set cookie
document.cookie = `magazyn-auth-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;

// Wait for cookie to propagate
await new Promise(resolve => setTimeout(resolve, 150));

// Then redirect
window.location.href = redirectTo;
```

---

## ✅ Resolution Summary

**Date Resolved**: 2025-12-08

All hypothesized issues were confirmed and fixed. See [report.md](file:///e:/bystrze/Magazyn/.ai/loop/report.md) for complete details.

### Root Causes Fixed

| Issue | File | Fix Applied |
|-------|------|-------------|
| Missing SSR Mode | `astro.config.mjs` | Added `output: 'server'` |
| SessionInfo Not Passed | `middleware/index.ts` | Store `sessionInfo` in locals |
| Wrong Role Source | `admin.astro` | Use `sessionInfo.role` |
| Missing Type Declaration | `env.d.ts` | Add `sessionInfo` type |
| Cookie Timing Race | `AuthListener.tsx` | Added delay and verification |
| Supabase Config Conflict | `lib/supabase.ts` | Set `detectSessionInUrl: false` |
| Duplicate Redirect Triggers | `AuthListener.tsx` | Added `isRedirectInProgress` flag |

### Verification Completed

- ✅ Magic link login works
- ✅ Super admin lands on `/admin` page
- ✅ No redirect loops
- ✅ Session info correctly passed to pages

---

## 🧹 Cleanup Required

The following debug code should be removed after verification:

### Files to Clean

1. **`frontend/src/middleware/index.ts`**
   - Remove excessive console.log statements
   - Remove debug comments

2. **`frontend/src/components/auth/AuthListener.tsx`**
   - Remove debug logging (`logToServer` calls)
   - Review timing delay - may need to keep for cookie propagation

3. **`frontend/src/pages/api/logger.ts`**
   - Consider keeping or removing based on production needs

4. **`frontend/frontend-browser-debug.log`**
   - Delete debug log file

---

## Additional Resources

- [Resolution Report](file:///e:/bystrze/Magazyn/.ai/loop/report.md)
- [Auth Description](file:///e:/bystrze/Magazyn/.ai/loop/auth-description.md)
- [Cookie Session Description](file:///e:/bystrze/Magazyn/.ai/loop/cookie-session-description.md)
- [Redirect Description](file:///e:/bystrze/Magazyn/.ai/loop/redirect-description.md)

