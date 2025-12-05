# Authentication & Session Management Stories

[← Back to Index](../index.md)

---

## US-001: User Login

**Description:** As a user, I want to log in using my email address so I can access the system securely.

**Acceptance Criteria:**

- User can enter their email address on the login page
- System sends a login link to the provided email address
- User can click the link to authenticate
- User is redirected to the dashboard after successful login
- User session is established and maintained
- User session expires after 2 hours of inactivity
- User is redirected to login page when session expires

---

## US-002: User Logout

**Description:** As a user, I want to log out of the system so I can securely end my session.

**Acceptance Criteria:**

- User can access logout functionality from any page
- Clicking logout ends the current session
- User is redirected to login page after logout
- User cannot access protected pages after logout without re-authenticating

---

## US-043: Handle Session Timeout

**Description:** As a user, I want to be notified when my session expires so I can log in again.

**Acceptance Criteria:**

- System tracks user activity
- System expires session after 2 hours of inactivity
- When session expires, user is redirected to login page
- System displays message explaining session expiration
- User must log in again to continue
- User's work is not lost (if possible, data is preserved)

---

[← Back to Index](../index.md)
