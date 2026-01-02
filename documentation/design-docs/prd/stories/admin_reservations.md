# Admin Reservation Stories

[← Back to Index](../index.md)

---

## US-021: Admin - View Dashboard Summary

**Description:** As an admin, I want to see a summary dashboard with pending and overdue items so I can quickly assess what needs attention.

**Acceptance Criteria:**

- Admin dashboard displays summary counts:
  - Number of PENDING reservations
  - Number of overdue items
  - Number of today's rentals
- Dashboard provides quick links to filtered views
- Summary updates in real-time
- Dashboard is the default view when admin logs in

---



## US-023: Admin - Manage All Reservations

**Description:** As an admin, I want to manage all reservations with full modification capabilities so I can administer the entire rental system.

> **Note:** All users can now view all reservations via the "All Reservations" tab (see US-021A). This story focuses on admin-specific capabilities.

**Acceptance Criteria:**

- Admin can access all reservations list (same view as regular users with "All Reservations" tab)
- Admin has **action buttons visible** on all reservations (unlike regular users who have read-only access)
- Admin can modify any reservation:
  - Change status (PENDING → RETURNED, or PENDING → DENIED)
  - Modify dates
  - Cancel reservation
- List displays:
  - User name
  - Equipment name and type
  - Start and end dates
  - Status
  - Credit cost
- Admin can filter by status, user, or date
- Admin can sort by various fields
- List supports pagination
- Admin can click on reservation to view or edit details

---



## US-027: Admin - View Overdue Items

**Description:** As an admin, I want to see overdue items in a panel so I can quickly identify items that need attention.

**Acceptance Criteria:**

- Admin dashboard includes overdue items panel
- Panel lists all overdue reservations (end date passed, status not RETURNED)
- Panel shows:
  - User name and contact information
  - Equipment name
  - Original end date
  - Days overdue
- Admin can click on item to view reservation details
- Panel updates in real-time

---



## US-048: Handle Bulk Operation Errors

**Description:** As an admin, I want to see which reservations failed in bulk operations so I can address issues.

**Acceptance Criteria:**

- System attempts to apply bulk status change to all selected reservations
- System tracks successes and failures
- System displays results:
  - Number of successful changes
  - Number of failed changes
  - List of failed reservations with reasons
- Failed reservations remain unchanged
- Admin can retry failed operations individually

---

[← Back to Index](../index.md)
