# Credit System Stories

[← Back to Index](../index.md)

---

## US-003: View Credit Balance

**Description:** As a user, I want to see my current credit balance on every page so I always know how much I have available.

**Acceptance Criteria:**

- Credit balance is displayed in the navbar/header on all pages
- Credit balance updates immediately after any credit transaction
- Credit balance is accurate and reflects all recent changes
- Credit balance is visible on mobile and desktop views

---

## US-004: View Credit History

**Description:** As a user, I want to view my credit change history so I can track all credit transactions.

**Acceptance Criteria:**

- User can access credit history page from their dashboard
- Credit history displays all credit changes with:
  - Timestamp
  - Amount changed (positive or negative)
  - Reason (reservation, request, admin adjustment)
  - Admin name (if applicable)
- Credit history supports pagination (10, 25, 50, 100 items per page)
- Credit history is sorted by most recent first
- All history is kept indefinitely

---

## US-005: Request Credits

**Description:** As a user, I want to request credits for club work so I can earn credits for my contributions.

**Acceptance Criteria:**

- User can access credit request form from their dashboard
- User can enter:
  - Short text description of work performed
  - Requested credit amount
- User can submit the request
- System validates that requested amount is a positive number
- System displays confirmation message after submission
- Request appears in user's credit history with PENDING status
- User receives notification when request is approved or denied

---

## US-038: SuperAdmin - Approve Credit Request

**Description:** As a superAdmin, I want to approve credit requests with modified amounts so I can adjust based on work value.

**Acceptance Criteria:**

- SuperAdmin can access pending credit requests list
- Request list shows:
  - User name
  - Requested amount
  - Description of work
  - Date requested
- SuperAdmin can:
  - Approve requested amount
  - Modify requested amount
  - Add optional note explaining modification
  - Deny request
- Upon approval, credits are added to user's account
- Credit change is logged in user's credit history
- User receives notification of approval/denial
- Request status is updated

---

## US-039: SuperAdmin - Modify User Credits

**Description:** As a superAdmin, I want to directly modify user credits so I can manage the credit system.

**Acceptance Criteria:**

- SuperAdmin can modify credits from user profile page
- SuperAdmin can add or subtract credits
- SuperAdmin can enter amount and optional note
- Credit change is logged in user's credit history
- User's credit balance updates immediately
- Change appears in user's credit history with superAdmin name

---

## US-040: Handle Insufficient Credits

**Description:** As a user, I want to see a clear error message when I don't have enough credits so I know why my reservation failed.

**Acceptance Criteria:**

- System checks credit balance before allowing reservation
- If insufficient credits, system displays error message
- Error message shows:
  - Required credits
  - Available credits
  - Shortfall amount
- User cannot proceed with reservation until credits are sufficient
- User is directed to credit request or balance information

---

[← Back to Index](../index.md)
