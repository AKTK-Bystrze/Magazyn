# Equipment Browsing Stories

[← Back to Index](../index.md)

---

## US-007: View Equipment Details

**Description:** As a user, I want to view detailed information about equipment so I can make informed rental decisions.

**Acceptance Criteria:**

- User can click on equipment item from search results
- Equipment details page displays:
  - Name
  - Type
  - Description
  - Status (ok/broken)
  - Credit cost per day
  - Image (or placeholder if no image)
  - Maintenance history (if available)
- Broken equipment is clearly marked with warning indicator
- User can navigate back to search results

---

## US-008: View Favorite Equipment

**Description:** As a user, I want to see my favorite items (top 3 per type) first in search results so I can quickly reserve my preferred equipment.

**Acceptance Criteria:**

- System calculates favorites based on user's rental history
- Top 3 items per equipment type are identified as favorites
- Favorites appear first in search results, before other items
- Favorites are clearly marked or visually distinguished
- If user has no rental history, no favorites are shown
- Favorites update based on recent rental activity

---

## US-041: Handle Equipment Unavailable

**Description:** As a user, I want to see why equipment is unavailable so I can understand when it might be available.

**Acceptance Criteria:**

- System checks availability before allowing reservation
- If item is unavailable, system displays clear reason:
  - "Item is broken and unavailable"
  - "Item is already reserved for [dates]"
- Unavailable items are marked in search results
- Broken items show warning indicator
- User cannot select unavailable items for reservation

---
