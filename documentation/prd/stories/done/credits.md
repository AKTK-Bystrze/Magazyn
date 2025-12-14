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