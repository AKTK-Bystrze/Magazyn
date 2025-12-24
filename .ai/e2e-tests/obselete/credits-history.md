# E2E Test Plan: Credits History

> **Status**: Planning
> **Compliance**: [Frontend Rules](../frontend/docs/rules/frontend.md), [E2E Rules](../frontend/docs/rules/playwright-e2e-itesting.md)

## 1. New Page Object Model
**File**: `frontend/e2e/page-objects/credit-history.pom.ts`

### Class: `CreditHistoryPage`
- **Constructor**: Accepts `Page`.
- **Methods**:
  - `goto()`: Navigates to `/credits/history`.
  - `getHistoryTable()`: Returns the table locator.
  - `getHistoryRow(index: number)`: Returns row locator.
  - `getColumnHeader(name: string)`: Returns header locator.
  - `hoverReason(rowIndex: number)`: Hovers over the reason badge.

## 2. Test Scenarios (`tests/credits/history.spec.ts`)

**Global Config**:
- Viewport: Mobile (Pixel 5).
- User: `testUser` fixture (standard user).

### Scenario 1: Comprehensive History View (Mobile)
**Goal**: Verify layout, responsive columns, and interactions in a single pass.
- **Fixture**: `authenticatedPage`.
- **Pre-condition**: Intercept `GET /api/credits/history` to return 3 fixed mock records (ensures reliable data assertions).
- **Steps**:
    1. **Navigate**: Go to `/credits/history`.
    2. **Layout Check**: 
       - Assert `CREDIT_HISTORY_UI_STRINGS.PAGE_TITLE` is visible.
       - Assert table is visible.
       - Assert exactly 3 rows are rendered.
    3. **Responsive Check (Mobile)**:
       - Assert "Autor" column header is visible.
       - Assert "Opis" (Description) column header is **hidden**.
    4. **Interaction Check (Tooltip)**:
       - Hover over the "Powód" badge in the first row.
       - Assert tooltip appears containing the full description text from mock data.
    5. **Visual Regression**: 
       - `await expect(page).toHaveScreenshot('credit-history-mobile-full.png')`.

### Scenario 2: Empty State
**Goal**: Verify UI when no history exists.
- **Fixture**: `authenticatedPage`.
- **Pre-condition**: Intercept `GET /api/credits/history` to return `[]`.
- **Steps**:
    1. Navigate to `/credits/history`.
    2. Verify "Brak historii" (No history) component is visible.
    3. Verify Table is **hidden**.

## 3. Required Constants (`constants/test-ids.ts`)
Add the following `data-testid` attributes to source code and `constants/test-ids.ts`:
- `CREDIT_HISTORY_TABLE`
- `CREDIT_HISTORY_ROW`
- `CREDIT_HISTORY_EMPTY_STATE`
