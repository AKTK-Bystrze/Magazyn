# REST API Plan

This document defines the REST API for the Equipment Rental System. The API is implemented in Go and consumed by an Astro/React frontend.

## 1. Resources

The API exposes the following main resources, mapped to database tables:

| Resource                | Database Table        | Description                                           |
| ----------------------- | --------------------- | ----------------------------------------------------- |
| **Users**               | `profiles`            | User profiles with authentication and credit balances |
| **Equipment Types**     | `equipment_types`     | Categories of equipment with standardized pricing     |
| **Equipment**           | `equipment`           | Individual physical items available for rent          |
| **Reservations**        | `reservations`        | Booking records linking users to equipment            |
| **Credit History**      | `credit_history`      | Immutable ledger of all credit transactions           |
| **Credit Requests**     | `credit_requests`     | Requests for credits requiring approval               |
| **Maintenance Logs**    | `maintenance_logs`    | Audit trail for equipment status changes              |
| **Reservation History** | `reservation_history` | Audit trail for reservation changes                   |

## 2. Endpoints

### 2.1 Authentication

#### POST /auth/login

**Description**: Initiate passwordless email login (Supabase Magic Link)

**Request Body**:

```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK):

```json
{
  "message": "Login link sent to your email"
}
```

**Error Responses**:

- `400 Bad Request`: Invalid email format
- `404 Not Found`: Email not registered

---

#### POST /auth/logout

**Description**: End current user session

**Response** (200 OK):

```json
{
  "message": "Logged out successfully"
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated

---

#### GET /auth/session

**Description**: Get current session information

**Response** (200 OK):

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

**Error Responses**:

- `401 Unauthorized`: Session expired or invalid

---

### 2.2 Users (Profiles)

#### GET /users/me

**Description**: Get current user's profile

**Response** (200 OK):

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "john_doe",
  "role": "user",
  "credit_balance": 150,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-11-27T19:56:29Z"
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated

---

#### GET /users

**Description**: List all users (Admin/SuperAdmin only)

**Query Parameters**:

- `page` (integer, default: 1): Page number
- `per_page` (integer, default: 25, values: 10/25/50/100): Items per page
- `role` (string, optional): Filter by role (user/admin/super_admin)
- `search` (string, optional): Search by username or email

**Response** (200 OK):

```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "username": "john_doe",
      "role": "user",
      "credit_balance": 150,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_items": 45,
    "total_pages": 2
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions

---

#### GET /users/:id

**Description**: Get specific user profile (Admin/SuperAdmin only)

**Response** (200 OK):

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "john_doe",
  "role": "user",
  "credit_balance": 150,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-11-27T19:56:29Z"
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found

---

#### POST /users

**Description**: Create new user account (SuperAdmin only)

**Request Body**:

```json
{
  "email": "newuser@example.com",
  "username": "new_user",
  "role": "user",
  "credit_balance": 0
}
```

**Validation**:

- `email`: Required, valid email format, unique
- `username`: Required, unique, alphanumeric with underscores
- `role`: Required, one of: user/admin/super_admin
- `credit_balance`: Optional, integer >= 0, default: 0

**Response** (201 Created):

```json
{
  "id": "uuid",
  "email": "newuser@example.com",
  "username": "new_user",
  "role": "user",
  "credit_balance": 0,
  "created_at": "2025-11-27T19:56:29Z"
}
```

**Error Responses**:

- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Email or username already exists

---

#### PATCH /users/:id

**Description**: Update user profile (SuperAdmin only)

**Request Body** (all fields optional):

```json
{
  "email": "updated@example.com",
  "role": "admin",
  "credit_balance": 200
}
```

**Validation**:

- `email`: Valid email format, unique
- `role`: One of: user/admin/super_admin
- `credit_balance`: Integer >= 0

**Response** (200 OK):

```json
{
  "id": "uuid",
  "email": "updated@example.com",
  "username": "john_doe",
  "role": "admin",
  "credit_balance": 200,
  "updated_at": "2025-11-27T19:56:29Z"
}
```

**Business Logic**:

- Credit balance changes are logged in `credit_history` with reason `admin_adjustment`

**Error Responses**:

- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found
- `409 Conflict`: Email already in use

---

### 2.3 Equipment Types

#### GET /equipment-types

**Description**: List all equipment types

**Response** (200 OK):

```json
{
  "equipment_types": [
    {
      "id": "uuid",
      "name": "Kayak",
      "credit_cost_per_day": 4,
      "created_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "name": "Paddle",
      "credit_cost_per_day": 2,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated

---

#### POST /equipment-types

**Description**: Create new equipment type (Admin/SuperAdmin only)

**Request Body**:

```json
{
  "name": "Helmet",
  "credit_cost_per_day": 1
}
```

**Validation**:

- `name`: Required, unique, max 100 characters
- `credit_cost_per_day`: Required, integer >= 0

**Response** (201 Created):

```json
{
  "id": "uuid",
  "name": "Helmet",
  "credit_cost_per_day": 1,
  "created_at": "2025-11-27T19:56:29Z"
}
```

**Error Responses**:

- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Equipment type name already exists

---

### 2.4 Equipment

#### GET /equipment

**Description**: Search and list equipment with filtering

**Query Parameters**:

- `page` (integer, default: 1): Page number
- `per_page` (integer, default: 25, values: 10/25/50/100): Items per page
- `type_id` (uuid, optional): Filter by equipment type
- `search` (string, optional): Search in name and description
- `status` (string, optional): Filter by status (ok/broken)
- `include_archived` (boolean, default: false): Include archived items

**Response** (200 OK):

```json
{
  "equipment": [
    {
      "id": "uuid",
      "internal_id": "K-01",
      "type_id": "uuid",
      "type_name": "Kayak",
      "name": "Red Kayak",
      "description": "Single-person recreational kayak",
      "status": "ok",
      "credit_cost_per_day": 4,
      "image_url": "https://...",
      "is_favorite": true,
      "is_archived": false,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_items": 15,
    "total_pages": 1
  }
}
```

**Business Logic**:

- Results ordered by: favorites first (top 3 per type based on user's rental history), then alphabetically by name
- Archived equipment excluded by default unless `include_archived=true`

**Error Responses**:

- `401 Unauthorized`: Not authenticated

---

#### GET /equipment/:id

**Description**: Get equipment details

**Response** (200 OK):

```json
{
  "id": "uuid",
  "internal_id": "K-01",
  "type_id": "uuid",
  "type_name": "Kayak",
  "name": "Red Kayak",
  "description": "Single-person recreational kayak",
  "status": "ok",
  "credit_cost_per_day": 4,
  "image_url": "https://...",
  "is_archived": false,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-11-27T19:56:29Z",
  "maintenance_logs": [
    {
      "id": "uuid",
      "previous_status": "ok",
      "new_status": "broken",
      "notes": "Crack in hull",
      "admin_username": "admin_user",
      "created_at": "2025-11-20T10:00:00Z"
    }
  ]
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Equipment not found

---

#### POST /equipment

**Description**: Add new equipment (Admin/SuperAdmin only)

**Request Body**:

```json
{
  "internal_id": "K-05",
  "type_id": "uuid",
  "name": "Blue Kayak",
  "description": "Two-person kayak",
  "status": "ok",
  "image_path": "equipment/kayak-blue.jpg"
}
```

**Validation**:

- `internal_id`: Required, unique within type
- `type_id`: Required, must exist
- `name`: Optional, max 200 characters
- `description`: Optional
- `status`: Required, one of: ok/broken, default: ok
- `image_path`: Optional, path in Supabase storage

**Response** (201 Created):

```json
{
  "id": "uuid",
  "internal_id": "K-05",
  "type_id": "uuid",
  "type_name": "Kayak",
  "name": "Blue Kayak",
  "description": "Two-person kayak",
  "status": "ok",
  "credit_cost_per_day": 4,
  "image_url": "https://...",
  "is_archived": false,
  "created_at": "2025-11-27T19:56:29Z"
}
```

**Error Responses**:

- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Equipment type not found
- `409 Conflict`: internal_id already exists for this type

---

#### PATCH /equipment/:id

**Description**: Update equipment (Admin/SuperAdmin only)

**Request Body** (all fields optional):

```json
{
  "name": "Updated Kayak",
  "description": "Updated description",
  "status": "broken",
  "image_path": "equipment/new-image.jpg"
}
```

**Validation**:

- `name`: Max 200 characters
- `status`: One of: ok/broken
- `image_path`: Path in Supabase storage or null to remove

**Response** (200 OK):

```json
{
  "id": "uuid",
  "internal_id": "K-05",
  "type_id": "uuid",
  "type_name": "Kayak",
  "name": "Updated Kayak",
  "description": "Updated description",
  "status": "broken",
  "credit_cost_per_day": 4,
  "image_url": null,
  "updated_at": "2025-11-27T19:56:29Z"
}
```

**Business Logic**:

- Status changes trigger `maintenance_logs` entry
- Frontend should prompt for maintenance notes when status changes to broken

**Error Responses**:

- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Equipment not found

---

#### DELETE /equipment/:id

**Description**: Archive equipment (soft delete, Admin/SuperAdmin only)

**Response** (200 OK):

```json
{
  "message": "Equipment archived successfully"
}
```

**Business Logic**:

- Sets `is_archived = true` instead of deleting
- Archived equipment excluded from normal queries

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Equipment not found
- `409 Conflict`: Equipment has active reservations

---

#### GET /equipment/:id/availability

**Description**: Check equipment availability for date range

**Query Parameters**:

- `start_date` (date, required): Start date (YYYY-MM-DD)
- `end_date` (date, required): End date (YYYY-MM-DD)

**Response** (200 OK):

```json
{
  "equipment_id": "uuid",
  "is_available": false,
  "conflicting_reservations": [
    {
      "id": "uuid",
      "start_date": "2025-12-01",
      "end_date": "2025-12-05",
      "status": "PENDING"
    }
  ]
}
```

**Validation**:

- `start_date`: Required, must be valid date
- `end_date`: Required, must be >= start_date

**Error Responses**:

- `400 Bad Request`: Invalid date range
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Equipment not found

---

### 2.5 Reservations

#### GET /reservations

**Description**: List reservations (user sees own, admin sees all)

**Query Parameters**:

- `page` (integer, default: 1): Page number
- `per_page` (integer, default: 25, values: 10/25/50/100): Items per page
- `status` (string, optional): Filter by status (PENDING/RENTED/RETURNED/DENIED)
- `user_id` (uuid, optional, admin only): Filter by user
- `equipment_id` (uuid, optional): Filter by equipment
- `start_date_from` (date, optional): Filter reservations starting on or after date
- `start_date_to` (date, optional): Filter reservations starting on or before date

**Response** (200 OK):

```json
{
  "reservations": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "username": "john_doe",
      "equipment_id": "uuid",
      "equipment_name": "Red Kayak",
      "equipment_type": "Kayak",
      "start_date": "2025-12-01",
      "end_date": "2025-12-05",
      "status": "PENDING",
      "credit_cost": 20,
      "created_at": "2025-11-27T19:56:29Z",
      "updated_at": "2025-11-27T19:56:29Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_items": 12,
    "total_pages": 1
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated

---

#### GET /reservations/:id

**Description**: Get reservation details with audit trail

**Response** (200 OK):

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "username": "john_doe",
  "user_email": "user@example.com",
  "equipment_id": "uuid",
  "equipment_name": "Red Kayak",
  "equipment_type": "Kayak",
  "equipment_internal_id": "K-01",
  "start_date": "2025-12-01",
  "end_date": "2025-12-05",
  "status": "RENTED",
  "credit_cost": 20,
  "created_at": "2025-11-27T19:56:29Z",
  "updated_at": "2025-11-28T10:00:00Z",
  "audit_trail": [
    {
      "id": "uuid",
      "start_date": "2025-12-01",
      "end_date": "2025-12-05",
      "status": "PENDING",
      "changed_by_username": "john_doe",
      "created_at": "2025-11-27T19:56:29Z"
    },
    {
      "id": "uuid",
      "start_date": "2025-12-01",
      "end_date": "2025-12-05",
      "status": "RENTED",
      "changed_by_username": "admin_user",
      "created_at": "2025-11-28T10:00:00Z"
    }
  ]
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Cannot view other users' reservations (non-admin)
- `404 Not Found`: Reservation not found

---

#### POST /reservations

**Description**: Create new reservation(s)

**Request Body**:

```json
{
  "reservations": [
    {
      "equipment_id": "uuid",
      "start_date": "2025-12-01",
      "end_date": "2025-12-05"
    },
    {
      "equipment_id": "uuid",
      "start_date": "2025-12-01",
      "end_date": "2025-12-03"
    }
  ],
  "user_id": "uuid"
}
```

**Validation**:

- `reservations`: Required, array with at least 1 item
- `equipment_id`: Required, must exist and not be archived/broken
- `start_date`: Required, must be in future
- `end_date`: Required, must be >= start_date
- `user_id`: Optional, admin only (for creating on behalf of other users)

**Response** (201 Created):

```json
{
  "reservations": [
    {
      "id": "uuid",
      "equipment_id": "uuid",
      "equipment_name": "Red Kayak",
      "start_date": "2025-12-01",
      "end_date": "2025-12-05",
      "status": "PENDING",
      "credit_cost": 20
    }
  ],
  "total_credit_cost": 32,
  "remaining_balance": 118
}
```

**Business Logic**:

- Creates separate reservation record for each equipment item
- Checks availability using exclusion constraint (prevents overlapping)
- Validates user has sufficient credits for total cost
- Deducts credits immediately and logs in `credit_history` with reason `reservation_charge`
- Sends email notification with all reservation details
- Creates initial audit trail entry
- Back-to-back reservations allowed (end_date == next start_date)

**Error Responses**:

- `400 Bad Request`: Validation errors, invalid dates
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions (user_id specified by non-admin)
- `404 Not Found`: Equipment not found
- `409 Conflict`: Equipment unavailable for selected dates, insufficient credits, equipment broken/archived

---

#### PATCH /reservations/:id

**Description**: Update reservation (dates or status)

**Request Body** (at least one field required):

```json
{
  "start_date": "2025-12-02",
  "end_date": "2025-12-06",
  "status": "RENTED"
}
```

**Validation**:

- `start_date`: Must be in future, must be < end_date
- `end_date`: Must be >= start_date
- `status`: One of: PENDING/RENTED/RETURNED/DENIED

**Authorization**:

- Users can modify dates only for own PENDING reservations
- Users can change status to DENIED only (cancellation)
- Admins can modify any reservation except final states (RETURNED/DENIED)

**Response** (200 OK):

```json
{
  "id": "uuid",
  "equipment_id": "uuid",
  "start_date": "2025-12-02",
  "end_date": "2025-12-06",
  "status": "PENDING",
  "credit_cost": 20,
  "credit_adjustment": -4,
  "remaining_balance": 134,
  "updated_at": "2025-11-27T20:00:00Z"
}
```

**Business Logic**:

- Date changes: Recalculate credits, apply adjustment (refund or charge)
- Status PENDING → DENIED: Refund credits with reason `reservation_refund`
- Warn if extension is significant (>50% increase or >3 days)
- Check availability for new dates
- Log change in audit trail with changed_by_user_id
- Log credit adjustment in `credit_history` with reason `reservation_adjustment`

**Error Responses**:

- `400 Bad Request`: Validation errors, invalid status transition
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Cannot modify other users' reservations or non-PENDING status
- `404 Not Found`: Reservation not found
- `409 Conflict`: New dates conflict with existing reservations

---

#### PATCH /reservations/bulk

**Description**: Bulk status update (Admin only)

**Request Body**:

```json
{
  "reservation_ids": ["uuid1", "uuid2", "uuid3"],
  "status": "RENTED"
}
```

**Validation**:

- `reservation_ids`: Required, array of UUIDs
- `status`: Required, one of: PENDING/RENTED/RETURNED/DENIED

**Response** (200 OK):

```json
{
  "successful": [
    {
      "id": "uuid1",
      "status": "RENTED"
    }
  ],
  "failed": [
    {
      "id": "uuid2",
      "error": "Reservation already returned"
    }
  ],
  "summary": {
    "total": 3,
    "successful_count": 2,
    "failed_count": 1
  }
}
```

**Business Logic**:

- Updates each reservation individually
- Each change logged in audit trail
- Credits adjusted per business rules
- Continues processing even if some fail

**Error Responses**:

- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions

---

#### GET /reservations/dashboard

**Description**: Admin dashboard summary

**Response** (200 OK):

```json
{
  "summary": {
    "pending_count": 5,
    "overdue_count": 2,
    "today_count": 3
  },
  "overdue_items": [
    {
      "reservation_id": "uuid",
      "user_id": "uuid",
      "username": "john_doe",
      "user_email": "user@example.com",
      "equipment_id": "uuid",
      "equipment_name": "Red Kayak",
      "end_date": "2025-11-25",
      "days_overdue": 2,
      "status": "RENTED"
    }
  ]
}
```

**Business Logic**:

- Overdue: end_date < today AND status != RETURNED
- Today: start_date == today

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Admin only

---

### 2.6 Credit History

#### GET /credit-history [IMPLEMENTED]
Implementation: 
- Handler: `backend/internal/handler/credit/credit_handler.go`
- Service: `backend/internal/service/credit/credit_service.go`
- Repository: `backend/internal/repository/supabase/credit_history_repository.go`

**Description**: Get user's credit transaction history (user sees own, admin sees all)

**Query Parameters**:

- `page` (integer, default: 1): Page number
- `per_page` (integer, default: 25, values: 10/25/50/100): Items per page
- `user_id` (uuid, optional, admin only): Filter by user

**Response** (200 OK):

```json
{
  "credit_history": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "username": "john_doe",
      "amount": -20,
      "reason": "reservation_charge",
      "description": "Kayak rental Dec 1-5",
      "reservation_id": "uuid",
      "admin_id": null,
      "admin_username": null,
      "created_at": "2025-11-27T19:56:29Z"
    },
    {
      "id": "uuid",
      "user_id": "uuid",
      "username": "john_doe",
      "amount": 50,
      "reason": "work_credit",
      "description": "Dock maintenance",
      "reservation_id": null,
      "admin_id": "admin-uuid",
      "admin_username": "admin_user",
      "created_at": "2025-11-20T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_items": 45,
    "total_pages": 2
  },
  "current_balance": 150
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated

---

### 2.7 Credit Requests

#### GET /credit-requests

**Description**: List credit requests (user sees own, superAdmin sees all)

**Query Parameters**:

- `page` (integer, default: 1): Page number
- `per_page` (integer, default: 25, values: 10/25/50/100): Items per page
- `status` (string, optional): Filter by status (PENDING/APPROVED/DENIED)

**Response** (200 OK):

```json
{
  "credit_requests": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "username": "john_doe",
      "amount": 30,
      "description": "Helped repair dock",
      "status": "PENDING",
      "admin_id": null,
      "admin_username": null,
      "admin_note": null,
      "created_at": "2025-11-27T19:56:29Z",
      "updated_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_items": 8,
    "total_pages": 1
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated

---

#### POST /credit-requests

**Description**: Submit credit request

**Request Body**:

```json
{
  "amount": 30,
  "description": "Helped repair dock on Nov 25"
}
```

**Validation**:

- `amount`: Required, integer > 0
- `description`: Required, min 10 characters, max 500 characters

**Response** (201 Created):

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "amount": 30,
  "description": "Helped repair dock on Nov 25",
  "status": "PENDING",
  "created_at": "2025-11-27T19:56:29Z"
}
```

**Error Responses**:

- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Not authenticated

---

#### PATCH /credit-requests/:id

**Description**: Approve/deny credit request (SuperAdmin only)

**Request Body**:

```json
{
  "status": "APPROVED",
  "approved_amount": 25,
  "admin_note": "Good work, but 25 credits is more appropriate"
}
```

**Validation**:

- `status`: Required, one of: APPROVED/DENIED
- `approved_amount`: Required if status=APPROVED, integer > 0
- `admin_note`: Optional, max 500 characters

**Response** (200 OK):

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "amount": 30,
  "description": "Helped repair dock on Nov 25",
  "status": "APPROVED",
  "admin_id": "admin-uuid",
  "admin_username": "super_admin",
  "admin_note": "Good work, but 25 credits is more appropriate",
  "approved_amount": 25,
  "updated_at": "2025-11-27T20:00:00Z"
}
```

**Business Logic**:

- If APPROVED: Add credits to user's balance, log in `credit_history` with reason `work_credit`
- Send notification to user about approval/denial

**Error Responses**:

- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: SuperAdmin only
- `404 Not Found`: Request not found
- `409 Conflict`: Request already processed

---

### 2.8 Maintenance Logs

#### GET /equipment/:id/maintenance-logs

**Description**: Get maintenance history for equipment

**Response** (200 OK):

```json
{
  "maintenance_logs": [
    {
      "id": "uuid",
      "equipment_id": "uuid",
      "previous_status": "ok",
      "new_status": "broken",
      "notes": "Crack in hull discovered",
      "admin_id": "admin-uuid",
      "admin_username": "admin_user",
      "created_at": "2025-11-20T10:00:00Z"
    }
  ]
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Equipment not found

---

#### POST /equipment/:id/maintenance-logs

**Description**: Add maintenance log entry (Admin only)

**Request Body**:

```json
{
  "notes": "Repaired crack in hull, applied sealant"
}
```

**Validation**:

- `notes`: Optional but recommended, max 1000 characters

**Response** (201 Created):

```json
{
  "id": "uuid",
  "equipment_id": "uuid",
  "previous_status": "broken",
  "new_status": "ok",
  "notes": "Repaired crack in hull, applied sealant",
  "admin_id": "admin-uuid",
  "admin_username": "admin_user",
  "created_at": "2025-11-27T20:00:00Z"
}
```

**Business Logic**:

- Automatically triggered when equipment status changes
- Can also be manually created by admin
- Frontend should gently remind admin to add notes when marking equipment as broken

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Admin only
- `404 Not Found`: Equipment not found

---

### 2.9 Calendar & Analytics

#### GET /calendar/availability

**Description**: Get availability calendar for equipment

**Query Parameters**:

- `equipment_id` (uuid, optional): Specific equipment (omit for all equipment)
- `start_date` (date, default: today): Calendar start date
- `days` (integer, default: 30, max: 90): Number of days to show

**Response** (200 OK):

```json
{
  "calendar": [
    {
      "date": "2025-11-27",
      "equipment_id": "uuid",
      "equipment_name": "Red Kayak",
      "is_available": true,
      "reservation_id": null
    },
    {
      "date": "2025-11-28",
      "equipment_id": "uuid",
      "equipment_name": "Red Kayak",
      "is_available": false,
      "reservation_id": "uuid",
      "reservation_status": "PENDING"
    }
  ]
}
```

**Error Responses**:

- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Not authenticated

---

#### GET /analytics/equipment-stats

**Description**: Equipment usage analytics (Admin only)

**Query Parameters**:

- `year` (integer, optional): Filter by year
- `month` (integer, optional): Filter by month (1-12)
- `equipment_id` (uuid, optional): Specific equipment

**Response** (200 OK):

```json
{
  "equipment_stats": [
    {
      "equipment_id": "uuid",
      "equipment_name": "Red Kayak",
      "equipment_type": "Kayak",
      "total_reservations": 25,
      "total_days_rented": 120,
      "utilization_rate": 0.65,
      "top_renters": [
        {
          "user_id": "uuid",
          "username": "john_doe",
          "reservation_count": 8,
          "days_rented": 35
        }
      ]
    }
  ],
  "period": {
    "year": 2025,
    "month": 11
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Admin only

---

#### GET /analytics/user-stats

**Description**: User activity analytics (Admin only)

**Query Parameters**:

- `year` (integer, optional): Filter by year
- `month` (integer, optional): Filter by month (1-12)

**Response** (200 OK):

```json
{
  "user_stats": [
    {
      "user_id": "uuid",
      "username": "john_doe",
      "total_reservations": 15,
      "total_credits_spent": 180,
      "last_reservation_date": "2025-11-25",
      "favorite_equipment_type": "Kayak"
    }
  ],
  "period": {
    "year": 2025,
    "month": 11
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Admin only

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

**Method**: Passwordless email authentication via Supabase Auth

**Flow**:

1. User submits email via `POST /auth/login`
2. Supabase sends magic link to email
3. User clicks link, Supabase creates session
4. Frontend receives JWT token from Supabase
5. Frontend includes JWT in Authorization header for all API requests: `Authorization: Bearer <jwt>`
6. Go backend verifies JWT using Supabase public key
7. Backend extracts user information from verified JWT

**Session Management**:

- Sessions expire after 2 hours of inactivity
- Frontend should monitor session expiration and redirect to login
- Refresh tokens handled by Supabase client library

### 3.2 Authorization Rules

**Role-Based Access Control (RBAC)**:

| Feature               | User | Admin | SuperAdmin |
| --------------------- | ---- | ----- | ---------- |
| **Authentication**    |
| Login/Logout          | ✓    | ✓     | ✓          |
| **Profiles**          |
| View own profile      | ✓    | ✓     | ✓          |
| View all users        | ✗    | ✓     | ✓          |
| Create user           | ✗    | ✗     | ✓          |
| Edit user             | ✗    | ✗     | ✓          |
| **Equipment Types**   |
| View types            | ✓    | ✓     | ✓          |
| Create/edit types     | ✗    | ✓     | ✓          |
| **Equipment**         |
| View equipment        | ✓    | ✓     | ✓          |
| Create/edit equipment | ✗    | ✓     | ✓          |
| Archive equipment     | ✗    | ✓     | ✓          |
| **Reservations**      |
| View own              | ✓    | ✓     | ✓          |
| View all              | ✗    | ✓     | ✓          |
| Create for self       | ✓    | ✓     | ✓          |
| Create for others     | ✗    | ✓     | ✓          |
| Modify own PENDING    | ✓    | ✓     | ✓          |
| Modify any            | ✗    | ✓     | ✓          |
| Cancel own PENDING    | ✓    | ✓     | ✓          |
| Change status         | ✗    | ✓     | ✓          |
| Bulk operations       | ✗    | ✓     | ✓          |
| **Credits**           |
| View own history      | ✓    | ✓     | ✓          |
| View all history      | ✗    | ✓     | ✓          |
| Request credits       | ✓    | ✓     | ✓          |
| Approve requests      | ✗    | ✗     | ✓          |
| Adjust credits        | ✗    | ✗     | ✓          |
| **Maintenance**       |
| View logs             | ✓    | ✓     | ✓          |
| Add logs              | ✗    | ✓     | ✓          |
| **Analytics**         |
| View analytics        | ✗    | ✓     | ✓          |
| **Audit Trail**       |
| View own reservations | ✓    | ✓     | ✓          |
| View all reservations | ✗    | ✓     | ✓          |

**Implementation**:

- Backend extracts user role from JWT claims
- Each endpoint checks required role before processing
- Database RLS policies provide additional security layer
- All modifications logged with user_id/admin_id for accountability

### 3.3 Security Measures

**Input Validation**:

- All inputs validated on backend (frontend validation is UX only)
- SQL injection prevention via parameterized queries
- XSS prevention via output encoding
- File upload validation: type, size, content

**Rate Limiting**:

- Login endpoint: 5 attempts per 15 minutes per IP
- Credit request creation: 5 requests per day per user
- Reservation creation: 20 requests per hour per user
- API calls: 100 requests per minute per user

**Data Protection**:

- HTTPS required for all API communication
- JWT tokens transmitted securely
- Sensitive data (emails) not exposed unnecessarily
- Database RLS enforces data access policies

**Audit Trail**:

- All reservation changes logged in `reservation_history`
- All credit changes logged in `credit_history`
- Admin actions include admin_id for accountability

## 4. Validation and Business Logic

### 4.1 Validation Rules by Resource

#### Users (Profiles)

| Field          | Rules                                                         |
| -------------- | ------------------------------------------------------------- |
| email          | Required, valid email format, unique, max 255 chars           |
| username       | Required, unique, alphanumeric + underscores only, 3-50 chars |
| role           | Required, enum: user/admin/super_admin                        |
| credit_balance | Integer >= 0                                                  |

#### Equipment Types

| Field               | Rules                           |
| ------------------- | ------------------------------- |
| name                | Required, unique, max 100 chars |
| credit_cost_per_day | Required, integer >= 0          |

#### Equipment

| Field       | Rules                                                              |
| ----------- | ------------------------------------------------------------------ |
| internal_id | Required, unique within type, alphanumeric + hyphens, max 20 chars |
| type_id     | Required, must reference existing equipment_type                   |
| name        | Optional, max 200 chars                                            |
| description | Optional, max 1000 chars                                           |
| status      | Required, enum: ok/broken, default: ok                             |
| image_path  | Optional, max 255 chars, must be valid storage path                |
| is_archived | Boolean, default: false                                            |

**Constraints**:

- `UNIQUE (type_id, internal_id)`: Internal ID unique within equipment type
- Equipment with active reservations cannot be archived

#### Reservations

| Field        | Rules                                                            |
| ------------ | ---------------------------------------------------------------- |
| user_id      | Required, must reference existing user                           |
| equipment_id | Required, must reference existing, non-archived equipment        |
| start_date   | Required, DATE format, must be in future (for new reservations)  |
| end_date     | Required, DATE format, must be >= start_date                     |
| status       | Required, enum: PENDING/RENTED/RETURNED/DENIED, default: PENDING |

**Constraints**:

- `CHECK (end_date >= start_date)`: End date must be on or after start date
- **Exclusion Constraint**: `EXCLUDE USING gist (equipment_id WITH =, daterange(start_date, end_date, '[]') WITH &&)`
  - Prevents overlapping reservations for same equipment
  - Allows back-to-back reservations (end date == next start date)

**Business Rules**:

- User must have sufficient credits before creating reservation
- Equipment must have status='ok' (not broken)
- Equipment must not be archived
- Status transitions:
  - PENDING → RENTED (admin confirms pickup)
  - PENDING → DENIED (admin rejects or user cancels)
  - RENTED → RETURNED (admin confirms return)
  - Final states (RETURNED, DENIED) cannot be changed

#### Credit Requests

| Field       | Rules                                                     |
| ----------- | --------------------------------------------------------- |
| user_id     | Required, must reference existing user                    |
| amount      | Required, integer > 0, max 1000                           |
| description | Required, min 10 chars, max 500 chars                     |
| status      | Required, enum: PENDING/APPROVED/DENIED, default: PENDING |
| admin_note  | Optional, max 500 chars                                   |

**Business Rules**:

- Only PENDING requests can be approved/denied
- Approved amount can differ from requested amount
- Credit balance adjusted only when status changes to APPROVED

#### Credit History

| Field          | Rules                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| user_id        | Required, must reference existing user                                                                    |
| amount         | Required, integer (positive or negative)                                                                  |
| reason         | Required, enum: reservation_charge/reservation_refund/reservation_adjustment/admin_adjustment/work_credit |
| description    | Optional, max 500 chars                                                                                   |
| reservation_id | Optional, must reference existing reservation if provided                                                 |
| admin_id       | Optional, must reference existing admin user if provided                                                  |

**Business Rules**:

- Records are immutable (insert-only, no updates/deletes)
- Automatically created by system for credit-affecting operations
- User credit_balance is sum of all credit_history entries
- Negative amounts for charges, positive for credits/refunds

#### Maintenance Logs

| Field           | Rules                                                    |
| --------------- | -------------------------------------------------------- |
| equipment_id    | Required, must reference existing equipment              |
| previous_status | Optional, enum: ok/broken (status before change)         |
| new_status      | Required, enum: ok/broken (status after change)          |
| notes           | Optional, max 1000 chars (recommended for broken status) |
| admin_id        | Optional, must reference admin user                      |

**Business Rules**:

- Automatically created when equipment status changes
- Can be manually created by admin for maintenance notes
- Frontend should prompt for notes when equipment marked as broken

#### Reservation History (Audit Trail)

| Field              | Rules                                         |
| ------------------ | --------------------------------------------- |
| reservation_id     | Required, must reference existing reservation |
| user_id            | Required, snapshot of reservation owner       |
| equipment_id       | Required, snapshot of equipment               |
| start_date         | Required, snapshot of start date              |
| end_date           | Required, snapshot of end date                |
| status             | Required, snapshot of status                  |
| changed_by_user_id | Optional, who made the change                 |

**Business Rules**:

- Records are immutable (insert-only, no updates/deletes)
- Automatically created on reservation insert/update via trigger
- Captures complete snapshot of reservation state at time of change
- Users can view audit trail for own reservations, admins for all

### 4.2 Credit Calculation Logic

**Per-Day Rates** (from equipment_types table):

- Kayak: 4 credits/day
- Paddle: 2 credits/day
- Other types: configurable credits/day

**Calculation Formula**:

```
days = end_date - start_date + 1  // Inclusive both dates
credit_cost = days × credit_cost_per_day
```

**Example**:

- Kayak rental Dec 1-5 (5 days): 5 × 4 = 20 credits
- Paddle rental Dec 1-3 (3 days): 3 × 2 = 6 credits

**Credit Transactions**:

1. **Reservation Created** (status: PENDING):
   - Deduct credits immediately
   - Log: reason=`reservation_charge`, amount=`-credit_cost`

2. **Reservation Cancelled** (status: PENDING → DENIED):
   - Refund full amount
   - Log: reason=`reservation_refund`, amount=`+credit_cost`

3. **Reservation Dates Modified**:
   - Calculate new credit_cost
   - Calculate difference: `adjustment = new_cost - old_cost`
   - Apply adjustment (charge if positive, refund if negative)
   - Log: reason=`reservation_adjustment`, amount=`adjustment`

4. **Credit Request Approved**:
   - Add approved amount (may differ from requested)
   - Log: reason=`work_credit`, amount=`+approved_amount`

5. **Admin Adjustment**:
   - Add or subtract credits directly
   - Log: reason=`admin_adjustment`, amount=`adjustment`

### 4.3 Date Modification Warnings

**Significant Extension** defined as:

- Extension > 50% of original duration, OR
- Extension > 3 days

**Example**:

- Original: Dec 1-3 (3 days)
- Modified: Dec 1-7 (7 days)
- Extension: 4 days (133% increase)
- Triggers warning: Yes (both conditions met)

**Frontend Action**:

- Display warning message
- Show credit impact
- Require explicit confirmation

### 4.4 Availability Checking

**Exclusion Constraint** (PostgreSQL):

```sql
EXCLUDE USING gist (
  equipment_id WITH =,
  daterange(start_date, end_date, '[]') WITH &&
)
```

**What it prevents**:

- Overlapping reservations for same equipment
- Date ranges use inclusive bounds `'[]'`

**What it allows**:

- Back-to-back reservations: Reservation A ends Dec 5, Reservation B starts Dec 5
- Multiple reservations for different equipment on same dates

**API Behavior**:

- Availability check happens during INSERT/UPDATE
- Database constraint violation returns 409 Conflict
- Frontend should check availability before submitting

### 4.5 Email Notifications

**Trigger**: Reservation creation only (not status changes)

**Content**:

- Session summary (all items reserved together)
- For each item:
  - Equipment name, type, description
  - Start and end dates
  - Credit cost
- Total credits deducted
- Remaining credit balance
- Link to view reservations

**Implementation**:

- Backend sends email via Gmail SMTP
- Email sent after successful transaction commit
- Single email per multi-item reservation session

### 4.6 Favorites Algorithm

**Definition**: Top 3 equipment items per equipment type based on user's rental history

**Calculation**:

1. For each equipment type, count user's completed reservations per item
2. Rank items by reservation count (descending)
3. Take top 3 items per type
4. Mark as favorites in search results

**Search Results Ordering**:

1. Favorites first (grouped by type)
2. All other items alphabetically by name

**Business Rule**:

- If user has no rental history for a type, no favorites shown for that type
- Favorites refresh based on recent activity (not real-time, could be cached)

### 4.7 Soft Delete (Equipment)

**Implementation**:

- DELETE endpoint sets `is_archived = true`
- Archived equipment excluded from default queries
- Archived equipment cannot be reserved
- Admin can view archived equipment with `include_archived=true`

**Restriction**:

- Cannot archive equipment with active reservations (status PENDING or RENTED)
- Must wait until all reservations are RETURNED or DENIED

---

## 5. Error Handling

### 5.1 Standard Error Response Format

All errors return consistent JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    }
  }
}
```

### 5.2 Common HTTP Status Codes

| Code | Meaning               | Use Case                                           |
| ---- | --------------------- | -------------------------------------------------- |
| 200  | OK                    | Successful GET, PATCH, DELETE                      |
| 201  | Created               | Successful POST                                    |
| 400  | Bad Request           | Validation errors, malformed JSON                  |
| 401  | Unauthorized          | Missing or invalid JWT                             |
| 403  | Forbidden             | Authenticated but insufficient permissions         |
| 404  | Not Found             | Resource doesn't exist                             |
| 409  | Conflict              | Business rule violation (availability, uniqueness) |
| 422  | Unprocessable Entity  | Valid JSON but semantic errors                     |
| 429  | Too Many Requests     | Rate limit exceeded                                |
| 500  | Internal Server Error | Unexpected server error                            |

### 5.3 Validation Error Examples

**Invalid email format**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "email": "Invalid email format"
    }
  }
}
```

**Insufficient credits**:

```json
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Not enough credits for this reservation",
    "details": {
      "required": 20,
      "available": 15,
      "shortfall": 5
    }
  }
}
```

**Equipment unavailable**:

```json
{
  "error": {
    "code": "EQUIPMENT_UNAVAILABLE",
    "message": "Equipment is not available for selected dates",
    "details": {
      "reason": "already_reserved",
      "conflicting_dates": ["2025-12-01", "2025-12-02", "2025-12-03"]
    }
  }
}
```

---

## 6. Technical Notes

### 6.1 Date Handling

- All dates stored as PostgreSQL `DATE` type (no time component)
- API accepts/returns dates in `YYYY-MM-DD` format (ISO 8601)
- Timezone handling: dates represent calendar days, not moments in time
- Back-to-back reservations: end_date of one can equal start_date of next

### 6.2 Pagination

**Standard Parameters**:

- `page`: 1-indexed page number (default: 1)
- `per_page`: Items per page (default: 25, allowed: 10/25/50/100)

**Response Structure**:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_items": 73,
    "total_pages": 3
  }
}
```

### 6.3 Database Triggers

**Automatic Operations** (handled by database):

1. **User Creation**: `handle_new_user` trigger on `auth.users` creates `profiles` entry
2. **Maintenance Logging**: `log_maintenance_change` trigger on `equipment` status change
3. **Reservation Audit**: `log_reservation_change` trigger on `reservations` insert/update
4. **Timestamp Updates**: `update_updated_at` trigger maintains `updated_at` column

**API Responsibility**:

- Credit balance updates (via credit_history)
- Equipment availability validation
- Business logic enforcement

### 6.4 Real-Time Features

**Supabase Realtime** enabled for:

- `reservations` table: Live updates to availability
- `equipment` table: Live status changes

**Frontend Integration**:

- Subscribe to real-time changes for calendar updates
- Notify user if equipment becomes unavailable during reservation flow

### 6.5 File Uploads

**Image Storage**:

- Handled via Supabase Storage
- Frontend uploads directly to Supabase (bypasses Go API)
- Go API only stores image path reference

**Storage Bucket**: `equipment-images`

**RLS Policies**:

- Read: Public access (authenticated users)
- Write: Admin/SuperAdmin only

**Validation**:

- File size: max 2MB
- File types: JPEG, PNG
- Automatic thumbnail generation (1024x1024)

---

## 7. API Versioning

**Current Version**: v1

**URL Structure**: `/api/v1/{resource}`

**Future Versions**:

- Breaking changes require new version (v2, v3)
- Non-breaking changes added to existing version
- At least 6 months notice before deprecating version

---

## 8. Development Notes

### 8.1 Technology Stack Integration

**Frontend (Astro + React)**:

- TanStack Query for API caching and state management
- Supabase JS Client for Auth and Storage
- API calls to Go backend for business logic

**Backend (Go)**:

- JWT verification using Supabase public key
- PostgreSQL connection to Supabase database
- Gmail SMTP for email notifications

**Database (PostgreSQL/Supabase)**:

- RLS policies enforce data access
- Triggers automate audit logging
- Extension `btree_gist` required for exclusion constraints

### 8.2 Testing Considerations

**API Testing**:

- Unit tests for business logic
- Integration tests for database operations
- End-to-end tests for critical flows (reservation, credit)

**Key Test Cases**:

1. Credit calculation and balance updates
2. Reservation availability checking (exclusion constraint)
3. Role-based access control
4. Date validation and modification warnings
5. Concurrent reservation attempts (race conditions)
6. Audit trail completeness

### 8.3 Performance Considerations

**Indexes** (from db-plan.md):

- Reservations: equipment_id, user_id, status, dates
- Equipment: type_id, internal_id, status
- Profiles: username, email

**Query Optimization**:

- Use database views for analytics (pre-aggregated)
- Cache frequently accessed data (equipment types, user favorites)
- Pagination for all large result sets

---

## 9. Appendix

### 9.1 Enum Values Reference

**user_role**:

- `user`: Regular club member
- `admin`: Equipment and reservation manager
- `super_admin`: Full system control

**reservation_status**:

- `PENDING`: Created, credits deducted, awaiting pickup
- `RENTED`: Confirmed by admin, equipment in use
- `RETURNED`: Equipment returned and confirmed
- `DENIED`: Cancelled by user or rejected by admin

**equipment_status**:

- `ok`: Available for rental
- `broken`: Unavailable, needs maintenance

**credit_request_status**:

- `PENDING`: Awaiting superAdmin review
- `APPROVED`: Credits granted
- `DENIED`: Request rejected

**credit_transaction_reason**:

- `reservation_charge`: Credits deducted for new reservation
- `reservation_refund`: Credits refunded from cancelled reservation
- `reservation_adjustment`: Credits adjusted from date modification
- `admin_adjustment`: Manual credit adjustment by superAdmin
- `work_credit`: Credits granted from approved work request

### 9.2 Database Relationships Diagram

```
auth.users (Supabase Auth)
    ↓ 1:1
profiles (users: id, email, username, role, credit_balance)
    ↓ 1:N
reservations (user_id, equipment_id, dates, status)
    ↓ 1:N
reservation_history (audit trail: snapshots of changes)

equipment_types (name, credit_cost_per_day)
    ↓ 1:N
equipment (type_id, internal_id, name, status, image)
    ↓ 1:N
reservations
    ↓ 1:N
maintenance_logs (equipment_id, status_change, notes)

profiles
    ↓ 1:N
credit_history (user_id, amount, reason, reservation_id)
    ↓ 0:1
reservations (optional link)

profiles
    ↓ 1:N
credit_requests (user_id, amount, description, status)
```

---

**End of REST API Plan**
