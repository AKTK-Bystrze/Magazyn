# E2E Test Plan: Equipment Manager

> **Status**: Planning
> **Compliance**: [Frontend Rules](../frontend/docs/rules/frontend.md), [E2E Rules](../frontend/docs/rules/playwright-e2e-itesting.md)

## 1. New Page Object Model
**File**: `frontend/e2e/page-objects/equipment-manager.pom.ts`

### Class: `EquipmentManagerPage`
- **Constructor**: Accepts `Page`.
- **Methods**:
  - `goto()`: Navigates to `/admin/equipment/manage`.
  - `clickAddEquipment()`: Opens creation modal.
  - `fillEquipmentForm(data: EquipmentPayload)`: Fills form.
  - `archiveEquipment(name: string)`: Archive action.
  - `getEquipmentRow(name: string)`: Locator for specific item.

## 2. Test Scenarios (`tests/admin/equipment.spec.ts`)

**Global Config**:
- Viewport: Mobile (Pixel 5).
- User: `adminPage` (Admin role).

### Scenario 1: Equipment Management Lifecycle
**Goal**: Verify the entire equipment lifecycle (Create -> List -> Edit -> Archive) in a single unified test.
- **Fixture**: `adminPage`.
- **Steps**:
    1. **Navigate**: Go to `/admin/equipment/manage`.
    2. **Creation**:
       - Click "Add Equipment".
       - Fill form: Name="E2E Lifecycle Item", Desc="Test Desc", Category="Kajaki".
       - Submit.
       - Assert success toast.
    3. **Verification**:
       - Retrieve the newly created item ID (intercept API response or search in list).
       - Assert item appears in the list with correct image placeholder.
       - **Visual Check**: `await expect(page).toHaveScreenshot('equipment-list-with-new-item.png')`.
    4. **Modification**:
       - Click "Edit" on the new item.
       - Change Name -> "Updated Lifecycle Item".
       - Save.
       - Verify list shows "Updated Lifecycle Item".
    5. **Archival (Cleanup)**:
       - Click "Archive" on the item.
       - Confirm dialog.
       - Verify item is removed from active view (or status changed to Archived).
    6. **Final Cleanup**: Ensure item is hard-deleted via API in `afterAll` if archive is not sufficient.

## 3. Required Constants (`constants/test-ids.ts`)
- `ADMIN_EQUIPMENT_TABLE`
- `ADMIN_ADD_EQUIPMENT_BTN`
- `EQUIPMENT_FORM_NAME_INPUT`
- `EQUIPMENT_FORM_SUBMIT`
- `ADMIN_ARCHIVE_BTN`
