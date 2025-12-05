# View Implementation Plan Equipment Search

## 1. Overview
The Equipment Search view is the central hub for discovering and finding equipment to rent. It allows users to browse the inventory, filter by specific attributes (type, status), and search by text. The view is designed to be responsive, offering a sidebar filter on desktop and a drawer on mobile, with real-time feedback via URL synchronization.

## 2. View Routing
- **Path:** `/equipment`
- **Access Control:** Protected Route. Requires authenticated user (Role: User, Admin, SuperAdmin).

## 3. Component Structure
- `src/pages/equipment/index.astro` (Astro Shell)
  - `EquipmentSearchContainer` (React, Client-load)
    - `EquipmentViewLayout`
      - `MobileFilterTrigger` (Visible on Mobile)
      - `FilterSidebar` (Desktop) / `FilterDrawer` (Mobile)
      - `EquipmentResults`
        - `EquipmentGrid`
          - `EquipmentCard`
        - `PaginationControls`

## 4. Component Details

### EquipmentSearchContainer
- **Description:** The smart container that holds the view's logical state. It bridges the URL search parameters with the data fetching logic (TanStack Query).
- **Main Elements:** `div` wrapper, initializing the `useEquipmentSearch` hook.
- **Handled Interactions:**
  - Initialization of state from URL.
  - Updates URL when filters change.
- **Handled Validation:** N/A (Logic delegated to hooks).
- **Types:** `EquipmentSearchParams`.
- **Props:** None.

### FilterSidebar (and FilterDrawer)
- **Description:** A form containing controls to filter the equipment list.
- **Main Elements:**
  - Search Bar (`Input` with icon).
  - Type Filter (`Select` or `Combobox`).
  - Availability Filter (`RadioGroup` or `Select`: "All", "Available", "Unavailable").
  - "Reset Filters" button.
- **Handled Interactions:**
  - Text input (debounced).
  - Selection changes.
- **Validation:** None local (inputs are flexible).
- **Types:** `EquipmentType[]`.
- **Props:**
  - `filters`: `EquipmentSearchParams`
  - `onFilterChange`: `(key, value) => void`
  - `types`: `EquipmentType[]`

### EquipmentGrid
- **Description:** Displays the list of equipment or appropriate empty/loading states.
- **Main Elements:** 
  - CSS Grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
  - list of `EquipmentCard`.
- **Handled Interactions:** None.
- **Types:** `Equipment` DTO.
- **Props:**
  - `items`: `Equipment[]`
  - `isLoading`: `boolean`
  - `error`: `Error | null`

### EquipmentCard
- **Description:** Represents a single equipment item with key details.
- **Main Elements:**
  - `Card`, `CardContent`, `CardFooter`.
  - Image (`AspectRatio` with fallback).
  - Badges (`StatusBadge`).
  - Cost display (`CreditDisplay` - US-003/Shared).
  - "Details" Button (Link).
- **Handled Interactions:** Click to navigate to details.
- **Validation:** Visual indication if status is `broken`.
- **Types:** `Equipment` DTO.
- **Props:** `item`: `Equipment`.

## 5. Types
New types should be added to `src/types.ts` or `src/lib/types/equipment.ts`.

```typescript
// Enums matching DB
export type EquipmentStatus = 'ok' | 'broken' | 'blocked';

// DTO from API
export interface Equipment {
  id: string;
  name: string;
  description: string | null;
  type_id: string;
  type: {
      id: string;
      name: string;
      credit_cost_per_day: number;
  };
  status: EquipmentStatus;
  image_path: string | null;
  internal_id: string;
  is_favorite?: boolean; // If supported by backend (US-008)
}

// Search Params State
export interface EquipmentSearchParams {
  q?: string;           // Search query
  type_id?: string;     // Filter by Type
  status?: EquipmentStatus; // Filter by Status
  page: number;         // Pagination
  limit: number;        // items per page (10, 25, 50, 100)
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
```

## 6. State Management
The view relies on **URL Search Params** as the single source of truth for filter state, ensuring the view is shareable and bookmarks work.
- **Hook:** `useEquipmentSearch()`
  - Reads `window.location.search`.
  - Exposes `filters` object and `updateFilter(key, value)` function.
  - Updates URL history (push or replace).
- **Data Query:** `useQuery(['equipment', filters])` triggers fetches when filters change.

## 7. API Integration
The View requires the `GET /api/equipment` endpoint.
*Note: `src/lib/api.ts` currently supports `post`. It must be extended to support `get`.*

**Request:**
- **Method:** `GET`
- **URL:** `/api/equipment`
- **Query Params:**
  - `q`: string
  - `type_id`: string (UUID)
  - `status`: string ('ok', 'broken')
  - `page`: number
  - `limit`: number

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Red Kayak",
      "status": "ok",
      "type": { "name": "Kayak", "credit_cost_per_day": 4 },
      ...
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    ...
  }
}
```

## 8. User Interactions
- **Initial Load:** Fetches queries based on default params (Page 1, No filters).
- **Typing in Search:** Updates local state immediately, updates URL/fetches after 300ms debounce.
- **Changing Type/Status:** Immediately updates URL and fetches new data. Resets `page` to 1.
- **Pagination:** Clicking "Next" updates `page` in URL, scrolls to top, fetches next page.
- **Card Click:** Navigates to `/equipment/[id]`.

## 9. Conditions and Validation
- **Search Query:** Trimmed whitespace.
- **Page Number:** Must be >= 1.
- **Permissions:** Admin controls invisible to Users? (Not specified, but Editing is Admin only. Search is visible to all).
- **Broken Equipment:** Displayed but marked clearly (Red badge).

## 10. Error Handling
- **Network Errors:** `TanStack Query` provides `isError`. Display a retry button or friendly error message in the grid area.
- **Empty State:** If `data.length === 0` and `!isLoading`, show a "No instruments found" illustration/text.
- **Invalid Images:** `EquipmentCard` handles `onError` for standard `img` tags or use a robust `Image` component to show a placeholder.

## 11. Implementation Steps
1.  **Update API Client:** Add `get<T>(url, params)` method to `src/lib/api.ts` handling query string construction and auth headers.
2.  **Define Types:** Add `Equipment`, `EquipmentSearchParams`, and `PaginatedResponse` to `src/types.ts`.
3.  **Create Components:**
    - `src/components/equipment/EquipmentCard.tsx` (using shadcn Card).
    - `src/components/equipment/EquipmentGrid.tsx`.
    - `src/components/equipment/FilterSidebar.tsx`.
4.  **Implement State Logic:** Create custom hook `src/hooks/use-equipment-search.ts` for URL sync.
5.  **Build Main Container:** Assemble `EquipmentSearchContainer.tsx` with Layout and Query.
6.  **Create Page:** `src/pages/equipment/index.astro` using the container.
7.  **Verify:** Test search, filters (simultaneous), and pagination limits.
