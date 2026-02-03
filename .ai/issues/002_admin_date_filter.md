---
title: [Bug] Admin missing dates filter in Equipment Browse
labels: bug, frontend
assignees: ''
---

## Description
The Admin view in Equipment Browse (`EquipmentSearchContainer`) currently hides the date range filter. Admins need this filter to check equipment availability for specific dates, similar to regular users.

## Acceptance Criteria
- [ ] Admin users see the Date Range Picker in the Equipment Browse sidebar/filter area.
- [ ] Filtering by date works correctly for Admins.

## Technical Details
- **Target**: `frontend/src/components/Equipment/EquipmentSearchContainer.tsx`
- **Logic Change**: The `showDates` prop passed to `<FilterSidebar>` is currently `!isAdmin`. This needs to be changed to `true` (or removed if default is true) to allow admins to see dates.

---

## 👨‍💻 Developer Guide (Good First Issue)

### 📚 Relevant Documentation
*[MANDATORY]* Include links to:
- **[Project Structure](../../documentation/project_structure.md)**
- **[Frontend Coding Standards](../../frontend/docs/coding_standards.md)** and **[Backend Coding Standards](../../backend/docs/coding_standards.md)**
- **[Global Rules](../../.agent/rules/good-practises.md)**
- **[Backend Rules](../../backend/docs/rules)** and **[Frontend Rules](../../frontend/docs/rules)**

### 📝 Implementation Steps
1.  Identify the component responsible for the equipment search view and its filter configuration.
2.  Adjust the logic passing the `showDates` prop to the `FilterSidebar` component to ensure it is always true, or at least visible for admins.
3.  Verify that this change propagates to both mobile and desktop views.

### ✅ Verification
-   **Visual Check**: Log in as an Admin. Go to the Equipment Browse page. You should now see the Date Range Picker in the filter sidebar.
-   **Functionality**: Select a date range. The equipment list should filter based on availability for those dates.
