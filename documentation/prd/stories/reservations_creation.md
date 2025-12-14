# Reservation Creation Stories

[← Back to Index](../index.md)

---

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
