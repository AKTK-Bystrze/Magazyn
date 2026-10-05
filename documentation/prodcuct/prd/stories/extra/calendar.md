# Calendar Stories

[← Back to Index](../index.md)

---

## US-018: View Calendar - All Reservations

**Description:** As a user, I want to see a calendar view showing all reservations so I can understand overall equipment availability.

**Acceptance Criteria:**

- User can access calendar view from navigation
- Calendar displays 30 days (current date + 29 days ahead)
- Calendar shows all equipment reservations
- A plate spanning a range of dates is showing users reservations:
    - on each plate is user name and equipment name
    - on each plate is a button details that will redirect to reservation details page if it is one reservation. When it is couple of reservations then it will redirect to reservations list page with filter for this dates range selected
    - on each plate is button "join" that will redirect to equipment reservation page with the same dates range selected
    - when couple of users have reservation on the same dates range then on the plate their names are listed only

---

## US-019: View Calendar - Item Specific

**Description:** As a user, I want to see a calendar view for a specific equipment item so I can see when it's available.

**Acceptance Criteria:**

- User can access item-specific calendar from equipment details page
- Calendar displays 30 days (current date + 29 days ahead)
- Calendar shows availability for selected equipment item only
- Dates are color-coded:
  - Green: Available
  - Red: Reserved
  - Gray: Past dates
- User can see which dates have existing reservations
- User can click on available dates to pre-fill reservation form

---

[← Back to Index](../index.md)
