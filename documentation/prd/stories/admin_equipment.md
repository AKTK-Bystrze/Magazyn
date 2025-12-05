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

## US-031: Admin - Add Equipment Type

**Description:** As an admin, I want to add new equipment types with configurable credit costs so I can support different equipment categories.

**Acceptance Criteria:**

- Admin can access "Add Equipment Type" form
- Admin can enter:
  - Type name (required)
  - Credit cost per day (required, positive number)
- System validates that type name is unique
- New type appears in equipment type dropdown immediately
- New type can be used when adding or editing equipment
- Admin can set default credit cost for the type

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

## US-044: Handle Image Upload Errors

**Description:** As an admin, I want to see clear error messages when image upload fails so I can correct the issue.

**Acceptance Criteria:**

- System validates image file size (max 2MB)
- System validates image file type (JPEG, PNG only)
- System displays clear error messages:
  - "File size exceeds 2MB limit"
  - "File type not supported. Please use JPEG or PNG"
- User can retry upload with corrected file
- Validation occurs before upload attempt

---

[← Back to Index](../index.md)
