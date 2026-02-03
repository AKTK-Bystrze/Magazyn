---
title: [Refactor] Equipment manager & viewer component reuse
labels: refactor, frontend, good-first-issue
assignees: ''
---

## Description
Replace duplicate `EquipmentFilters` component in Equipment Manager with the shared `FilterSidebar` component used in the Viewer.

## Acceptance Criteria
- [ ] `EquipmentManagerContainer` uses `FilterSidebar` instead of `EquipmentFilters`.
- [ ] `FilterSidebar` uses `orientation="horizontal"` and `showDates={false}` in Manager view.
- [ ] `EquipmentFilters.tsx` is deleted.

## Technical Details
- **Target**: `frontend/src/components/Equipment/EquipmentManagerContainer.tsx`
- **Replacement**: `frontend/src/components/Equipment/FilterSidebar.tsx`
- **Removal**: `frontend/src/components/Equipment/EquipmentFilters.tsx`

---

### 📚 Relevant Documentation
Before starting, checking these docs might be helpful:
- **[Project Structure](../../documentation/project_structure.md)**: Understand where files are located.
- **[Frontend Architecture](../../frontend/docs/architecture.md)**: Overview of our React/Astro setup.
- **[Coding Standards](../../frontend/docs/coding_standards.md)**: Guidelines for writing clean code.

    ```
