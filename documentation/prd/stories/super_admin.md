# Super Admin Stories

[← Back to Index](../index.md)

---

## US-035: SuperAdmin - Create User Account

**Description:** As a superAdmin, I want to create user accounts so new members can access the system.

**Acceptance Criteria:**

- SuperAdmin can access "Create User" form
- SuperAdmin can enter:
  - Username (required, unique)
  - Email address (required, unique, valid format)
  - Initial credit balance (optional, with default value)
  - User role (user, admin, superAdmin)
- System validates all required fields
- System validates email format and uniqueness
- System validates username uniqueness
- New user account is created immediately
- User receives email with login instructions
- User appears in user list

---

## US-036: SuperAdmin - View All Users

**Description:** As a superAdmin, I want to view all users so I can manage the user base.

**Acceptance Criteria:**

- SuperAdmin can access user list
- User list displays:
  - Username
  - Email address
  - Current credit balance
  - Role
  - Account status
  - Date created
- List supports pagination
- SuperAdmin can search users by name or email
- SuperAdmin can filter by role

---

## US-037: SuperAdmin - Edit User Profile

**Description:** As a superAdmin, I want to edit user profiles so I can update user information and manage accounts.

**Acceptance Criteria:**

- SuperAdmin can access edit form from user list or profile page
- SuperAdmin can edit:
  - Email address
  - Credit balance
  - User role
  - Account status (active/inactive)
- Changes to credit balance are logged in user's credit history
- Changes are saved immediately
- Updated information appears in user list

---

[← Back to Index](../index.md)
