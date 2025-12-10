# API Endpoint Implementation Plan: Users (Profiles)

## 1. Endpoint Overview
The Users API provides endpoints for managing user profiles. It allows users to view their own profile, and administrators to list, view, create, and update user profiles. This includes managing roles and credit balances.

## 2. Request Details

### GET /users/me
- **HTTP Method**: GET
- **URL**: `/users/me`
- **Parameters**: None
- **Auth**: Required (Any role)

### GET /users
- **HTTP Method**: GET
- **URL**: `/users`
- **Parameters**:
  - **Optional**:
    - `page` (int, default: 1)
    - `per_page` (int, default: 25)
    - `role` (string: user/admin/super_admin)
    - `search` (string: username or email)
- **Auth**: Admin, SuperAdmin

### GET /users/:id
- **HTTP Method**: GET
- **URL**: `/users/{id}`
- **Parameters**:
  - **Required**: `id` (UUID)
- **Auth**: Admin, SuperAdmin

### POST /users
- **HTTP Method**: POST
- **URL**: `/users`
- **Request Body**:
  ```json
  {
    "email": "string (required, email)",
    "username": "string (required, unique)",
    "role": "string (required, enum: user/admin/super_admin)",
    "credit_balance": "int (optional, default: 0)"
  }
  ```
- **Auth**: SuperAdmin

### PATCH /users/:id
- **HTTP Method**: PATCH
- **URL**: `/users/{id}`
- **Parameters**:
  - **Required**: `id` (UUID)
- **Request Body**:
  ```json
  {
    "email": "string (optional, email)",
    "role": "string (optional, enum: user/admin/super_admin)",
    "credit_balance": "int (optional, >= 0)"
  }
  ```
- **Auth**: SuperAdmin

## 3. Used Types

### DTOs (Data Transfer Objects)
These will be defined in `backend/internal/types/api.types.go` (new file).

```go
type UserResponse struct {
    ID            string  `json:"id"`
    Email         string  `json:"email"`
    Username      string  `json:"username"`
    Role          string  `json:"role"`
    CreditBalance int32   `json:"credit_balance"`
    CreatedAt     string  `json:"created_at"`
    UpdatedAt     *string `json:"updated_at,omitempty"`
}

type UserListResponse struct {
    Users      []UserResponse `json:"users"`
    Pagination Pagination     `json:"pagination"`
}

type Pagination struct {
    Page       int `json:"page"`
    PerPage    int `json:"per_page"`
    TotalItems int `json:"total_items"`
    TotalPages int `json:"total_pages"`
}

type CreateUserRequest struct {
    Email         string `json:"email"`
    Username      string `json:"username"`
    Role          string `json:"role"`
    CreditBalance *int32 `json:"credit_balance"`
}

type UpdateUserRequest struct {
    Email         *string `json:"email"`
    Role          *string `json:"role"`
    CreditBalance *int32  `json:"credit_balance"`
}
```

### Command Models
Internal structures for service layer interaction, if different from DTOs. For now, DTOs can be used or mapped to domain models.

## 4. Response Details

- **200 OK**: Returns `UserResponse` or `UserListResponse`.
- **201 Created**: Returns `UserResponse` (for POST).
- **400 Bad Request**: Validation error (e.g., invalid email, negative credit).
- **401 Unauthorized**: Missing or invalid JWT.
- **403 Forbidden**: Insufficient permissions (e.g., User trying to list all users).
- **404 Not Found**: User ID not found.
- **409 Conflict**: Email or username already exists.
- **500 Internal Server Error**: Database or server error.

## 5. Data Flow

1.  **Request**: Client sends HTTP request to `Caddy` -> `Go Backend`.
2.  **Auth Middleware**: Intercepts request, validates Supabase JWT, extracts User ID and Role.
3.  **Handler**: `UserHandler` receives request, parses parameters/body, calls `UserService`.
4.  **Service**: `UserService` applies business logic (validation, permission checks beyond basic role).
5.  **Database**: Service calls `Repository` (or direct DB query) to interact with `profiles` table.
    -   For `PATCH`, updates `credit_history` if balance changes.
6.  **Response**: Service returns data/error to Handler, which formats JSON response.

## 6. Security Considerations

-   **Authentication**: All endpoints require a valid Supabase JWT.
-   **Authorization**:
    -   `GET /users/me`: Access to own data only.
    -   `GET /users`, `GET /users/:id`: Restricted to `admin` and `super_admin`.
    -   `POST /users`, `PATCH /users/:id`: Restricted to `super_admin`.
-   **Input Validation**: Strict validation on email format, allowed roles, and non-negative credit balance.
-   **Data Protection**: Sensitive fields (if any added later) should be filtered.

## 7. Error Handling

-   **Validation Errors**: Return 400 with specific field error messages.
-   **Database Errors**:
    -   Unique constraint violation (username/email) -> 409 Conflict.
    -   Record not found -> 404 Not Found.
    -   Connection issues -> 500 Internal Server Error.
-   **Logging**: Log all 500 errors with stack trace. Log security events (401/403) if needed.

## 8. Performance Considerations

-   **Pagination**: Enforced on `GET /users` to prevent loading too many records.
-   **Indexing**: Ensure `profiles` table has indexes on `username`, `email`, and `role` (as per DB plan).
-   **N+1**: Avoid N+1 queries if fetching related data (though currently just profiles).

## 9. Implementation Steps

1.  **Define Types**: Create `backend/internal/types/api.types.go` with DTOs.
2.  **Create Service**: Implement `UserService` in `backend/internal/service/user_service.go`.
    -   Implement `GetProfile`, `ListUsers`, `CreateUser`, `UpdateUser`.
3.  **Create Handler**: Implement `UserHandler` in `backend/internal/handler/user_handler.go`.
    -   Parse requests, call service, handle errors.
4.  **Setup Routes**: Register routes in `backend/cmd/api/main.go` (or router config).
    -   `/users/me`
    -   `/users` (GET, POST)
    -   `/users/{id}` (GET, PATCH)
5.  **Add Middleware**: Ensure Auth middleware is applied to these routes.
6.  **Verify**: Test endpoints with Postman/Curl and unit tests.
