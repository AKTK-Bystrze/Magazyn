next 11.20 [2x4] Projektowanie API z AI - wygenerowanie types.ts i types.go. ts udalo sie dla go trzeba sie polaczyc bezposrednio ale latwiej bedzie postawic baze lokalnie i z niej wygenreowac. Potem majac types mozna isc dalej tzn Prompt: "Generowanie typów DTO i Command Models" 2.

Prompt: Plan implementacji endpointa REST API - ### 2.4 Equipment


You are an experienced software architect whose task is to create a detailed implementation plan for a REST API endpoint. Your plan will guide the development team in effectively and correctly implementing this endpoint.

Before we begin, review the following information:

1. Route API specification:
<route_api_specification>
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

</route_api_specification>

2. Related database resources:
<related_db_resources>
@db-plan.md 
</related_db_resources>

3. Type definitions:
<type_definitions>
@database.types.go @database.types.ts 
</type_definitions>

3. Tech stack:
<tech_stack>
@techstack.md 
</tech_stack>

4. Implementation rules:
<implementation_rules>
@shared.mdc, @backend.mdc, @astro.mdc)
</implementation_rules>

Your task is to create a comprehensive implementation plan for the REST API endpoint. Before delivering the final plan, use <analysis> tags to analyze the information and outline your approach. In this analysis, ensure that:

1. Summarize key points of the API specification.
2. List required and optional parameters from the API specification.
3. List necessary DTO types and Command Models.
4. Consider how to extract logic to a service (existing or new, if it doesn't exist).
5. Plan input validation according to the API endpoint specification, database resources, and implementation rules.
6. Determine how to log errors in the error table (if applicable).
7. Identify potential security threats based on the API specification and tech stack.
8. Outline potential error scenarios and corresponding status codes.

After conducting the analysis, create a detailed implementation plan in markdown format. The plan should contain the following sections:

1. Endpoint Overview
2. Request Details
3. Response Details
4. Data Flow
5. Security Considerations
6. Error Handling
7. Performance
8. Implementation Steps

Throughout the plan, ensure that you:
- Use correct API status codes:
  - 200 for successful read
  - 201 for successful creation
  - 400 for invalid input
  - 401 for unauthorized access
  - 404 for not found resources
  - 500 for server-side errors
- Adapt to the provided tech stack
- Follow the provided implementation rules

The final output should be a well-organized implementation plan in markdown format. Here's an example of what the output should look like:

``markdown
# API Endpoint Implementation Plan: [Endpoint Name]

## 1. Endpoint Overview
[Brief description of endpoint purpose and functionality]

## 2. Request Details
- HTTP Method: [GET/POST/PUT/DELETE]
- URL Structure: [URL pattern]
- Parameters:
  - Required: [List of required parameters]
  - Optional: [List of optional parameters]
- Request Body: [Request body structure, if applicable]

## 3. Used Types
[DTOs and Command Models necessary for implementation]

## 3. Response Details
[Expected response structure and status codes]

## 4. Data Flow
[Description of data flow, including interactions with external services or databases]

## 5. Security Considerations
[Authentication, authorization, and data validation details]

## 6. Error Handling
[List of potential errors and how to handle them]

## 7. Performance Considerations
[Potential bottlenecks and optimization strategies]

## 8. Implementation Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]
...
```

The final output should consist solely of the implementation plan in markdown format and should not duplicate or repeat any work done in the analysis section.

Remember to save your implementation plan as .ai/view-implementation-plan.md. Ensure the plan is detailed, clear, and provides comprehensive guidance for the development team.