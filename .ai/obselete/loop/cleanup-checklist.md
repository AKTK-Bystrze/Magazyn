# Debug Code Cleanup Checklist

> [!IMPORTANT]
> **Pre-cleanup Verification**: Ensure the redirect loop is fully resolved before removing debug code!

**Date Created**: 2025-12-08  
**Issue Reference**: [report.md](file:///e:/bystrze/Magazyn/.ai/loop/report.md)

---

## Files to Clean

### 1. `frontend/src/middleware/index.ts`

- [ ] Remove excessive `console.log` statements
- [ ] Remove debug comments like `// DEBUG:` or `// TEMP:`
- [ ] Keep essential logging for production (errors only)
- [ ] Verify middleware still correctly:
  - Validates session cookie
  - Passes `sessionInfo` to `context.locals`
  - Redirects based on `isEnabled` and role

### 2. `frontend/src/components/auth/AuthListener.tsx`

- [ ] Remove `logToServer()` calls added for debugging
- [ ] **KEEP** the redirect timing delay (important for cookie propagation)
- [ ] **KEEP** the `isRedirectInProgress` flag (prevents duplicate redirects)
- [ ] Remove verbose session logging
- [ ] Verify auth flow still works:
  - Magic link processing
  - Cookie setting
  - Proper redirects

### 3. `frontend/src/pages/api/logger.ts`

- [ ] **Decision Required**: Keep or remove?
  - Keep: Useful for production error logging
  - Remove: Was only for debugging
- [ ] If keeping: Remove file write to `frontend-browser-debug.log`
- [ ] If removing: Delete the entire file

### 4. `frontend/frontend-browser-debug.log`

- [ ] Delete this debug log file
- [ ] Add to `.gitignore` if not already there

### 5. `frontend/src/lib/supabase.ts` (Browser Client)

- [ ] Verify config is correct:
  - `detectSessionInUrl: false` ← **KEEP THIS** (part of fix)
  - Review other settings

### 6. `frontend/src/env.d.ts`

- [ ] **KEEP** the `sessionInfo` type declaration in `Astro.Locals`
- [ ] This was part of the fix, not debug code

### 7. `frontend/astro.config.mjs`

- [ ] **KEEP** `output: 'server'` ← **CRITICAL** (main fix)
- [ ] No cleanup needed, just verification

---

## Code Patterns to Remove

Look for these patterns across frontend files:

```typescript
// Remove these patterns:
console.log('🔍 DEBUG:...')
console.log('🔔 AuthListener:...')
logToServer('INFO', ...)
logToServer('DEBUG', ...)

// Keep these patterns:
console.error(...)  // Production error logging
logToServer('ERROR', ...)  // If keeping logger API
```

---

## Cleanup Verification Steps

After removing debug code:

1. [ ] Restart frontend dev server
2. [ ] Clear browser cache and cookies
3. [ ] Test magic link login flow
4. [ ] Verify super_admin lands on `/admin`
5. [ ] Verify no redirect loops
6. [ ] Check browser console for errors
7. [ ] Check terminal for proper (non-debug) logs

---

## Related Documentation

- [Resolution Report](file:///e:/bystrze/Magazyn/.ai/loop/report.md)
- [Debug Plan](file:///e:/bystrze/Magazyn/.ai/loop/plan.md)
- [Auth Description](file:///e:/bystrze/Magazyn/.ai/loop/auth-description.md)
- [Cookie Session Description](file:///e:/bystrze/Magazyn/.ai/loop/cookie-session-description.md)
- [Redirect Description](file:///e:/bystrze/Magazyn/.ai/loop/redirect-description.md)
