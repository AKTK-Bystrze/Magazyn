# Reservation Management Stories

[← Back to Index](../index.md)

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

[← Back to Index](../index.md)
