# Reservation Creation Stories

[← Back to Index](../index.md)

---

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

## US-042: Handle Invalid Date Range

**Description:** As a user, I want to see validation errors for invalid date selections so I can correct my input.

**Acceptance Criteria:**

- System validates start date is in the future
- System validates end date is after start date
- System displays clear error messages for invalid dates:
  - "Start date must be in the future"
  - "End date must be after start date"
- Date picker prevents selection of invalid dates where possible
- User cannot proceed with invalid date range

---

## US-045: View Reservation Email Notification

**Description:** As a user, I want to receive an email when I create a reservation so I have a record of my rental.

**Acceptance Criteria:**

- Email is sent immediately when reservation is created
- Email contains:
  - All reserved items in the session
  - For each item: name, type, description, dates, credits
  - Total credits deducted
  - Remaining balance
  - Link to view reservation
- Email is sent only once per reservation session
- Email is sent to user's registered email address
- Email format is clear and readable

---

## US-046: Handle Reservation Conflict

**Description:** As a user, I want to be prevented from creating conflicting reservations so equipment availability is maintained.

**Acceptance Criteria:**

- System checks for date conflicts before creating reservation
- System prevents reservation if dates overlap with existing reservation
- System displays error message showing conflicting dates
- System shows which dates are already reserved
- User can modify dates to avoid conflict
- Conflict check includes back-to-back reservations (end time equals next start time is allowed)

---

[← Back to Index](../index.md)
