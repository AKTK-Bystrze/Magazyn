---
title: "[Chore] Suppress False Positive Browser Errors in E2E Logs"
labels: chore, testing, e2e
assignees: ''
---

## Description
E2E tests generate console errors (`ERR_CONNECTION_REFUSED`) when Supabase auth tries to refresh sessions. These are false positives—the external endpoints aren't accessible from CI, but tests pass correctly. Suppressing these reduces log noise.

## Acceptance Criteria
- [ ] `ERR_CONNECTION_REFUSED` errors for auth session refresh are suppressed in E2E logs
- [ ] Other genuine errors are still logged
- [ ] E2E tests continue to pass

## Technical Details
- **Target**: `frontend/e2e/` test setup files

---

## 👨‍💻 Developer Guide

### 📚 Relevant Documentation
- **[E2E Testing](../../frontend/e2e/README.md)**
- **[Frontend Coding Standards](../../frontend/docs/coding_standards.md)**
- **[Global Rules](../../.agent/rules/good-practises.md)**

### **Locate the files**:
- `frontend/e2e/fixtures/` (or base test setup file)

### 📝 Implementation Steps

1. Locate the Playwright test setup or base fixture
2. Add a console message handler that filters known false positives:
   ```javascript
   page.on('console', msg => {
     if (msg.type() === 'error' && msg.text().includes('ERR_CONNECTION_REFUSED')) {
       return; // Suppress known false positive
     }
     console.log(msg);
   });
   ```
3. Apply to all page fixtures or the global setup

### ✅ Verification

- **CI Check**: E2E logs no longer contain `ERR_CONNECTION_REFUSED` noise
- **Functionality**: All E2E tests still pass; genuine errors are still visible
