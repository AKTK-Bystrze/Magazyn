# UI Architecture for Equipment Rental System

## 1. UI Structure Overview

The application follows a **multi-layout, feature-based architecture** built with Astro (SSR) and React.

*   **Shell Application**: The root HTML structure varies by user role using dedicated layouts (`BaseLayout.astro`, `AppLayout.astro`, `AdminLayout.astro`, `AuthLayout.astro`) with a common header (`UserHeader`) and responsive sidebar (`UserSidebar`).
*   **State Management Strategy**:
    *   **Server State**: `TanStack Query` handles API data fetching, caching, and invalidation.
    *   **Global UI State**: React State & Context combined with TanStack Query cache manage persistent UI elements like user credits and profile state.
    *   **Session State**: `sessionStorage` preserves the "Reservation Cart" during the booking flow.
*   **Visual Language**: Implemented using `Shadcn/UI` + `Tailwind CSS`. The aesthetic focuses on "Premium Utility"—clean lines, high contrast for status indicators, and mobile-optimized touch targets.
*   **Feedback Systems**:
    *   **Alerts & Inline Status**: Non-blocking contextual feedback and status banners for operation success/errors.
    *   **Modals / Dialogs**: For blocking interactions (e.g., "Confirm Cancellation", "Edit User").
    *   **Skeletons**: providing perceived performance during data loading.

## 2. View List

### Public Views

| View Name | Path | Purpose | Key Information | Key Components | Considerations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Login** | `/login` | Authentication entry point | Email input, status messages | `LoginForm`, `MagicLinkSent` | Simple, distraction-free. Accessible auto-focus on email input. |

### User Views (Role: User)

| View Name | Path | Purpose | Key Information | Key Components | Considerations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | `/dashboard` | Hub for quick actions | Quick links, Active Reservation summary, Recent Activity | `QuickActionGrid`, `ReservationSummaryCard` | Mobile-first dashboard layout. |
| **Equipment Search** | `/equipment` | Browse inventory | List/Grid of items, Filters (Type, Availability), Search Bar | `EquipmentGrid`, `FilterSidebar` (Desktop) / `FilterDrawer` (Mobile), `EquipmentCard` | Lazy loading images, Favorites sorted top. |
| **Equipment Details** | `/equipment/[id]` | View item specifics | Specs, Status, Availability Calendar, "Add to Cart" | `ItemHero`, `AvailabilityCalendar`, `AddToCartFab` | Calendar must be touch-friendly. |
| **Reservation Cart** | `/reservations/create` | Configure rental | Selected items, Date Range Picker, Cost Calculation | `CartItemList`, `DateRangePicker`, `CostEstimator` | Validation of dates and credit sufficiency. |
| **My Reservations** | `/reservations` | track rentals | List of active/past reservations with status | `ReservationList`, `StatusBadge` | Pagination for history. Color-coded statuses. |
| **Reservation Details** | `/reservations/[id]` | Manage active rental | Status, Dates, Audit Log, Actions (Cancel/Modify) | `StatusSteppers`, `AuditTimeline`, `ActionButtons` | "Modify" logic handles credit recalculation warnings. |
| **Credit History** | `/credits/history` | Financial transparency | Transaction log (Credits spent/earned) | `TransactionTable` | Clear distinction between debits/credits. |
| **Request Credits** | `/credits/request` | Earn credits | Work description form, Amount input | `RequestForm` | Validation for positive integers. |

### Admin Views (Role: Admin/SuperAdmin)

| View Name | Path | Purpose | Key Information | Key Components | Considerations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin Dashboard** | `/admin` | Operational Overview | Counters (Pending, Overdue), Quick Actions | `StatCard`, `OverdueAlertList`, `TodayDepartures` | High visibility for "Overdue" items. |
| **Reservations Mgr** | `/admin/reservations` | Process rentals | Master list, Bulk Actions, filters | `DataTable` (generic), `BulkActionToolbar` | Dense view for information density. |
| **Equipment Mgr** | `/admin/equipment` | Inventory control | Master list, Status toggle, Edit actions | `EquipmentTable`, `MaintenanceLogDrawer` | Quick status toggle (Ok <-> Broken). |
| **User Mgr** | `/admin/users` | User administration | User list, Credit/Role editing | `UserTable`, `EditUserDialog` | **SuperAdmin** only restrictions. |
| **Analytics** | `/admin/analytics` | Reporting | Utilization stats, Top users | `BarChart`, `UtilizationHeatmap` | Visualizations for data trends. |

## 3. User Journey Map

### Primary Flow: Renting Equipment (User)
1.  **Discovery**: User logs in and navigates to **Equipment Search**. Filters by "Kayak".
2.  **Selection**: User sees "Red Kayak", checks the **Equipment Details** for generic availability, and clicks "Add to Cart". Repeated for a "Paddle".
3.  **Configuration**: User opens **Reservation Cart**.
    *   Selects a single Date Range (e.g., Friday to Sunday).
    *   System calculates total (3 days * (4 + 2 credits) = 18 credits).
4.  **Validation**:
    *   System checks user credit balance (User has 50).
    *   System checks specific item availability for dates.
5.  **Confirmation**: User clicks "Confirm Reservation".
6.  **Result**: Redirects to **My Reservations** showing the new rental as `PENDING`. Credits deducted immediately.

### Secondary Flow: Processing & Returns (Admin)
1.  **Review**: Admin sees "2 Pending Reservations" on **Admin Dashboard**.
2.  **Handout**: Physical equipment is handed to user. Admin marks reservation as `RENTED`.
3.  **Return**: Days later, equipment is returned. Admin inspects item.
    *   *Scenario A (OK)*: Marks reservation as `RETURNED`.
    *   *Scenario B (Damaged)*: Marks reservation as `RETURNED`, then navigates to **Equipment Mgr** and sets status to `BROKEN` with a note "Hull scratch".

## 4. Layout and Navigation Structure

### Header & Navigation Structure
*   **Header (`UserHeader.tsx`)**:
    *   **Left**: Brand Logo & Application Title (links to Dashboard) and mobile sidebar hamburger trigger.
    *   **Right**:
        *   Theme toggle button (`ThemeToggle.tsx`).
        *   User dropdown menu (`UserMenu.tsx`) displaying current user avatar, username, and "Logout" action.
*   **Sidebar (`UserSidebar.tsx`)**:
    *   Desktop persistent sidebar and mobile slide-out drawer sheet.
    *   Role-tailored navigation items:
        *   **User Navigation**: Equipment Browse, My Reservations, Credits History.
        *   **Admin Navigation**: Admin Dashboard, Reservations Management, Equipment Inventory, User Management, Analytics.
    *   Always-visible credit balance badge in the user summary footer.

### Navigation Logic
*   **Smart Redirects**:
    *   Accessing `/` as Guest -> `/login`
    *   Accessing `/` as User -> `/dashboard`
    *   Accessing `/` as Admin -> `/admin`
*   **Breadcrumbs**: Implemented on deep pages (e.g., `Equipment > Red Kayak`).

## 5. Key Components

### Shared UI Components (Shadcn/UI Base)
*   **`StatusBadge`**: Unified component for displaying status.
    *   *Pending*: Yellow/Orange bg.
    *   *Rented*: Blue bg.
    *   *Returned/Ok*: Green bg.
    *   *Broken/Denied*: Red/Destructive bg.
*   **`ReservationCard`**: Summary view showing Date Range (formatted "Mon, Jan 1 - Wed, Jan 3"), Item List, and Total Cost.
*   **`AvailabilityCalendar`**:
    *   *Desktop*: Month view with colored cells.
    *   *Mobile*: Compact "Dot" view or simple list of "Busy Dates".
*   **`CreditDisplay`**: Component handling the "Godzinki" formatting (e.g., icons, color for negative values).

### Complex Organisms
*   **`ReservationWizard`**: Client-side state machine managing the Cart -> Date -> Confirm flow. Handles the API validation pre-check.
*   **`DataTable`**: Reusable Admin table wrapper supporting:
    *   Server-side pagination props.
    *   Sortable headers.
    *   Row selection (for bulk operations).
    *   Action column (Edit/Delete).
*   **`ImageUploader`**: Specialized component handling the file drag-and-drop, client-side preview, validation (2MB limit), and upload to Supabase Storage.
