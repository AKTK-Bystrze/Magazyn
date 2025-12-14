
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


