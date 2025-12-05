# Equipment Browsing Stories

[← Back to Index](../index.md)

---

## US-006: Search Equipment

**Description:** As a user, I want to search for available equipment by type, name, or description so I can find what I need quickly.

**Acceptance Criteria:**

- User can access search page from navigation
- User can filter by equipment type (dropdown)
- User can search by name (text input)
- User can search by description (text input)
- User can apply multiple filters simultaneously
- Search results display all matching equipment
- Search results show equipment image or placeholder
- Search results show equipment status (available/unavailable)
- Search results show credit cost per day
- Search results are paginated (10, 25, 50, 100 items per page)
- Favorite items appear first in search results
- All other items are sorted alphabetically by name

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

## US-049: View Equipment Without Image

**Description:** As a user, I want to see a placeholder when equipment has no image so the interface remains consistent.

**Acceptance Criteria:**

- Equipment without image displays placeholder image
- Placeholder is visually consistent with other equipment cards
- Placeholder clearly indicates no image available
- Equipment details page also shows placeholder if no image
- Placeholder does not affect equipment functionality

---

## US-054: Handle Search with No Results

**Description:** As a user, I want to see a message when my search returns no results so I know to adjust my filters.

**Acceptance Criteria:**

- System displays "No results found" message when search returns empty
- Message suggests adjusting filters
- User can clear filters easily
- Search form remains accessible
- User can modify search criteria and try again

---

## US-055: View Maintenance History

**Description:** As a user, I want to view equipment maintenance history so I can understand equipment condition.

**Acceptance Criteria:**

- Maintenance history is visible on equipment details page
- History shows:
  - Timestamp
  - Status change (if applicable)
  - Notes (if provided)
- History is sorted chronologically (most recent first)
- History is read-only for users
- Empty history shows appropriate message

---

[← Back to Index](../index.md)
