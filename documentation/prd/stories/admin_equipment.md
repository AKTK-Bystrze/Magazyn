# Admin Equipment Stories

[← Back to Index](../index.md)

---


## US-030: Admin - Edit Equipment

**Description:** As an admin, I want to edit equipment parameters so I can keep inventory information up to date.

**Acceptance Criteria:**

- Admin can access edit form from equipment details page
- Admin can edit all fields:
  - Name
  - Description
  - Status
  - Type
  - Credit cost per day
  - Image (replace or remove)
- Changes are saved immediately
- Updated information appears in search results
- If status changes to broken, system shows warning
- If status changes to broken, maintenance log reminder appears

---



## US-032: Admin - Add Maintenance Log Entry

**Description:** As an admin, I want to add maintenance log entries so I can track equipment maintenance history.

**Acceptance Criteria:**

- Admin can access maintenance log from equipment details page
- Admin can add log entry with:
  - Optional notes
  - Timestamp (auto-generated)
  - Status change (if applicable)
- System gently reminds admin to add notes when status changes to broken
- Maintenance history is displayed chronologically
- Maintenance history is visible to users on equipment details page

---

[← Back to Index](../index.md)
