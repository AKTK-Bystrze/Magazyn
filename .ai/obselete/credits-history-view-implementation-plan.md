# View Implementation Plan Credits History

## 1. Overview
The Credits History View allows users to view a detailed log of their credit transactions. It provides transparency regarding credit usage (reservations) and acquisitions (work credits, adjustments). The view supports pagination and displays key details such as amount, reason, and admin involvement.

## 2. View Routing
- **Path**: `/credits/history`
- **Access**: Authenticated users (Role: User, Admin, SuperAdmin)

## 3. Component Structure
- **CreditHistoryPage** (Astro Page)
  - **DashboardLayout** (Layout)
    - **CreditHistoryContainer** (React Container - Logic & State)
      - **PageHeader** (Title & Current Balance)
      - **CreditHistoryTable** (Presentational - Data Display)
        - **StatusBadge/Icon** (Visual indicator of transaction type)
      - **PaginationControls** (Shared UI)

## 4. Component Details

### CreditHistoryContainer
- **Description**: Main container component. Manages pagination state and data fetching.
- **Main elements**: `div` wrapper, `PageHeader`, `CreditHistoryTable`, `PaginationControls`.
- **Handled interactions**:
    - Page change (Next/Prev/Specific page).
    - Rows per page change.
- **Handled validation**: N/A (Read-only view).
- **Types**: `CreditHistoryResponse`, `PaginationMeta`.
- **Props**: None (Top-level view).

### CreditHistoryTable
- **Description**: Displays the list of transactions in a tabular format.
- **Main elements**: `Table` (Shadcn/UI), `TableHead`, `TableRow`, `TableCell`.
- **Handled interactions**: None (Read-only).
- **Handled validation**: Handles empty states ("No history found").
- **Types**: `CreditHistoryItem`.
- **Props**:
    - `data`: `CreditHistoryItem[]`
    - `isLoading`: `boolean`

## 5. Types
The view utilizes existing types defined in `frontend/src/types/credits/history.types.ts` and `frontend/src/db/database.types.ts`.

**Key Types:**
- **CreditHistoryItem**: Represents a single transaction row.
    - `id`: string
    - `amount`: number (Negative for spend, Positive for gain)
    - `reason`: `credit_transaction_reason` (Enum)
    - `description`: string | null
    - `createdAt`: string (ISO Date)
    - `adminUsername`: string | null (For admin adjustments)
- **CreditHistoryResponse**:
    - `creditHistory`: `CreditHistoryItem[]`
    - `pagination`: `PaginationMeta`
    - `currentBalance`: number

## 6. State Management
Managed via **TanStack Query** (Server State) and local React State (View State).

- **Local State**:
    - `page`: number (default: 1)
    - `perPage`: number (default: 25)
- **Query**:
    - Hook: `useCreditHistory({ page, perPage })`
    - Key: `['credits', 'history', page, perPage]`
    - Data: `{ creditHistory, pagination, currentBalance }`

## 7. API Integration
Integration with the core Backend API.

- **Endpoint**: `GET /credit-history`
- **Parameters**:
    - `page`: query param (int)
    - `per_page`: query param (int)
- **Response**: `CreditHistoryResponse` (JSON)
- **Authentication**: Bearer Token (handled by global Axios interceptor/client).

## 8. User Interactions
1.  **View History**: User navigates to `/credits/history`. Page loads latest 25 transactions.
2.  **Change Page**: User clicks "Next" or specific page number. Table updates with new data.
3.  **View Details**: Information is presented in the table rows (Reason, Description, Date).

## 9. Conditions and Validation
- **Authentication**: Verified by Layout/Router. Unauthenticated users redirected to Login.
- **Empty State**: If API returns empty list, display a friendly "No transactions" message.
- **Negative Amounts**: displayed in red or with minus sign.
- **Positive Amounts**: displayed in green or with plus sign.

## 10. Error Handling
- **API Error (500/Network)**: Display error message utilizing `sonner` toast or an inline Error Banner component.
- **Loading State**: Display `Skeleton` rows in the table while fetching data.

## 11. Implementation Steps
1.  **Define API Service**: Verify/Add `getCreditHistory` function in `frontend/src/lib/api/credits.ts` (or create if missing) using `axios` instance.
2.  **Create Hook**: Implement `useCreditHistory` query hook in `frontend/src/hooks/credits/useCreditHistory.ts`.
3.  **Create Table Component**: Build `CreditHistoryTable.tsx` using Shadcn `Table` components. Implement column formatting (Date, Currency, Enum to Text).
4.  **Create Container**: Build `CreditHistoryContainer.tsx`. Wire up state (page) and Hook. Integration with `Pagination`.
5.  **Create Page**: Create `frontend/src/pages/credits/history.astro` (or `.tsx` if SPA route) and embed the container.
6.  **Verify**: Log in as user, create transactions (if possible via other views) or inspect existing data, check table rendering and pagination.
