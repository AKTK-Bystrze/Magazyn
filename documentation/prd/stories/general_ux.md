# General UX Stories

[← Back to Index](../index.md)

---

## US-051: View Paginated Results

**Description:** As a user, I want to navigate through paginated results so I can view large lists efficiently.

**Acceptance Criteria:**

- Pagination controls are available on all list views
- User can select items per page: 10, 25, 50, 100
- User can navigate to next/previous page
- User can jump to specific page number
- Current page and total pages are displayed
- Pagination state is maintained when filtering or sorting

---

## US-052: Handle Network Errors

**Description:** As a user, I want to see clear error messages when network requests fail so I understand what went wrong.

**Acceptance Criteria:**

- System detects network errors and timeouts
- System displays user-friendly error messages
- Error messages suggest retrying the operation
- User can retry failed operations
- Critical operations (like reservation creation) can be retried
- System does not lose user input on recoverable errors

---

## US-053: View Mobile-Optimized Interface

**Description:** As a user, I want to use the system on my mobile device so I can rent equipment on the go.

**Acceptance Criteria:**

- Interface is responsive and works on mobile devices
- Core flows (search, reserve, view) are optimized for mobile
- Touch targets are appropriately sized
- Forms are mobile-friendly
- Navigation is accessible on small screens
- Calendar view works on mobile devices

---

[← Back to Index](../index.md)
