
## US-055: View Maintenance History

**Description:** As a user, I want to view equipment maintenance history so I can understand equipment condition.

**Acceptance Criteria:**

- Maintenance history is visible on equipment details page
- History shows:
  - Timestamp
  - Status change (if applicable)
  - Notes (if provided)
- History is sorted chronologically (most recent first)
- History is read-only for users
- Empty history shows appropriate message

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