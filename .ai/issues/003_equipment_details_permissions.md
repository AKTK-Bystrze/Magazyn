---
title: [Bug/Feature] Fix Maintenance Log Duplication & Permissions
labels: bug, feature, frontend, backend
assignees: ''
---

## Description
This issue addresses two related problems with Maintenance Logs:
1.  **Permissions**: Currently, only Admins can add maintenance logs (controlled by `readOnly` prop). **All users** should be able to add maintenance logs.
2.  **Duplication Bug**: When a maintenance log is added, it is currently being created twice: once authored by the "System" and once by the user.

## Acceptance Criteria
- [ ] **All users** (not just Admins) can see and use the "Add Maintenance Log" form in `EquipmentDetailsSheet`.
- [ ] Adding a maintenance log results in exactly **one** new log entry.
- [ ] The single log entry is correctly authored by the current user (not "System", unless triggered by an automated system event).

## Technical Details
-   **Target**: 
    -   `frontend/src/components/Equipment/EquipmentSearchContainer.tsx` (Permissions)
    -   `frontend/src/components/Equipment/MaintenanceLogSection.tsx` (Permissions)
    -   `frontend/src/hooks/useEquipmentDetails.ts` (Duplication investigation)
    -   **Backend**: Check the endpoint handling `addMaintenanceLog` (likely `EquipmentController` or service). It might be automatically creating a system log side-by-side with the user log.
-   **Permissions Logic**:
    -   In `EquipmentSearchContainer.tsx`, the `readOnly={!isAdmin}` prop passed to `EquipmentDetailsSheet` prevents non-admins from adding logs.
    -   We need to verify if `readOnly` interacts with other components. If `readOnly` is *only* for hiding the log form, we should remove it or pass `false` for everyone.
    -   If `readOnly` is needed for *other* fields (e.g., editing equipment attributes), we should decouple `MaintenanceLogSection`'s read-only state from the main equipment details read-only state.
-   **Duplication Logic**:
    -   Frontend mutation looks standard (`equipmentApi.addMaintenanceLog`).
    -   Most likely a backend issue where a "status change" (if applicable) triggers a system log *in addition* to the user's manual note.

---

## 👨‍💻 Developer Guide

### 📚 Relevant Documentation
*[MANDATORY]* Include links to:
- **[Project Structure](../../documentation/project_structure.md)**
- **[Frontend Coding Standards](../../frontend/docs/coding_standards.md)** and **[Backend Coding Standards](../../backend/docs/coding_standards.md)**
- **[Global Rules](../../.agent/rules/good-practises.md)**
- **[Backend Rules](../../backend/docs/rules)** and **[Frontend Rules](../../frontend/docs/rules)**

### 📝 Implementation Steps
1.  **Fix Permissions**:
    -   Modify `EquipmentSearchContainer.tsx` to stop passing `readOnly={!isAdmin}` or ensure it doesn't affect `MaintenanceLogSection`.
    -   Alternatively, modify `EquipmentDetailsSheet.tsx` to always pass `readOnly={false}` to `MaintenanceLogSection`, regardless of the sheet's `readOnly` prop.
2.  **Fix Duplication**:
    -   Debug the backend `addMaintenanceLog` handler.
    -   Check if the service creates a log for the "status change" AND allows the user to create a text log, resulting in two entries.
    -   Consolidate into a single log entry containing both the status change (if any) and the user's notes.

### ✅ Verification
1.  **Permissions**: Log in as a *Standard User*. Open Equipment Details. Verify you see the "Add Maintenance Log" button.
2.  **Duplication**: Add a log note (e.g., "Test Note"). Refresh. Verify only **one** entry appears with "Test Note" authored by you.
