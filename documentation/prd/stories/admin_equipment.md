# Admin Equipment Stories

[← Back to Index](../index.md)

---

## US-029: Admin - Add Equipment

**Description:** As an admin, I want to add new equipment so I can expand the inventory.

**Acceptance Criteria:**

- Admin can access "Add Equipment" form
- Admin can enter:
  - Name (required)
  - Type (select from existing or create new)
  - Description
  - Status (ok/broken)
  - Credit cost per day
  - Image upload (optional, 2MB max, JPEG/PNG)
- System validates all required fields
- System validates image file size and type
- System generates thumbnail for uploaded image
- New equipment appears in search results immediately
- Admin can set credit cost when creating new equipment type

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
