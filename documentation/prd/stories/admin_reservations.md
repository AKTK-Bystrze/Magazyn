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

## US-022: Admin - Filter Reservations

**Description:** As an admin, I want to filter reservations by status so I can focus on urgent tasks.

**Acceptance Criteria:**

- Admin can access quick filters: PENDING, Today, Overdue, All
- Filtering by PENDING shows all pending reservations
- Filtering by Today shows reservations starting today
- Filtering by Overdue shows items past end date with status not RETURNED
- Filtering by All shows all reservations
- Filtered results display with user information
- Admin can combine filters or use single filter

---

## US-023: Admin - Manage All Reservations

**Description:** As an admin, I want to manage all reservations with full modification capabilities so I can administer the entire rental system.

> **Note:** All users can now view all reservations via the "All Reservations" tab (see US-021A). This story focuses on admin-specific capabilities.

**Acceptance Criteria:**

- Admin can access all reservations list (same view as regular users with "All Reservations" tab)
- Admin has **action buttons visible** on all reservations (unlike regular users who have read-only access)
- Admin can modify any reservation:
  - Change status (PENDING → RENTED → RETURNED, or PENDING → DENIED)
  - Modify dates
  - Cancel reservation
- List displays:
  - User name and email
  - Equipment name and type
  - Start and end dates
  - Status
  - Credit cost
- Admin can filter by status, user, or date
- Admin can sort by various fields
- List supports pagination
- Admin can click on reservation to view or edit details

---

## US-024: Admin - View User Reservations

**Description:** As an admin, I want to see a selected user's reservation history so I can help with user inquiries.

**Acceptance Criteria:**

- Admin can search for user by name or email
- Admin can select user from list
- Admin can view all reservations for selected user
- User reservations display same information as all reservations view
- Admin can filter and sort user's reservations
- Admin can access user profile from reservation view

---

## US-025: Admin - Change Reservation Status

**Description:** As an admin, I want to change reservation status so I can manage the rental workflow.

**Acceptance Criteria:**

- Admin can change status of any reservation (except final states RETURNED and DENIED)
- Admin can change PENDING to RENTED
- Admin can change RENTED to RETURNED
- Admin can change PENDING to DENIED
- Status changes are saved immediately
- **Status changes are automatically logged in audit trail**
- Status change history is recorded
- User is notified of status changes (if applicable)
- Credits are adjusted if status change affects credit balance

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

## US-028: Admin - Bulk Status Changes

**Description:** As an admin, I want to perform bulk status changes so I can efficiently manage multiple reservations.

**Acceptance Criteria:**

- Admin can select multiple reservations from list
- Admin can choose new status to apply
- System shows preview of affected reservations
- Preview displays:
  - Number of reservations to be changed
  - List of affected reservations
  - New status
- Admin must confirm bulk operation
- System applies status change to all selected reservations
- System displays success message with count of changes
- Credits are adjusted for all affected reservations if applicable

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
