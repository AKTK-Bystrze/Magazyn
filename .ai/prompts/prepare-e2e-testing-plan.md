# Prompt: Prepare E2E Testing Plan

> Reusable prompt for generating comprehensive E2E test implementation plans.

---

## Usage

Copy this prompt and fill in the `[PLACEHOLDERS]` with your specific feature details.

---

## Prompt Template

```
Review the following user stories and create a comprehensive E2E test implementation plan:

**Feature:** [FEATURE_NAME]

**User Stories to Cover:**
- [US-XXX]: [Story title]
- [US-XXX]: [Story title]
- ...

**Reference Documentation:**
- @[documentation/prd/stories/[FEATURE]_*.md]
- @[documentation/workflows/[FEATURE]-workflow.md]
- @[frontend/docs/e2e-testing.md]

**Output File:** `.ai/[feature]-e2e-plan.md`

---

### Requirements

1. **Test Isolation:**
   - Each test MUST be independent
   - Create prerequisites in `beforeEach` hooks
   - Clean up in `afterEach`/`afterAll` (even on failure)
   - No shared state between tests

2. **Test Cases:**
   - Happy path (complete flow)
   - Validation errors (invalid input)
   - Edge cases and error handling
   - Conflict/collision scenarios
   - Multi-user scenarios (if applicable)

3. **Plan Structure:**
   - Overview with covered user stories
   - Test isolation strategy
   - Page Object Models needed
   - Test cases table (test name, description, setup, assertions)
   - Example code for complex scenarios
   - Required `data-testid` attributes
   - Helper functions for setup/teardown
   - Verification plan (how to run tests)

4. **Follow E2E Testing Guidelines:**
   - Use `data-testid` for selectors (never CSS classes or text)
   - Never use hardcoded timeouts (`waitForTimeout`)
   - Use Playwright's auto-retrying `expect` assertions
   - Import from `./fixtures`, not `@playwright/test`
   - Use `authenticatedPage` fixture for protected routes
   - Add TSDoc comments to test files

5. **Questions for Review:**
   - If unclear about test data strategy, ask
   - If multi-user tests are needed, confirm second user fixture approach
   - If conflict testing approach is unclear, ask

---

### Example Test Case Table Format

| Test | Description | Setup | Key Assertions |
|------|-------------|-------|----------------|
| `should [action]` | [What user does] | [Prerequisites] | [Expected outcomes] |

---

### Example Helper Functions

Include helper functions for:
- `clearCart(page)` - Reset cart state
- `create[Entity](page, data)` - Create test data
- `cleanup[Entity](supabaseAdmin, id)` - Cleanup via API
- `restoreCredits(supabaseAdmin, userId, amount)` - Reset credits
```

---

## Example Usage

```
Review the following user stories and create a comprehensive E2E test implementation plan:

**Feature:** Equipment Reservation

**User Stories to Cover:**
- US-009: Select Multiple Items for Reservation
- US-010: Create Reservation - Date Selection
- US-011: Create Reservation - Availability Check
- US-012: Create Reservation - Confirmation Screen
- US-013: Create Reservation - Finalization
- US-016: Modify Reservation Dates
- US-042: Handle Invalid Date Range
- US-046: Handle Reservation Conflict

**Reference Documentation:**
- @[documentation/prd/stories/reservations_creation.md]
- @[documentation/prd/stories/done/reservation_creation.md]
- @[documentation/workflows/reservation-workflow.md]
- @[frontend/docs/e2e-testing.md]

**Output File:** `.ai/reservation-e2e-plan.md`
```

---

## Checklist for Review

Before implementing the plan, verify:

- [ ] All user stories are covered by at least one test
- [ ] Happy path test covers complete user journey
- [ ] Validation tests cover all error messages from PRD
- [ ] Cleanup functions ensure test isolation
- [ ] All required `data-testid` attributes are listed
- [ ] Page Object Models are defined for complex interactions
- [ ] Helper functions reduce code duplication
- [ ] Verification commands are correct and runnable
