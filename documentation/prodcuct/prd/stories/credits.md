# Credit System Stories

[← Back to Index](../index.md)



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



[← Back to Index](../index.md)
