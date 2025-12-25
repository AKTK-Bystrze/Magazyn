<analysis>
1.  **Summary**: The Auth API provides endpoints for passwordless login (via Supabase Magic Link), logout, and session retrieval. It acts as a bridge between the frontend, Supabase Auth, and the application's `profiles` table.
2.  **Parameters**:
    *   `POST /auth/login`: `email` (required string).
    *   `POST /auth/logout`: Requires valid Bearer token in Authorization header.
    *   `GET /auth/session`: Requires valid Bearer token in Authorization header.
3.  **DTOs**:
    *   `LoginRequest`: `{ email: string }`
    *   `LoginResponse`: `{ message: string }`
    *   `SessionResponse`: `{ user_id: uuid, email: string, username: string, role: string, credit_balance: int, expires_at: string }`
    *   `LogoutResponse`: `{ message: string }`
4.  **Service**: A new `AuthService` is required. It will interact with the Supabase Go client (GoTrue) for auth operations and the PostgreSQL database for retrieving user profile data (`credit_balance`, `role`).
5.  **Validation**:
    *   Email must be a valid email format.
    *   JWT token must be valid and not expired for protected routes.
6.  **Logging**: Errors during Supabase calls or DB queries should be logged.
7.  **Security**:
    *   Endpoints relying on session (`logout`, `session`) must be protected by middleware verifying the Supabase JWT.
    *   `GET /session` must ensure the returned profile matches the authenticated user.
8.  **Errors**:
    *   `400 Bad Request`: Invalid email format.
    *   `401 Unauthorized`: Invalid or expired token.
    *   `404 Not Found`: User email not registered (for login) or profile not found (for session).
    *   `500 Internal Server Error`: Upstream Supabase failure or database connection issue.
</analysis>

# API Endpoint Implementation Plan: Auth API

## 1. Endpoint Overview
The Auth API manages user authentication and session state. It leverages Supabase Auth for identity management (specifically passwordless magic links) and integrates with the local `profiles` table to provide enriched session information (roles, credits).

## 2. Request Details

### POST /auth/login
*   **Description**: Initiates a passwordless login flow by sending a magic link to the user's email.
*   **HTTP Method**: `POST`
*   **URL Structure**: `/auth/login`
*   **Request Body**:
    ```json
    {
      "email": "user@example.com"
    }
    ```
*   **Validation**: `email` must be a valid email address.

### POST /auth/logout
*   **Description**: Invalidates the current user session.
*   **HTTP Method**: `POST`
*   **URL Structure**: `/auth/logout`
*   **Headers**: `Authorization: Bearer <token>`

### GET /auth/session
*   **Description**: Retrieves the current authenticated user's session details, including profile data from the database.
*   **HTTP Method**: `GET`
*   **URL Structure**: `/auth/session`
*   **Headers**: `Authorization: Bearer <token>`

## 3. Used Types

### DTOs (Data Transfer Objects)

```go
// LoginRequest represents the payload for initiating login
type LoginRequest struct {
    Email string `json:"email" validate:"required,email"`
}

// LoginResponse represents the success message after sending magic link
type LoginResponse struct {
    Message string `json:"message"`
}

// SessionResponse combines Auth user data with Profile data
type SessionResponse struct {
    UserId        string `json:"user_id"`
    Email         string `json:"email"`
    Username      string `json:"username"`
    Role          string `json:"role"`
    CreditBalance int32  `json:"credit_balance"`
    ExpiresAt     string `json:"expires_at"`
}

// LogoutResponse represents the success message after logout
type LogoutResponse struct {
    Message string `json:"message"`
}
```

### Domain Models
*   `profiles` (from `backend/internal/types/database.types.go`)

## 4. Response Details

### POST /auth/login
*   **Success (200 OK)**:
    ```json
    { "message": "Login link sent to your email" }
    ```
*   **Error (400 Bad Request)**: Invalid email format.
*   **Error (404 Not Found)**: Email not registered (if strict checking is enabled, otherwise generic success for security).
*   **Error (500 Internal Server Error)**: Failed to send magic link.

### POST /auth/logout
*   **Success (200 OK)**:
    ```json
    { "message": "Logged out successfully" }
    ```
*   **Error (401 Unauthorized)**: Invalid or missing token.
*   **Error (500 Internal Server Error)**: Failed to invalidate session.

### GET /auth/session
*   **Success (200 OK)**:
    ```json
    {
      "user_id": "uuid",
      "email": "user@example.com",
      "username": "john_doe",
      "role": "user",
      "credit_balance": 150,
      "expires_at": "2025-11-27T21:56:29Z"
    }
    ```
*   **Error (401 Unauthorized)**: Session expired or invalid.
*   **Error (404 Not Found)**: User profile not found.

## 5. Data Flow

### Login Flow
1.  **Client** sends `POST /auth/login` with email.
2.  **AuthHandler** validates the email format.
3.  **AuthService** calls Supabase GoTrue client `SignInWithOTP`.
4.  **Supabase** sends an email with a magic link to the user.
5.  **AuthHandler** returns success message.

### Session Flow
1.  **Client** sends `GET /auth/session` with JWT.
2.  **AuthMiddleware** intercepts request, validates JWT with Supabase, and extracts `user_id`.
3.  **AuthHandler** calls `AuthService.GetSession(user_id)`.
4.  **AuthService**:
    *   Fetches basic user info from Supabase (email, metadata).
    *   Queries `profiles` table by `user_id` to get `username`, `role`, `credit_balance`.
5.  **AuthService** combines data into `SessionResponse`.
6.  **AuthHandler** returns JSON response.

## 6. Security Considerations
*   **JWT Verification**: All protected routes (`/logout`, `/session`) must verify the Supabase JWT signature and expiration.
*   **Role-Based Access**: While this plan covers basic auth, the `role` returned in the session will be used by the frontend for UI logic (e.g., showing Admin links).
*   **Input Sanitization**: Email input must be sanitized and validated.
*   **Environment Variables**: Supabase URL and Anon Key must be securely loaded from environment variables, not hardcoded.

## 7. Error Handling
*   Use standard HTTP status codes.
*   Return JSON error responses: `{ "error": "Description" }`.
*   Log internal errors (Supabase connection, DB queries) to the server console/logs, but return generic messages to the client to avoid leaking internals.

## 8. Performance Considerations
*   **Database Indexing**: Ensure `profiles.id` (PK) is indexed for fast lookups during session retrieval.
*   **Caching**: Session data is relatively static but `credit_balance` changes. Avoid aggressive caching of the `/session` endpoint to ensure credit balance is accurate.

## 9. Implementation Steps

1.  **Setup Configuration**:
    *   Ensure `SUPABASE_URL` and `SUPABASE_KEY` are available in `backend/internal/config`.
    *   Initialize Supabase client in `backend/internal/config` or a new `backend/internal/db/supabase.go`.

2.  **Create DTOs**:
    *   Define request/response structs in `backend/internal/service/auth.dto.go` (or inside `auth.service.go`).

3.  **Implement Auth Middleware**:
    *   Create `backend/internal/middleware/auth.middleware.go`.
    *   Implement logic to parse `Authorization` header, validate JWT using Supabase client, and set user context.

4.  **Implement AuthService**:
    *   Create `backend/internal/service/auth.service.go`.
    *   Implement `Login(email string) error`.
    *   Implement `Logout(token string) error`.
    *   Implement `GetSession(userId string) (*SessionResponse, error)`.

5.  **Implement AuthHandler**:
    *   Create `backend/internal/handler/auth.handler.go`.
    *   Implement `HandleLogin`, `HandleLogout`, `HandleGetSession`.
    *   Parse requests, call service, handle errors, write responses.

6.  **Register Routes**:
    *   Update `backend/main.go` (or router setup) to register `/auth/*` routes.
    *   Apply Auth Middleware to `/logout` and `/session`.
