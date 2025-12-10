# API Endpoint Implementation Plan: Reservations API

<analysis>
1.  **API Specification Summary**:
    *   **GET /reservations**: List with pagination and filtering.
    *   **GET /reservations/:id**: Detailed view with audit trail.
    *   **POST /reservations**: Create multiple reservations, handle credits, check availability, send email.
    *   **PATCH /reservations/:id**: Update dates/status, handle credit adjustments, audit log.
    *   **PATCH /reservations/bulk**: Admin bulk status update.
    *   **GET /reservations/dashboard**: Admin stats (pending, overdue, today).

2.  **Parameters**:
    *   *GET /reservations*: `page`, `per_page`, `status`, `user_id` (admin), `equipment_id`, `start_date_from`, `start_date_to`.
    *   *POST /reservations*: `reservations` (array of `{equipment_id, start_date, end_date}`), `user_id` (admin).
    *   *PATCH /reservations/:id*: `start_date`, `end_date`, `status`.
    *   *PATCH /reservations/bulk*: `reservation_ids`, `status`.

3.  **DTOs**:
    *   Matching `frontend/src/types.ts`: `ReservationListItem`, `ReservationDetail`, `CreateReservationsCommand`, `UpdateReservationCommand`, `BulkUpdateReservationsCommand`, `ReservationDashboardSummary`.

4.  **Service Logic**:
    *   Need a `ReservationService` to handle the complex business logic:
        *   Availability checks (exclusion constraints).
        *   Credit balance verification and deduction.
        *   Atomic transactions for Reservation + Credit History.
        *   Email notifications.
        *   Audit trail logging (`reservation_history`).

5.  **Input Validation**:
    *   UUID validation.
    *   Date logic (`start_date` < `end_date`, future dates for new reservations).
    *   Status transition validity.
    *   User credit balance check.

6.  **Security**:
    *   JWT Middleware for Auth.
    *   Role-based access control (Admin vs User).
    *   Resource ownership checks (Users can only see/modify their own).

7.  **Error Scenarios**:
    *   400: Validation failure.
    *   401: Missing/Invalid Token.
    *   403: Access denied (wrong user/role).
    *   404: Reservation/Equipment not found.
    *   409: Conflict (Overlapping dates, Insufficient credits).
</analysis>

## 1. Endpoint Overview
This plan covers the implementation of the `/reservations` resource, which manages the core rental functionality. It includes endpoints for listing, creating, updating, and viewing details of reservations, as well as admin-specific bulk operations and dashboard statistics.

## 2. Request Details

### GET /reservations
- **Method**: `GET`
- **URL**: `/reservations`
- **Query Parameters**:
    - `page` (int, default: 1)
    - `per_page` (int, default: 25)
    - `status` (string, optional: PENDING, RENTED, RETURNED, DENIED)
    - `user_id` (uuid, optional, Admin only)
    - `equipment_id` (uuid, optional)
    - `start_date_from` (date, optional)
    - `start_date_to` (date, optional)

### GET /reservations/:id
- **Method**: `GET`
- **URL**: `/reservations/:id`
- **Parameters**: `id` (uuid, required)

### POST /reservations
- **Method**: `POST`
- **URL**: `/reservations`
- **Body**:
  ```json
  {
    "reservations": [
      {
        "equipment_id": "uuid",
        "start_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD"
      }
    ],
    "user_id": "uuid" // Optional, Admin only
  }
  ```

### PATCH /reservations/:id
- **Method**: `PATCH`
- **URL**: `/reservations/:id`
- **Body**:
  ```json
  {
    "start_date": "YYYY-MM-DD", // Optional
    "end_date": "YYYY-MM-DD",   // Optional
    "status": "PENDING|RENTED|RETURNED|DENIED" // Optional
  }
  ```

### PATCH /reservations/bulk
- **Method**: `PATCH`
- **URL**: `/reservations/bulk`
- **Body**:
  ```json
  {
    "reservation_ids": ["uuid", "uuid"],
    "status": "RENTED|RETURNED|DENIED"
  }
  ```

### GET /reservations/dashboard
- **Method**: `GET`
- **URL**: `/reservations/dashboard`

## 3. Used Types

**Go Structs (DTOs)**:
These should map to the types defined in `frontend/src/types.ts`.

```go
// Command Models
type CreateReservationItem struct {
    EquipmentID string `json:"equipment_id"`
    StartDate   string `json:"start_date"`
    EndDate     string `json:"end_date"`
}

type CreateReservationsCommand struct {
    Reservations []CreateReservationItem `json:"reservations"`
    UserID       *string                 `json:"user_id,omitempty"`
}

type UpdateReservationCommand struct {
    StartDate *string `json:"start_date,omitempty"`
    EndDate   *string `json:"end_date,omitempty"`
    Status    *string `json:"status,omitempty"`
}

type BulkUpdateReservationsCommand struct {
    ReservationIDs []string `json:"reservation_ids"`
    Status         string   `json:"status"`
}

// Response Models
type ReservationListItem struct {
    ID            string `json:"id"`
    UserID        string `json:"user_id"`
    Username      string `json:"username"`
    EquipmentID   string `json:"equipment_id"`
    EquipmentName string `json:"equipment_name"`
    EquipmentType string `json:"equipment_type"`
    StartDate     string `json:"start_date"`
    EndDate       string `json:"end_date"`
    Status        string `json:"status"`
    CreditCost    int    `json:"credit_cost"`
    CreatedAt     string `json:"created_at"`
    UpdatedAt     *string `json:"updated_at"`
}

type ReservationDetail struct {
    ReservationListItem
    UserEmail           string                  `json:"user_email"`
    EquipmentInternalID string                  `json:"equipment_internal_id"`
    AuditTrail          []ReservationAuditEntry `json:"audit_trail"`
}

type ReservationAuditEntry struct {
    ID                string `json:"id"`
    StartDate         string `json:"start_date"`
    EndDate           string `json:"end_date"`
    Status            string `json:"status"`
    ChangedByUsername *string `json:"changed_by_username"`
    CreatedAt         string `json:"created_at"`
}

type CreateReservationsResponse struct {
    Reservations     []ReservationListItem `json:"reservations"`
    TotalCreditCost  int                   `json:"total_credit_cost"`
    RemainingBalance int                   `json:"remaining_balance"`
}

type UpdateReservationResponse struct {
    ID               string `json:"id"`
    EquipmentID      string `json:"equipment_id"`
    StartDate        string `json:"start_date"`
    EndDate          string `json:"end_date"`
    Status           string `json:"status"`
    CreditCost       int    `json:"credit_cost"`
    CreditAdjustment int    `json:"credit_adjustment"`
    RemainingBalance int    `json:"remaining_balance"`
    UpdatedAt        string `json:"updated_at"`
}
```

## 4. Data Flow

1.  **Request Handling**:
    *   Request enters `ReservationController`.
    *   `AuthMiddleware` validates JWT and extracts `user_id` and `role`.
    *   Input validation (types, dates, required fields).

2.  **Service Layer (`ReservationService`)**:
    *   **GET**: Calls Repository to fetch data. Applies filters.
    *   **POST**:
        1.  Validates equipment availability (using `EXCLUDE` constraint check or manual overlap check if needed, but DB constraint is preferred).
        2.  Calculates total credit cost.
        3.  Checks user's credit balance.
        4.  Starts DB Transaction.
        5.  Inserts `reservations`.
        6.  Inserts `credit_history` (deduction).
        7.  Updates `profiles.credit_balance`.
        8.  Commits Transaction.
        9.  Triggers `EmailService` to send confirmation.
    *   **PATCH**:
        1.  Fetches existing reservation.
        2.  Validates permissions (User can only modify own PENDING; Admin can modify all).
        3.  If dates change: Check availability, recalculate cost, calculate adjustment.
        4.  If status changes (e.g., to DENIED): Calculate refund.
        5.  Starts DB Transaction.
        6.  Updates `reservations`.
        7.  Inserts `credit_history` (adjustment/refund).
        8.  Updates `profiles.credit_balance`.
        9.  Commits Transaction.
        10. `reservation_history` is updated via DB Trigger (`log_reservation_change`).

3.  **Database**:
    *   Interacts with `reservations`, `profiles`, `equipment`, `credit_history`, `reservation_history`.

## 5. Security Considerations

*   **Authentication**: All endpoints require a valid Supabase JWT.
*   **Authorization**:
    *   **Admin**: Full access to all endpoints and data.
    *   **User**:
        *   `GET /reservations`: Only own reservations.
        *   `GET /reservations/:id`: Only own reservation.
        *   `POST /reservations`: Can only create for self (`user_id` in body ignored/forbidden if not admin).
        *   `PATCH /reservations/:id`: Can only update own PENDING reservations. Can only cancel (status -> DENIED). Cannot change status to RENTED/RETURNED.
        *   `PATCH /reservations/bulk`: Forbidden.
        *   `GET /reservations/dashboard`: Forbidden.
*   **Validation**:
    *   Prevent booking archived/broken equipment.
    *   Prevent booking in the past.
    *   Ensure `end_date` >= `start_date`.

## 6. Error Handling

*   **400 Bad Request**: Invalid UUID, invalid date format, `start_date` > `end_date`, invalid status transition.
*   **401 Unauthorized**: No token or invalid token.
*   **403 Forbidden**: User trying to access/modify another user's reservation, or perform admin-only action.
*   **404 Not Found**: Reservation ID or Equipment ID not found.
*   **409 Conflict**:
    *   "Equipment X is already reserved for these dates."
    *   "Insufficient credits."
    *   "Equipment is broken or archived."
*   **500 Internal Server Error**: DB connection failure, transaction failure.

## 7. Performance Considerations

*   **Indexing**: Ensure `reservations` has indexes on `user_id`, `equipment_id`, `status`, and `daterange` (for overlap checks).
*   **Pagination**: Strict pagination on list endpoints to prevent large payloads.
*   **N+1 Queries**: Use `JOIN`s or eager loading when fetching reservation details (equipment name, type, username).
*   **Concurrency**: DB transactions are critical for credit balance integrity.

## 8. Implementation Steps

1.  **Define Types**: Create Go structs in `backend/internal/types/types.go` matching the DTOs.
2.  **Repository Layer**:
    *   Implement `GetReservations` (with filters).
    *   Implement `GetReservationByID`.
    *   Implement `CreateReservation` (transactional with credits).
    *   Implement `UpdateReservation` (transactional with credits).
    *   Implement `BulkUpdateReservations`.
    *   Implement `GetDashboardStats`.
3.  **Service Layer**:
    *   Create `ReservationService`.
    *   Implement business logic (availability, cost calculation, permission checks).
    *   Integrate `EmailService` (mock or stub if not ready).
4.  **HTTP Handlers**:
    *   Create `ReservationController`.
    *   Map routes in `main.go` or router config.
    *   Implement handlers for each endpoint.
5.  **Testing**:
    *   Unit tests for Service logic (credit calcs, permissions).
    *   Integration tests for DB constraints (overlap check).
