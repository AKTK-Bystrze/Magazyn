
## US-009: Select Multiple Items for Reservation

**Description:** As a user, I want to select multiple items and reserve them in one transaction so I don't have to repeat the process.

**Acceptance Criteria:**

- User can select multiple equipment items from search results
- Selected items are added to a reservation cart or selection list
- User can view all selected items before proceeding
- User can remove items from selection
- Total credit cost is calculated and displayed for all selected items
- User can proceed to date selection with all selected items

---

## US-010: Create Reservation - Date Selection

**Description:** As a user, I want to select start and end dates for my reservation so I can specify the rental period.

**Acceptance Criteria:**

- User can select start date (date picker)
- User can select end date (date picker)
- System validates that start date is in the future
- System validates that end date is after start date
- System calculates number of days for credit calculation
- User can see total credit cost based on selected dates
- Calendar view is available to help select dates
- User can click calendar dates to pre-fill date fields

---

## US-011: Create Reservation - Availability Check

**Description:** As a user, I want the system to check availability before I create a reservation so I know if equipment is available.

**Acceptance Criteria:**

- System checks availability for all selected items and dates
- System prevents reservation if any item is unavailable
- System displays clear error messages explaining why item is unavailable:
  - Item already reserved for selected dates
  - Item is broken/unavailable
  - Invalid date range
- System checks user's credit balance
- System prevents reservation if insufficient credits
- System shows required credits vs available credits if insufficient

---

## US-012: Create Reservation - Confirmation Screen

**Description:** As a user, I want to see a confirmation screen before finalizing my reservation so I can review the total cost and my remaining balance.

**Acceptance Criteria:**

- Confirmation screen displays all selected items with details:
  - Item name
  - Type
  - Description
  - Credit cost per day
  - Number of days
  - Total cost for item
- Confirmation screen shows:
  - Total credit cost for all items
  - Current credit balance
  - Remaining balance after reservation
- User can confirm to create reservation
- User can cancel to go back and modify
- Confirmation is required before reservation is created

---

## US-013: Create Reservation - Finalization

**Description:** As a user, I want to create a reservation so I can rent equipment for my selected dates.

**Acceptance Criteria:**

- After confirmation, system creates separate reservations for each selected item
- Credits are deducted immediately for all reservations
- System displays success message
- User receives email notification with reservation details
- User is redirected to reservation list or dashboard
- Reservations appear in user's reservation list with PENDING status
- All reservations show correct dates and credit costs

---


## US-050: Handle Concurrent Reservation Attempts

**Description:** As a user, I want the system to handle concurrent reservation attempts so I don't lose availability due to race conditions.

**Acceptance Criteria:**

- System checks availability at the moment of reservation creation
- If item becomes unavailable between selection and confirmation, system prevents reservation
- System displays error message explaining item is no longer available
- User can refresh and try again
- System maintains data consistency

---


## US-051: Filter Equipment by Availability Date Range

**Description:** As a user, I want to filter equipment by a date range within which the equipment has to be available so that I can quickly find items I can actually reserve for my desired period.

**Acceptance Criteria:**

- User can specify a start date and end date filter
- System only shows equipment that is available for the entire specified date range
- Items with conflicting reservations for any part of the date range are excluded
- Filter can be combined with other existing filters (name, type, category, availability status)
- Clearing the date filter shows all equipment again (respecting other active filters)
- Date validation follows the same rules as reservation creation (start date in future, end date after start date)

---
