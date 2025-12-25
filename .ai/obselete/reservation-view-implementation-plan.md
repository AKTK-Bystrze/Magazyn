# View Implementation Plan: Reservation Cart

## 1. Overview

The Reservation Cart view (`/reservations/create`) enables users to create equipment reservations by selecting multiple items, choosing rental dates, and confirming bookings. This view serves as the final step in the reservation workflow, where users configure their cart, validate availability and credit balance, review costs, and finalize their reservation.

The view integrates with the Equipment Search view for item selection and redirects to the My Reservations view upon successful creation. It implements session-based cart storage, real-time availability validation, credit sufficiency checking, and email notifications.

## 2. View Routing

**Path:** `/reservations/create`

**Access Control:** Authenticated users only (all roles: user, admin, superAdmin)

**Entry Points:**
- From Equipment Search view when user selects items and clicks "Add to Cart"
- Direct navigation when cart contains items (cart persists in sessionStorage)

**Exit Points:**
- Redirect to `/reservations` (My Reservations) after successful reservation creation
- Navigate to Equipment Search view if cart is empty

## 3. Component Structure

```
📄 ReservationCartPage.astro (SSR page)
  ├── 🔷 ReservationCartView.tsx (React - main container)
  │     ├── 🔷 CartItemList.tsx (React)
  │     │     └── 🔷 CartItem.tsx (React)
  │     ├── 🔷 DateRangePicker.tsx (React)
  │     ├── 🔷 CostEstimator.tsx (React)
  │     └── 🔷 ConfirmationModal.tsx (React)
  └── 📦 Shadcn/ui components
        ├── Button
        ├── Card
        ├── Calendar
        ├── Dialog
        ├── Input
        ├── Label
        └── Alert
```

## 4. Component Details

### 4.1 ReservationCartPage.astro

**Description:** Astro SSR page that serves as the entry point for the reservation cart view. Handles authentication check and provides initial data.

**Main Elements:**
- Layout wrapper with authentication validation
- Server-side credit balance fetch
- ReservationCartView component mount point

**Validation:**
- User must be authenticated (redirect to login if not)
- If cart is empty, display empty state with link to Equipment Search

**Types:**
- Uses Astro's APIRoute types
- Props passed to ReservationCartView

**Props:** N/A (entry page)

---

### 4.2 ReservationCartView.tsx

**Description:** Main React component managing the reservation creation workflow. Orchestrates cart management, date selection, availability checks, and reservation submission.

**Main Elements:**
- `<div>` container with responsive grid layout
- `<CartItemList>` component
- `<DateRangePicker>` component  
- `<CostEstimator>` component
- `<ConfirmationModal>` component
- Action buttons (Clear Cart, Create Reservation)

**Handled Events:**
- Remove item from cart
- Date selection change
- Create reservation button click
- Confirmation modal submit
- Clear cart action

**Validation:**
- Cart must not be empty
- Start date must be in the future
- End date must be >= start date
- All items must be available for selected dates
- User must have sufficient credits for total cost

**Types:**
```typescript
interface ReservationCartViewProps {
  initialCreditBalance: number;
}

interface CartState {
  items: CartItem[];
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;
}

interface CartItem {
  equipmentId: string;
  name: string;
  typeName: string;
  description: string | null;
  creditCostPerDay: number;
  imageUrl: string | null;
}
```

**Props:**
- `initialCreditBalance: number` - User's current credit balance from server

---

### 4.3 CartItemList.tsx

**Description:** Displays the list of equipment items in the reservation cart with ability to remove items.

**Main Elements:**
- `<div>` container with grid/list layout
- Multiple `<CartItem>` components
- Empty state message if no items

**Handled Events:**
- Remove item click (bubbled from CartItem)

**Validation:**
- None (display-only with remove action)

**Types:**
```typescript
interface CartItemListProps {
  items: CartItem[];
  onRemoveItem: (equipmentId: string) => void;
}
```

**Props:**
- `items: CartItem[]` - Array of cart items
- `onRemoveItem: (equipmentId: string) => void` - Callback when item removed

---

### 4.4 CartItem.tsx

**Description:** Individual cart item card displaying equipment details with remove button.

**Main Elements:**
- `<Card>` component from Shadcn/ui
- Equipment image or placeholder
- Equipment name, type, description
- Credit cost per day display
- Remove button

**Handled Events:**
- Remove button click

**Validation:**
- None (display-only)

**Types:**
```typescript
interface CartItemProps {
  item: CartItem;
  onRemove: (equipmentId: string) => void;
}
```

**Props:**
- `item: CartItem` - Equipment item data
- `onRemove: (equipmentId: string) => void` - Remove callback

---

### 4.5 DateRangePicker.tsx

**Description:** Date range selector with validation ensuring start date is in future and end date is after start date. Integrates with Shadcn/ui Calendar component.

**Main Elements:**
- Two `<Input>` fields for date display
- Two `<Calendar>` components in popovers for date selection
- Validation error messages
- Helper text showing number of days

**Handled Events:**
- Start date selection
- End date selection
- Input field focus (open calendar)

**Validation:**
- Start date must be in the future (after today)
- End date must be >= start date
- Both dates required before proceeding
- Dates must be in YYYY-MM-DD format

**Types:**
```typescript
interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  validationErrors: DateRangeValidationErrors;
}

interface DateRangeValidationErrors {
  startDate: string | null;
  endDate: string | null;
}
```

**Props:**
- `startDate: string | null` - Selected start date (YYYY-MM-DD)
- `endDate: string | null` - Selected end date (YYYY-MM-DD)
- `onStartDateChange: (date: string) => void` - Start date change callback
- `onEndDateChange: (date: string) => void` - End date change callback
- `validationErrors: DateRangeValidationErrors` - Validation error messages

---

### 4.6 CostEstimator.tsx

**Description:** Displays real-time cost calculation showing total credit cost, current balance, and remaining balance after reservation.

**Main Elements:**
- `<Card>` component containing cost breakdown
- List of items with individual costs
- Total credit cost calculation
- Current balance display
- Remaining balance after reservation
- Warning alert if insufficient credits

**Handled Events:**
- None (display-only)

**Validation:**
- Highlights insufficient credit condition (remainingBalance < 0)

**Types:**
```typescript
interface CostEstimatorProps {
  items: CartItem[];
  startDate: string | null;
  endDate: string | null;
  currentCreditBalance: number;
}

interface CostBreakdown {
  itemCosts: Array<{
    equipmentId: string;
    name: string;
    days: number;
    creditCostPerDay: number;
    totalCost: number;
  }>;
  totalCreditCost: number;
  currentBalance: number;
  remainingBalance: number;
}
```

**Props:**
- `items: CartItem[]` - Cart items for cost calculation
- `startDate: string | null` - Selected start date
- `endDate: string | null` - Selected end date
- `currentCreditBalance: number` - User's current credit balance

---

### 4.7 ConfirmationModal.tsx

**Description:** Modal dialog displaying final confirmation before creating reservation, showing all items, dates, total cost, and remaining balance.

**Main Elements:**
- `<Dialog>` component from Shadcn/ui
- Summary of all selected items
- Date range display
- Total cost breakdown
- Remaining balance
- Confirm and Cancel buttons

**Handled Events:**
- Confirm button click (trigger API call)
- Cancel button click (close modal)
- Modal close (X button or escape key)

**Validation:**
- All validation completed before modal opens
- Confirm button disabled during API request

**Types:**
```typescript
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  items: CartItem[];
  startDate: string;
  endDate: string;
  costBreakdown: CostBreakdown;
  isSubmitting: boolean;
}
```

**Props:**
- `isOpen: boolean` - Modal visibility state
- `onClose: () => void` - Close modal callback
- `onConfirm: () => Promise<void>` - Confirmation callback (creates reservation)
- `items: CartItem[]` - Cart items for display
- `startDate: string` - Selected start date
- `endDate: string` - Selected end date
- `costBreakdown: CostBreakdown` - Cost calculation details
- `isSubmitting: boolean` - Loading state during API call

---

## 5. Types

### 5.1 Existing Types (from `equipment.types.ts`)

The following types are already defined and will be used:

- `CreateReservationItem` - Single reservation item for API request
- `CreateReservationsCommand` - Complete command for POST /reservations
- `CreateReservationsResponse` - API response after creating reservations
- `EquipmentAvailability` - Availability check response
- `Enums<"reservation_status">` - Reservation status enum
- `Enums<"equipment_status">` - Equipment status enum

### 5.2 New ViewModel Types

These types are specific to the Reservation Cart view and should be defined in a new file `frontend/src/types/reservation-cart.types.ts`:

```typescript
/**
 * Cart item stored in sessionStorage
 * Simplified version of Equipment for cart management
 */
export interface CartItem {
  equipmentId: string;
  name: string;
  typeName: string;
  description: string | null;
  creditCostPerDay: number;
  imageUrl: string | null;
}

/**
 * Cart state persisted in sessionStorage
 */
export interface CartState {
  items: CartItem[];
  startDate: string | null; // YYYY-MM-DD format
  endDate: string | null; // YYYY-MM-DD format
}

/**
 * Cost breakdown for display and validation
 */
export interface CostBreakdown {
  itemCosts: ItemCost[];
  totalCreditCost: number;
  currentBalance: number;
  remainingBalance: number;
}

/**
 * Individual item cost calculation
 */
export interface ItemCost {
  equipmentId: string;
  name: string;
  days: number;
  creditCostPerDay: number;
  totalCost: number;
}

/**
 * Date range validation errors
 */
export interface DateRangeValidationErrors {
  startDate: string | null;
  endDate: string | null;
}

/**
 * Availability check result for all cart items
 */
export interface AvailabilityCheckResult {
  isAllAvailable: boolean;
  unavailableItems: Array<{
    equipmentId: string;
    name: string;
    reason: string; // Error message from API
    conflictingReservations: Array<{
      startDate: string;
      endDate: string;
    }>;
  }>;
}

/**
 * Validation state for the entire cart
 */
export interface CartValidation {
  isValid: boolean;
  errors: {
    dateRange: DateRangeValidationErrors;
    availability: string | null;
    creditBalance: string | null;
    general: string | null;
  };
}
```

### 5.3 Type Field Breakdown

**CartItem:**
- `equipmentId: string` - UUID of equipment, required for API calls
- `name: string` - Display name of equipment
- `typeName: string` - Equipment type (e.g., "Kayak", "Paddle")
- `description: string | null` - Optional description
- `creditCostPerDay: number` - Cost per day from equipment type
- `imageUrl: string | null` - Optional image URL for display

**CartState:**
- `items: CartItem[]` - Array of cart items
- `startDate: string | null` - ISO date string (YYYY-MM-DD), null if not selected
- `endDate: string | null` - ISO date string (YYYY-MM-DD), null if not selected

**CostBreakdown:**
- `itemCosts: ItemCost[]` - Individual item calculations
- `totalCreditCost: number` - Sum of all item costs
- `currentBalance: number` - User's current credit balance
- `remainingBalance: number` - Balance after reservation (may be negative)

**AvailabilityCheckResult:**
- `isAllAvailable: boolean` - True if all items available for dates
- `unavailableItems: Array` - Items that failed availability check with reasons

**CartValidation:**
- `isValid: boolean` - Overall validation state
- `errors: object` - Categorized validation errors for display

---

## 6. State Management

### 6.1 Session Storage (Cart Persistence)

The reservation cart uses `sessionStorage` to persist cart state across page navigation within the same session. This allows users to browse equipment, add items, and return to the cart without losing their selection.

**Storage Key:** `reservation-cart`

**Stored Data:** `CartState` object (JSON stringified)

**Operations:**
- **Load:** On component mount, parse from sessionStorage
- **Save:** On every cart modification (add/remove item, date change)
- **Clear:** After successful reservation creation or explicit clear action

### 6.2 React State (Component-Level)

**Primary State in `ReservationCartView.tsx`:**

```typescript
const [cartState, setCartState] = useState<CartState>({
  items: [],
  startDate: null,
  endDate: null,
});

const [currentCreditBalance, setCurrentCreditBalance] = useState<number>(initialCreditBalance);
const [validation, setValidation] = useState<CartValidation>(defaultValidation);
const [isConfirmationOpen, setIsConfirmationOpen] = useState<boolean>(false);
const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
```

### 6.3 TanStack Query (API State)

The view uses TanStack Query for API data fetching and caching:

**Queries:**
- User credit balance (refetch on mount to ensure latest)
- Equipment availability checks for cart items

**Mutations:**
- Create reservations (POST /reservations)

**Query Keys:**
```typescript
['user', 'me'] // User profile and credit balance
['equipment', equipmentId, 'availability', { startDate, endDate }] // Availability check
```

### 6.4 Nano Stores (Global State)

The user's credit balance is stored in a Nano Store for global access across the application:

```typescript
// lib/stores/user-store.ts
import { atom } from 'nanostores';

export const $creditBalance = atom<number>(0);
```

**Updates:**
- After successful reservation creation, update from API response
- Displayed in navbar/header across all pages

### 6.5 Custom Hook: `useReservationCart`

A custom hook encapsulates cart management logic:

```typescript
/**
 * Custom hook for reservation cart management
 * Handles sessionStorage persistence, validation, and cart operations
 */
function useReservationCart() {
  // Load cart from sessionStorage on mount
  // Provide functions: addItem, removeItem, updateDates, clearCart
  // Sync to sessionStorage on every change
  // Return cart state and operations
  
  return {
    cartState,
    addItem: (item: CartItem) => void,
    removeItem: (equipmentId: string) => void,
    updateStartDate: (date: string) => void,
    updateEndDate: (date: string) => void,
    clearCart: () => void,
    calculateCost: () => CostBreakdown,
  };
}
```

**Purpose:** Centralizes cart logic, ensures sessionStorage sync, provides reusable cart operations

### 6.6 Custom Hook: `useAvailabilityCheck`

A custom hook for checking equipment availability:

```typescript
/**
 * Custom hook for checking equipment availability for cart items
 * Performs parallel availability checks for all items
 */
function useAvailabilityCheck(
  items: CartItem[],
  startDate: string | null,
  endDate: string | null
) {
  // Use TanStack Query to check availability for each item
  // Combine results into AvailabilityCheckResult
  // Return loading state and results
  
  return {
    checkAvailability: () => Promise<AvailabilityCheckResult>,
    isChecking: boolean,
  };
}
```

**Purpose:** Parallel availability checks, manages loading state, aggregates results

---

## 7. API Integration

### 7.1 Endpoint: POST /reservations

**Purpose:** Create new reservation(s) for selected equipment and dates

**Frontend API Path:** `/api/reservations` (Astro API route, proxies to Go backend)

**Request Type:** `CreateReservationsCommand`

```typescript
{
  reservations: [
    {
      equipmentId: "uuid",
      startDate: "2025-12-01", // YYYY-MM-DD
      endDate: "2025-12-05"
    },
    // ... more items
  ],
  userId: undefined // Not used by regular users, admin only
}
```

**Response Type:** `CreateReservationsResponse`

```typescript
{
  reservations: [
    {
      id: "uuid",
      equipmentId: "uuid",
      equipmentName: "Red Kayak",
      startDate: "2025-12-01",
      endDate: "2025-12-05",
      status: "PENDING",
      creditCost: 20
    }
  ],
  totalCreditCost: 32,
  remainingBalance: 118
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors, invalid dates
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Equipment not found
- `409 Conflict` - Equipment unavailable, insufficient credits, equipment broken/archived

**Integration:**
```typescript
const createReservations = async (command: CreateReservationsCommand) => {
  const response = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create reservations');
  }
  
  return await response.json() as CreateReservationsResponse;
};
```

---

### 7.2 Endpoint: GET /equipment/:id/availability

**Purpose:** Check if equipment is available for selected date range

**Frontend API Path:** `/api/equipment/:id/availability`

**Query Parameters:**
- `start_date` (required): YYYY-MM-DD
- `end_date` (required): YYYY-MM-DD

**Response Type:** `EquipmentAvailability`

```typescript
{
  equipmentId: "uuid",
  isAvailable: false,
  conflictingReservations: [
    {
      id: "uuid",
      startDate: "2025-12-01",
      endDate: "2025-12-05",
      status: "PENDING"
    }
  ]
}
```

**Integration:**
```typescript
const checkAvailability = async (
  equipmentId: string,
  startDate: string,
  endDate: string
): Promise<EquipmentAvailability> => {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  
  const response = await fetch(
    `/api/equipment/${equipmentId}/availability?${params}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to check availability');
  }
  
  return await response.json();
};
```

---

### 7.3 Endpoint: GET /users/me

**Purpose:** Get current user profile including credit balance

**Frontend API Path:** `/api/users/me`

**Response Type:**
```typescript
{
  id: "uuid",
  username: "john_doe",
  email: "john@example.com",
  creditBalance: 150,
  role: "user",
  isActive: true,
  createdAt: "2025-01-01T00:00:00Z"
}
```

**Integration:**
```typescript
const getCurrentUser = async () => {
  const response = await fetch('/api/users/me');
  
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  
  return await response.json();
};
```

**Usage:** Fetch on page load to get initial credit balance, refetch after reservation creation to update balance

---

## 8. User Interactions

### 8.1 Add Item to Cart (from Equipment Search)

**User Action:** Click "Add to Cart" button on equipment item in Equipment Search view

**System Response:**
1. Add item to sessionStorage cart
2. Display toast notification: "Item added to cart"
3. Update cart badge count in navbar
4. Allow user to continue browsing or navigate to cart

**Validation:** None at this stage (validation happens in cart view)

---

### 8.2 View Cart

**User Action:** Navigate to `/reservations/create` (click cart icon or "View Cart" button)

**System Response:**
1. Load cart from sessionStorage
2. Display all cart items
3. If cart empty, show empty state with link to Equipment Search
4. Load user's current credit balance
5. Initialize date range picker with no dates selected

---

### 8.3 Remove Item from Cart

**User Action:** Click "Remove" button on cart item

**System Response:**
1. Remove item from cart state
2. Update sessionStorage
3. Recalculate total cost
4. Display toast: "Item removed from cart"
5. If cart now empty, show empty state

---

### 8.4 Select Date Range

**User Action:** Click start date or end date input field, select dates from calendar

**System Response:**
1. Validate selected date:
   - Start date must be in future
   - End date must be >= start date
2. Update cart state with selected dates
3. Save to sessionStorage
4. Display validation errors if invalid
5. Recalculate costs based on new dates
6. Show number of days in helper text

**Validation Messages:**
- "Start date must be in the future"
- "End date must be after start date"

---

### 8.5 Create Reservation (Pre-Confirmation)

**User Action:** Click "Create Reservation" button

**System Response:**
1. Validate cart state:
   - Cart not empty
   - Start and end dates selected
   - Dates are valid
2. Check availability for all items (parallel API calls)
3. Validate credit balance sufficiency
4. If all validations pass, open confirmation modal
5. If any validation fails, display error messages:
   - "Please select start and end dates"
   - "Item [name] is unavailable for selected dates"
   - "Insufficient credits. You need X more credits."

---

### 8.6 Confirm Reservation

**User Action:** Review confirmation modal and click "Confirm" button

**System Response:**
1. Disable confirm button, show loading indicator
2. Call POST /reservations API
3. On success:
   - Update credit balance in Nano Store
   - Clear cart from sessionStorage
   - Display success toast: "Reservations created successfully! Check your email for confirmation."
   - Redirect to `/reservations` (My Reservations view)
4. On error:
   - Display error message
   - Keep modal open for retry or cancellation
   - Handle specific errors:
     - 409 Conflict: "Item became unavailable. Please try again."
     - 409 Insufficient credits: "Insufficient credits"
     - 400 Validation: Display specific validation errors
     - Network: "Network error. Please check your connection."

---

### 8.7 Cancel Confirmation

**User Action:** Click "Cancel" button in confirmation modal or press Escape

**System Response:**
1. Close confirmation modal
2. Return to cart view
3. No changes to cart state
4. User can modify selections and try again

---

### 8.8 Clear Cart

**User Action:** Click "Clear Cart" button

**System Response:**
1. Show confirmation dialog: "Are you sure you want to clear the cart?"
2. On confirm:
   - Clear all items from cart
   - Clear sessionStorage
   - Reset date selections
   - Display empty state
3. On cancel: Close dialog, no changes

---

## 9. Conditions and Validation

### 9.1 Date Range Validation

**Components Affected:** DateRangePicker, ReservationCartView

**Conditions:**
1. **Start date must be in the future**
   - **Validation:** `new Date(startDate) > new Date()` (considering timezone)
   - **Error Message:** "Start date must be in the future"
   - **UI Effect:** Display error below start date input, disable Create Reservation button

2. **End date must be >= start date**
   - **Validation:** `new Date(endDate) >= new Date(startDate)`
   - **Error Message:** "End date must be after start date"
   - **UI Effect:** Display error below end date input, disable Create Reservation button

3. **Both dates must be selected**
   - **Validation:** `startDate !== null && endDate !== null`
   - **Error Message:** "Please select start and end dates"
   - **UI Effect:** Disable Create Reservation button if either date missing

**Implementation:**
```typescript
function validateDateRange(startDate: string | null, endDate: string | null): DateRangeValidationErrors {
  const errors: DateRangeValidationErrors = {
    startDate: null,
    endDate: null,
  };
  
  if (startDate) {
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (start <= today) {
      errors.startDate = "Start date must be in the future";
    }
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      errors.endDate = "End date must be after start date";
    }
  }
  
  return errors;
}
```

---

### 9.2 Availability Validation

**Components Affected:** ReservationCartView, ConfirmationModal

**Conditions:**
1. **All items must be available for selected dates**
   - **Validation:** API call to GET `/equipment/:id/availability` for each item
   - **Error Message:** "Item [name] is unavailable for [dates]. Conflicting reservation: [dates]"
   - **UI Effect:** Display error alert above cart, highlight unavailable items, disable Create Reservation button

2. **Equipment must not be broken or archived**
   - **Validation:** Handled by backend (409 response)
   - **Error Message:** "Item [name] is currently unavailable (broken/archived)"
   - **UI Effect:** Display error, prompt user to remove item from cart

**Implementation:**
```typescript
async function checkAllItemsAvailability(
  items: CartItem[],
  startDate: string,
  endDate: string
): Promise<AvailabilityCheckResult> {
  const availabilityChecks = items.map(item =>
    checkAvailability(item.equipmentId, startDate, endDate)
  );
  
  const results = await Promise.all(availabilityChecks);
  
  const unavailableItems = results
    .map((result, index) => ({
      ...result,
      item: items[index],
    }))
    .filter(r => !r.isAvailable)
    .map(r => ({
      equipmentId: r.item.equipmentId,
      name: r.item.name,
      reason: `Unavailable for selected dates`,
      conflictingReservations: r.conflictingReservations,
    }));
  
  return {
    isAllAvailable: unavailableItems.length === 0,
    unavailableItems,
  };
}
```

---

### 9.3 Credit Balance Validation

**Components Affected:** CostEstimator, ReservationCartView, ConfirmationModal

**Conditions:**
1. **User must have sufficient credits for total cost**
   - **Validation:** `currentCreditBalance >= totalCreditCost`
   - **Error Message:** "Insufficient credits. You need X more credits. Current balance: Y, Required: Z"
   - **UI Effect:** Display warning alert in CostEstimator, disable Create Reservation button

2. **Credit cost calculation must be correct**
   - **Calculation:** For each item: `creditCostPerDay * numberOfDays`
   - **Number of days:** `(endDate - startDate) + 1` (inclusive)
   - **Total cost:** Sum of all item costs

**Implementation:**
```typescript
function calculateCost(
  items: CartItem[],
  startDate: string,
  endDate: string,
  currentBalance: number
): CostBreakdown {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const itemCosts = items.map(item => ({
    equipmentId: item.equipmentId,
    name: item.name,
    days,
    creditCostPerDay: item.creditCostPerDay,
    totalCost: item.creditCostPerDay * days,
  }));
  
  const totalCreditCost = itemCosts.reduce((sum, item) => sum + item.totalCost, 0);
  const remainingBalance = currentBalance - totalCreditCost;
  
  return {
    itemCosts,
    totalCreditCost,
    currentBalance,
    remainingBalance,
  };
}
```

---

### 9.4 Cart State Validation

**Components Affected:** ReservationCartView

**Conditions:**
1. **Cart must not be empty**
   - **Validation:** `cartState.items.length > 0`
   - **UI Effect:** Show empty state with link to Equipment Search

2. **All required data must be present**
   - **Validation:**
     - Cart has items: `items.length > 0`
     - Dates selected: `startDate !== null && endDate !== null`
     - Dates valid: No date range errors
     - Items available: Availability check passed
     - Credits sufficient: `remainingBalance >= 0`
   - **UI Effect:** Enable/disable Create Reservation button based on overall validity

**Implementation:**
```typescript
function validateCart(
  cartState: CartState,
  availabilityResult: AvailabilityCheckResult,
  costBreakdown: CostBreakdown
): CartValidation {
  const dateRangeErrors = validateDateRange(cartState.startDate, cartState.endDate);
  
  return {
    isValid: 
      cartState.items.length > 0 &&
      cartState.startDate !== null &&
      cartState.endDate !== null &&
      dateRangeErrors.startDate === null &&
      dateRangeErrors.endDate === null &&
      availabilityResult.isAllAvailable &&
      costBreakdown.remainingBalance >= 0,
    errors: {
      dateRange: dateRangeErrors,
      availability: availabilityResult.isAllAvailable 
        ? null 
        : `${availabilityResult.unavailableItems.length} item(s) unavailable`,
      creditBalance: costBreakdown.remainingBalance < 0
        ? `Insufficient credits. You need ${Math.abs(costBreakdown.remainingBalance)} more credits.`
        : null,
      general: null,
    },
  };
}
```

---

### 9.5 Concurrent Reservation Validation

**Components Affected:** ReservationCartView (API response handling)

**Conditions:**
1. **Handle race conditions where item becomes unavailable between check and creation**
   - **Validation:** Backend database exclusion constraint prevents overlapping reservations
   - **Error Response:** 409 Conflict
   - **Error Message:** "Item [name] is no longer available for selected dates. Please refresh and try again."
   - **UI Effect:** Display error toast, keep modal open, suggest refreshing availability check

**Implementation:**
```typescript
async function handleReservationCreation(command: CreateReservationsCommand) {
  try {
    const response = await createReservations(command);
    return { success: true, data: response };
  } catch (error) {
    if (error.status === 409) {
      return {
        success: false,
        error: 'One or more items became unavailable. Please refresh and try again.',
      };
    }
    // Handle other errors...
  }
}
```

---

## 10. Error Handling

### 10.1 Validation Errors (Client-Side)

**Scenarios:**
- Empty cart
- Missing dates
- Invalid date range (start >= end)
- Start date in past

**Handling:**
- Display inline error messages next to relevant fields
- Disable "Create Reservation" button
- Use `<Alert>` component from Shadcn/ui for prominent errors
- Do not allow modal to open until validation passes

---

### 10.2 Availability Errors (API)

**Scenarios:**
- Equipment unavailable for selected dates
- Equipment broken/archived
- Multiple items with availability issues

**Handling:**
- Display error alert listing all unavailable items
- Show conflicting reservation dates if available
- Provide option to remove unavailable items from cart
- Suggest alternative dates if possible

**Example Error Message:**
```
⚠️ Availability Issues
- Red Kayak: Unavailable Dec 1-5 (reserved Dec 3-7)
- Blue Paddle: Equipment is currently broken

Please remove these items or select different dates.
```

---

### 10.3 Credit Balance Errors

**Scenarios:**
- Insufficient credits for reservation
- Credit balance changed since page load (concurrent deduction)

**Handling:**
- Display warning in `CostEstimator` component:
  ```
  ⚠️ Insufficient Credits
  Current balance: 50 credits
  Required: 80 credits
  You need 30 more credits.
  ```
- Disable "Create Reservation" button
- Provide link to Credit Request page
- On 409 error from API (credits deducted elsewhere), refetch balance and display updated error

---

### 10.4 Network Errors

**Scenarios:**
- API request timeout
- Network connection lost
- Backend service unavailable

**Handling:**
- Display error toast: "Network error. Please check your connection and try again."
- Retry button in error message
- Preserve cart state (sessionStorage prevents data loss)
- Log error to console for debugging

**Implementation:**
```typescript
async function createReservationWithRetry(
  command: CreateReservationsCommand,
  maxRetries = 2
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await createReservations(command);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      // Wait before retry: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}
```

---

### 10.5 Concurrent Modification Errors

**Scenario:**
- Item becomes unavailable between availability check and reservation creation
- Another user reserves the same item milliseconds before

**Backend Response:** `409 Conflict`

**Error Message Example:**
```json
{
  "error": "Reservation conflict",
  "message": "Equipment 'Red Kayak' is no longer available for selected dates",
  "conflicting_reservation": {
    "start_date": "2025-12-01",
    "end_date": "2025-12-05"
  }
}
```

**Handling:**
- Close confirmation modal
- Display error alert with specific item and conflicting dates
- Automatically re-check availability for all items
- Suggest user to select different dates or remove conflicting item
- Prevent silent failures - always inform user of conflict

---

### 10.6 Session Expiration

**Scenario:**
- User session expires (2-hour timeout) while in cart

**Handling:**
- API returns `401 Unauthorized`
- Preserve cart in sessionStorage (not lost on redirect)
- Redirect to login page with return URL: `/reservations/create`
- After successful login, restore cart state from sessionStorage
- Display message: "Session expired. Please log in to continue."

---

### 10.7 Backend Validation Errors

**Scenarios:**
- Invalid request format
- Missing required fields
- Data type mismatches

**Backend Response:** `400 Bad Request`

**Example Response:**
```json
{
  "error": "Validation error",
  "details": {
    "reservations[0].start_date": "Invalid date format. Expected YYYY-MM-DD"
  }
}
```

**Handling:**
- Parse validation error details
- Display field-specific errors where applicable
- For unexpected errors, display generic message: "Invalid request. Please refresh and try again."
- Log full error details to console for debugging

---

## 11. Implementation Steps

### Step 1: Create Type Definitions

**Files to create:**
- `frontend/src/types/reservation-cart.types.ts`

**Tasks:**
1. Define `CartItem`, `CartState`, `CostBreakdown`, `ItemCost`
2. Define `DateRangeValidationErrors`, `AvailabilityCheckResult`, `CartValidation`
3. Export all types

**Validation:**
- TypeScript compiles without errors
- Types are accurately typed and documented

---

### Step 2: Create SessionStorage Utility

**Files to create:**
- `frontend/src/lib/utils/cart-storage.ts`

**Tasks:**
1. Implement `saveCartToStorage(cart: CartState): void`
2. Implement `loadCartFromStorage(): CartState | null`
3. Implement `clearCartFromStorage(): void`
4. Handle JSON parse errors gracefully

**Code Example:**
```typescript
const CART_STORAGE_KEY = 'reservation-cart';

export function saveCartToStorage(cart: CartState): void {
  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('Failed to save cart to sessionStorage:', error);
  }
}

export function loadCartFromStorage(): CartState | null {
  try {
    const data = session Storage.getItem(CART_STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as CartState;
  } catch (error) {
    console.error('Failed to load cart from sessionStorage:', error);
    return null;
  }
}

export function clearCartFromStorage(): void {
  sessionStorage.removeItem(CART_STORAGE_KEY);
}
```

---

### Step 3: Create Validation Utilities

**Files to create:**
- `frontend/src/lib/utils/cart-validation.ts`

**Tasks:**
1. Implement `validateDateRange()`
2. Implement `calculateCost()`
3. Implement `validateCart()`
4. Add helper functions for date calculations

**Validation:**
- All validation logic follows requirements
- Edge cases handled (end date = start date, leap years, etc.)
- Unit tests pass (if created)

---

### Step 4: Create Custom Hooks

**Files to create:**
- `frontend/src/hooks/useReservationCart.ts`
- `frontend/src/hooks/useAvailabilityCheck.ts`

**Tasks:**
1. Implement `useReservationCart` hook:
   - Load from sessionStorage on mount
   - Provide cart operations (add, remove, update dates, clear)
   - Auto-sync to sessionStorage
   - Calculate costs
2. Implement `useAvailabilityCheck` hook:
   - Accept cart items and dates
   - Perform parallel availability checks
   - Aggregate results
   - Handle loading and error states

**Dependencies:**
- TanStack Query for API calls
- Previously created utilities

---

### Step 5: Create CartItem Component

**Files to create:**
- `frontend/src/components/reservations/CartItem.tsx`

**Tasks:**
1. Create React component accepting `CartItemProps`
2. Display equipment image (or placeholder)
3. Display name, type, description
4. Display credit cost per day
5. Add remove button with confirmation
6. Style with Tailwind and Shadcn/ui Card component

**Validation:**
- Component renders correctly with valid data
- Remove button calls callback
- Handles null/undefined values gracefully (image, description)

---

### Step 6: Create CartItemList Component

**Files to create:**
- `frontend/src/components/reservations/CartItemList.tsx`

**Tasks:**
1. Create React component accepting `CartItemListProps`
2. Map over items array and render CartItem components
3. Display empty state if no items
4. Implement responsive grid layout

**Validation:**
- Empty state displays correctly
- Items render in grid layout
- Remove callback propagates correctly

---

### Step 7: Create DateRangePicker Component

**Files to create:**
- `frontend/src/components/reservations/DateRangePicker.tsx`

**Tasks:**
1. Create React component with calendar integration
2. Implement start date picker with validation
3. Implement end date picker with validation
4. Display validation errors inline
5. Show number of days calculation
6. Prevent selection of past dates

**Dependencies:**
- Shadcn/ui Calendar component
- Shadcn/ui Popover component
- date-fns or similar for date manipulation

**Validation:**
- Date selection updates parent state
- Validation errors display correctly
- Past dates are disabled in calendar
- Number of days calculates correctly

---

### Step 8: Create CostEstimator Component

**Files to create:**
- `frontend/src/components/reservations/CostEstimator.tsx`

**Tasks:**
1. Create React component accepting cost props
2. Display list of items with individual costs
3. Show total credit cost
4. Display current balance and remaining balance
5. Highlight insufficient credit warning
6. Update dynamically when dates change

**Validation:**
- Cost calculations are accurate
- Warning displays when balance insufficient
- Component updates reactively

---

### Step 9: Create ConfirmationModal Component

**Files to create:**
- `frontend/src/components/reservations/ConfirmationModal.tsx`

**Tasks:**
1. Create React component with Shadcn/ui Dialog
2. Display reservation summary (items, dates, costs)
3. Show remaining balance after reservation
4. Implement confirm and cancel buttons
5. Handle loading state during API call
6. Disable confirm button when submitting

**Dependencies:**
- Shadcn/ui Dialog component
- Previously created CostEstimator (or reuse visual components)

**Validation:**
- Modal opens and closes correctly
- Confirm callback triggers API call
- Loading state prevents double-submission
- Cancel closes modal without side effects

---

### Step 10: Create ReservationCartView Component

**Files to create:**
- `frontend/src/components/reservations/ReservationCartView.tsx`

**Tasks:**
1. Create main React component with all child components
2. Integrate `useReservationCart` hook
3. Integrate `useAvailabilityCheck` hook
4. Implement validation logic
5. Handle "Create Reservation" button click
6. Implement confirmation modal flow
7. Handle API success (clear cart, redirect)
8. Handle API errors (display messages)
9. Implement "Clear Cart" functionality

**State Management:**
- Cart state from custom hook
- Credit balance from props + Nano Store
- Validation state
- Modal open state
- Submitting state

**Validation:**
- All validations run before opening modal
- Error messages display correctly
- Success flow works (cart clears, redirects)
- Error flow preserves cart state

---

### Step 11: Create API Routes (Astro)

**Files to create:**
- `frontend/src/pages/api/reservations/index.ts` (POST /api/reservations)
- `frontend/src/pages/api/users/me.ts` (GET /api/users/me)

**Tasks:**
1. Implement POST /api/reservations:
   - Forward request to Go backend
   - Include authentication token
   - Return response with proper status codes
2. Implement GET /api/users/me:
   - Forward request to Go backend
   - Include authentication token
   - Return user profile with credit balance

**Pattern:** Follow existing API route pattern from `/api/equipment/`

**Validation:**
- API routes proxy correctly to backend
- Authentication tokens forwarded
- Responses properly formatted
- Error responses handled

---

### Step 12: Create ReservationCartPage (Astro)

**Files to create:**
- `frontend/src/pages/reservations/create.astro`

**Tasks:**
1. Create Astro SSR page
2. Check authentication (redirect if not logged in)
3. Fetch initial credit balance (GET /users/me)
4. Pass credit balance to ReservationCartView component
5. Include proper layout and meta tags
6. Handle loading states

**Server-Side Logic:**
```astro
---
import Layout from '@/layouts/Layout.astro';
import ReservationCartView from '@/components/reservations/ReservationCartView';

const session = await locals.supabase.auth.getSession();
if (!session.data.session) {
  return Astro.redirect('/login?redirect=/reservations/create');
}

// Fetch user profile for credit balance
const userResponse = await fetch(`${BACKEND_URL}/users/me`, {
  headers: {
    'Authorization': `Bearer ${session.data.session.access_token}`
  }
});

const user = await userResponse.json();
const initialCreditBalance = user.credit_balance;
---

<Layout title="Create Reservation">
  <ReservationCartView
    client:load
    initialCreditBalance={initialCreditBalance}
  />
</Layout>
```

**Validation:**
- Page redirects to login if not authenticated
- Credit balance fetched correctly
- Component mounts with correct props

---

### Step 13: Integrate with Equipment Search View

**Files to modify:**
- Equipment Search view components (add "Add to Cart" functionality)

**Tasks:**
1. Add "Add to Cart" button to equipment items
2. Implement `addItemToCart()` function using cart utilities
3. Display toast notification on add
4. Update cart badge count in navbar (if exists)
5. Provide link to view cart

**Integration:**
```typescript
import { saveCartToStorage, loadCartFromStorage } from '@/lib/utils/cart-storage';
import type { CartItem } from '@/types/reservation-cart.types';

function addItemToCart(equipment: Equipment) {
  const currentCart = loadCartFromStorage() || { items: [], startDate: null, endDate: null };
  
  const cartItem: CartItem = {
    equipmentId: equipment.id,
    name: equipment.name || equipment.internalId,
    typeName: equipment.typeName,
    description: equipment.description,
    creditCostPerDay: equipment.creditCostPerDay,
    imageUrl: equipment.imageUrl,
  };
  
  // Check if item already in cart
  if (currentCart.items.some(item => item.equipmentId === equipment.id)) {
    toast.info('Item already in cart');
    return;
  }
  
  currentCart.items.push(cartItem);
  saveCartToStorage(currentCart);
  toast.success('Item added to cart');
}
```

---

### Step 14: Update Nano Store for Credit Balance

**Files to modify:**
- `frontend/src/lib/stores/user-store.ts` (create if doesn't exist)

**Tasks:**
1. Create or update credit balance atom
2. Update balance after successful reservation creation
3. Ensure navbar/header displays updated balance

**Code:**
```typescript
// lib/stores/user-store.ts
import { atom } from 'nanostores';

export const $creditBalance = atom<number>(0);

// In ReservationCartView after successful creation:
import { $creditBalance } from '@/lib/stores/user-store';

$creditBalance.set(response.remainingBalance);
```

---

### Step 15: Add Toast Notifications

**Files to modify:**
- `frontend/src/components/reservations/ReservationCartView.tsx`

**Tasks:**
1. Install and configure Sonner (if not already installed)
2. Add toast notifications for:
   - Item removed from cart
   - Reservation created successfully
   - Error messages
   - Cart cleared

**Implementation:**
```typescript
import { toast } from 'sonner';

// Success
toast.success('Reservations created successfully! Check your email for confirmation.');

// Error
toast.error('Failed to create reservations. Please try again.');

// Info
toast.info('Item removed from cart');
```

---

### Step 16: Testing and Validation

**Manual Testing Checklist:**
1. ✅ Cart loads from sessionStorage on page load
2. ✅ Can add items to cart from Equipment Search
3. ✅ Can remove items from cart
4. ✅ Date range picker validates correctly
5. ✅ Cost calculation is accurate
6. ✅ Availability check works for all items
7. ✅ Insufficient credit warning displays
8. ✅ Confirmation modal displays correct data
9. ✅ Reservation creation succeeds with valid data
10. ✅ Error handling works for all error scenarios
11. ✅ Cart clears after successful creation
12. ✅ Redirects to My Reservations after success
13. ✅ Session timeout handled gracefully
14. ✅ Concurrent reservation conflict handled
15. ✅ Mobile responsive design works correctly

**Automated Testing (Optional but Recommended):**
- Unit tests for validation utilities
- Unit tests for cost calculation
- Component tests for React components
- Integration tests for full reservation flow

**Files to create (if writing tests):**
- `frontend/src/lib/utils/__tests__/cart-validation.test.ts`
- `frontend/src/hooks/__tests__/useReservationCart.test.ts`
- `frontend/src/components/reservations/__tests__/ReservationCartView.test.tsx`

---

### Step 17: Documentation and Handoff

**Tasks:**
1. Document component props and usage
2. Add TSDoc comments to public functions and types
3. Update project README with new view information
4. Create user guide for reservation creation flow (if applicable)

**Validation:**
- All code is properly documented
- TypeScript types are comprehensive
- Linter passes with no warnings
- Code follows project coding standards

---

## End of Implementation Plan

This plan provides a comprehensive guide for implementing the Reservation Cart view. Follow the steps sequentially, validate each step before proceeding, and ensure all user stories and acceptance criteria are met.

