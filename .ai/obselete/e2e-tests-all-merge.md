# E2E Tests Complete Refactor Plan

Comprehensive plan to refactor **all** E2E tests for parallel execution with worker isolation, running on mobile viewport.

---

## User Decisions

> Confirmed answers to pending questions:

1. **Test User Strategy**: Reuse shared test user (no worker-specific users)
2. **Equipment Type**: Use first available equipment type from database
3. **Target Device**: Mobile-first (application primarily designed for phones)

---

## Mobile-First Testing

> [!IMPORTANT]
> This application is **primarily designed for phones**. All E2E tests run on mobile viewport.

### Playwright Config

```typescript
// playwright.config.ts - change device from Desktop to Mobile
projects: [
  {
    name: 'Mobile Chrome',
    use: { ...devices['Pixel 5'] },  // 393x851 viewport
    dependencies: ['setup'],
  },
]
```

---

## Current Test Inventory

| File | Tests | Isolation Needed | Consolidation Opportunity |
|------|-------|------------------|---------------------------|
| `tests/reservation-creation.spec.ts` | 5 | ✅ Yes (creates reservations) | → 2 comprehensive tests |
| `tests/equipment/browsing.spec.ts` | 7 | ⚠️ Partial (adds to cart) | → 3 comprehensive tests |
| `tests/auth/login.spec.ts` | 2 | ❌ No (read-only) | Keep as-is |
| `tests/auth/diagnostic.spec.ts` | 4 | ❌ No (read-only) | Keep as-is |

---

## Phase 1: Infrastructure (Shared Fixtures)

> See [e2e-tests-merge.md](./e2e-tests-merge.md) for detailed implementation.

### Files to Modify

| File | Change |
|------|--------|
| `playwright.config.ts` | Change to mobile device (Pixel 5) |
| `e2e/constants/config.ts` | Add `TEST_EQUIPMENT_PREFIX` |
| `e2e/fixtures/index.ts` | Add `workerIndex`, `testEquipment` fixtures |
| `e2e/helpers/data-setup.helper.ts` | Add `createTestEquipment`, `cleanupTestEquipment` |

---

## Phase 2: Reservation Tests

> See [e2e-tests-merge.md](./e2e-tests-merge.md) for detailed implementation.

### Consolidation

| Before (5 tests) | After (2 tests) |
|------------------|-----------------|
| should complete full reservation flow with 2 items | **Happy Path: Complete reservation flow** |
| should display cart with all selected items | ↳ *(merged)* |
| should show total cost for all items | ↳ *(merged)* |
| should clear cart after successful reservation | ↳ *(merged)* |
| should remove items from cart | **Cart Management: Remove items** |

---

## Phase 3: Equipment Browsing Tests

### Current State

[browsing.spec.ts](file:///e:/bystrze/Magazyn/frontend/e2e/tests/equipment/browsing.spec.ts) previously had 7 tests.

### Solution: Consolidate tests

We consolidated most browsing tests into the **Happy Path** reservation test to verify browsing components (Search Container, Grid, Card functionality) as part of the user flow.

| After | Merges |
|-------|--------|
| **Equipment Details** | `should open equipment details on click` (Kept as standalone) |
| **Merged into Reservation Happy Path** | Grid Display, Search Container, Card Details, Cart Indicator, Add to Cart logic |

---

## Phase 4: Auth Tests

| File | Tests | Action |
|------|-------|--------|
| `login.spec.ts` | 2 | ✅ Keep as-is (read-only) |
| `diagnostic.spec.ts` | 4 | ✅ Keep as-is (diagnostic utility) |

No changes needed - both are read-only and can run parallel without conflicts.

---

## Summary: Test Count

| Phase | Before | After | Saved |
|-------|--------|-------|-------|
| Reservation | 5 | 2 | 3 tests |
| Equipment | 7 | 1 | 6 tests |
| Auth | 6 | 6 | 0 (unchanged) |
| **Total** | **18** | **9** | **9 tests** |

---

## Files Modified (Complete List)

| File | Action |
|------|--------|
| `playwright.config.ts` | MODIFY - change to mobile device |
| `e2e/constants/config.ts` | MODIFY - add test data constants |
| `e2e/fixtures/index.ts` | MODIFY - add worker-isolated fixtures |
| `e2e/helpers/data-setup.helper.ts` | MODIFY - add equipment creation/cleanup |
| `e2e/helpers/reservation.helper.ts` | MODIFY - remove unused functions |
| `e2e/tests/reservation-creation.spec.ts` | MODIFY - consolidate to 2 tests (includes browsing checks) |
| `e2e/tests/equipment/browsing.spec.ts` | MODIFY - consolidate to 1 test |
| `e2e/tests/auth/login.spec.ts` | NO CHANGE |
| `e2e/tests/auth/diagnostic.spec.ts` | NO CHANGE |
| `frontend/docs/e2e-testing.md` | MODIFY - update documentation |

---

## Documentation Updates

### [MODIFY] [e2e-testing.md](file:///e:/bystrze/Magazyn/frontend/docs/e2e-testing.md)

Update documentation to reflect:
- Mobile-first testing configuration
- Worker-isolated fixtures (`testEquipment`, `workerIndex`)
- Consolidated test structure
- Equipment creation/cleanup helpers

---

## Verification Plan

### After All Phases

```bash
# Run full E2E suite with 4 workers on mobile viewport
cd frontend && npm run e2e -- --workers=4

# Expected: All 11 tests pass, no conflicts
```

### Success Criteria

1. ✅ All tests pass when run with 4 workers
2. ✅ Tests run on mobile viewport (Pixel 5)
3. ✅ No "Conflict detected" errors in backend logs
4. ✅ No leftover test equipment in database after run
5. ✅ Total runtime reduced (parallelism gains > setup overhead)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Equipment creation fails | Use first available `equipment_type`, log clear error |
| Cleanup incomplete | Mark equipment with `E2E-Test-` prefix, add periodic cleanup job |
| Mobile UI issues | All tests run on mobile viewport - issues caught early |
| Test flakiness | Use explicit waits, not timeouts; retry on transient failures |
