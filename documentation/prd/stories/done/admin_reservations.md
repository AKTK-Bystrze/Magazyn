
## US-026: Admin - Create Reservation for User

**Description:** As an admin, I want to create a reservation as a selected different user so I can help users who need assistance.

**Acceptance Criteria:**

- Admin can access "Create Reservation for User" function
- Admin can select user from list
- Admin follows same reservation creation flow as user
- Reservation is created in selected user's name
- Credits are deducted from selected user's account
- Reservation appears in selected user's reservation list
- Email notification sent to selected user (not admin)

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


## US-025: Admin - Change Reservation Status

**Description:** As an admin, I want to change reservation status so I can manage the rental workflow.

**Acceptance Criteria:**

- Admin can change status of any reservation (except final states RETURNED and DENIED)
- Admin can change RENTED to RETURNED
- Admin can change PENDING to DENIED
- Status changes are saved immediately
- **Status changes are automatically logged in audit trail**
- Status change history is recorded
- User is notified of status changes (if applicable)
- Credits are adjusted if status change affects credit balance

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