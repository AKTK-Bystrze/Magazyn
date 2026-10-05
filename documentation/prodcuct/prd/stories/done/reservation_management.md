
## US-014: View Reservation List

**Description:** As a user, I want to view all my reservations so I can see my rental history and current reservations.

**Acceptance Criteria:**

- User can access reservation list from dashboard
- Reservation list displays:
  - Equipment name and type
  - Start and end dates
  - Status (PENDING, RENTED, RETURNED, DENIED)
  - Credit cost
- Reservations are sorted by date (most recent first)
- User can filter by status
- List supports pagination (10, 25, 50, 100 items per page)
- User can click on reservation to view details

---


## US-016: Modify Reservation Dates

**Description:** As a user, I want to modify the dates of my PENDING reservations so I can adjust my plans without cancelling.

**Acceptance Criteria:**

- User can modify dates only for their own PENDING reservations
- User can access date modification from reservation details page
- User can change start date (must be in future)
- User can change end date (must be after start date)
- System warns if extension is significant (>50% increase or >3 days)
- System automatically recalculates credits
- System shows credit adjustment (refund or additional charge)
- User can confirm or cancel the modification
- Credits are adjusted immediately upon confirmation
- Reservation dates are updated in the system
- System checks availability for new dates before allowing modification

---


## US-015: View Reservation Details

**Description:** As a user, I want to view detailed information about a specific reservation so I can see all relevant details.

**Acceptance Criteria:**

- User can click on reservation from list to view details
- Reservation details page shows:
  - Equipment name, type, description
  - Start and end dates
  - Status
  - Credit cost
  - Date created
  - Status change history (if available)
  - **Audit trail timeline** showing chronological list of all changes:
    - What changed (dates, status, etc.)
    - Who made the change (user or admin name)
    - When the change occurred (timestamp)
- User can see if reservation is modifiable (PENDING status)
- User can navigate back to reservation list

---

## US-020: View Rental History

**Description:** As a user, I want to see my rental change history so I can track all my past reservations.

**Acceptance Criteria:**

- User can access rental history from dashboard
- History displays all past and current reservations
- History shows:
  - Equipment name and type
  - Dates
  - Status
  - Credit cost
  - Date created and modified
- History is sorted by most recent first
- History supports pagination (10, 25, 50, 100 items per page)
- All history is kept indefinitely
- User can filter by status or date range

---


## US-020A: View Reservation Change History (Audit Trail)

**Description:** As a user, I want to see a timeline of all changes made to my reservations so I can track what was modified and by whom.

**Acceptance Criteria:**

- User can view audit trail from reservation details page
- Audit trail displays chronological list of all changes
- Each audit record shows:
  - What changed (initial creation, status change, date modification)
  - Complete snapshot of reservation state at that moment (equipment, dates, status)
  - Who made the change (username or admin name)
  - When the change occurred (timestamp)
- Audit records are displayed in chronological order (oldest to newest)
- Users can only view audit trail for their own reservations
- Admins can view audit trail for all reservations
- Audit trail is read-only (cannot be modified or deleted)
- Timeline clearly shows the progression of reservation from creation to current state

---

## US-021A: View All System Reservations

**Description:** As a user, I want to view all reservations in the system (not just my own) so I can see equipment availability and what others have reserved.

**Acceptance Criteria:**

- User can access "All Reservations" tab from the reservations page
- Reservations page has two tabs: "My Reservations" (default) and "All Reservations"
- Tab selection updates URL query param (`?scope=my` / `?scope=all`) for shareable links
- "All Reservations" view displays all users' reservations with full details:
  - Equipment name, type
  - User name (who made the reservation)
  - Start and end dates
  - Status
  - Credit cost
- Current user's reservations are visually highlighted (e.g., subtle border, badge)
- **No action buttons** are shown in "All Reservations" view for regular users (read-only)
- Admin users CAN see action buttons on all reservations in "All Reservations" view
- All existing filters (status, sort) work in both tabs
- Pagination works in both tabs
- Default view is "My Reservations" when navigating to `/reservations`

---


## US-017: Cancel Reservation

**Description:** As a user, I want to cancel my PENDING reservations anytime before admin confirms so I have flexibility.

**Acceptance Criteria:**

- User can cancel only their own PENDING reservations
- User can access cancel option from reservation details page
- System displays confirmation dialog before cancellation
- Upon confirmation, reservation status changes to DENIED
- Credits are refunded immediately
- Cancelled item immediately becomes available for other users
- User sees updated credit balance
- Cancelled reservation appears in history with DENIED status

---

## US-047: Handle Date Modification Warning

**Description:** As a user, I want to be warned when I significantly extend my reservation dates so I understand the credit impact.

**Acceptance Criteria:**

- System calculates if date extension is significant (>50% increase or >3 days)
- System displays warning message:
  - "You are extending your reservation significantly. Additional credits will be charged."
  - Shows current dates and new dates
  - Shows additional credit cost
- User can confirm to proceed or cancel to modify
- Warning appears before credit adjustment is applied

---
