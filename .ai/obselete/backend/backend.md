Backend Implementation Plan (Go + Supabase)

This document outlines the implementation plan for the backend of the Equipment Rental System. It consolidates requirements from the PRD, Database Plan, and API Plan, specifically focusing on the Go API and PostgreSQL logic.

Technology Stack:

Language: Go (Golang)

Database: PostgreSQL (Hosted on Supabase)

Auth: Supabase Auth (JWT Verification in Go)

Email: Gmail SMTP

Container: Docker (Alpine/Distroless)

🏗 Phase 1: Foundation, Database & Auth

Goal: Set up the infrastructure, database schema, and secure the API entry points.

1.1 Database Initialization (Supabase)

[ ] Extensions: Enable btree_gist (Required for reservation exclusion constraints).

[ ] Enums: Create user_role, reservation_status, equipment_status, credit_request_status, credit_transaction_reason.

[ ] Tables: Create tables in this order (to handle Foreign Keys):

profiles (Links to auth.users)

equipment_types

equipment

reservations

credit_history

credit_requests

maintenance_logs

reservation_history

[ ] Triggers:

handle_new_user: Insert into public.profiles on auth.users creation.

update_updated_at: Standard timestamp updater.

log_reservation_change: Insert into reservation_history on reservation modification.

log_maintenance_change: Insert into maintenance_logs on equipment status change.

[ ] RLS Policies: Apply policies defined in db-plan.md (even though Go uses Service Key, RLS provides defense-in-depth).

1.2 Go Project Setup

[ ] Initialize Go Module.

[ ] Set up Project Structure (e.g., cmd/api, internal/data, internal/mailer, internal/validator).

[ ] Configure Environment Variables (DB_DSN, SUPABASE_URL, SUPABASE_JWT_SECRET, SMTP_CREDS).

[ ] Docker Setup: Create Dockerfile (Multi-stage build: Build in Go image -> Run in Alpine/Scratch).

1.3 Authentication Middleware

[ ] Implement JWT Middleware:

Intercepts requests.

Validates Bearer token against Supabase Secret.

Extracts user_id (UUID) and email.

Context injection: Store User ID in request context.

[ ] Implement Role Middleware:

Checks profiles table for user role (user, admin, super_admin) after JWT validation.

[ ] Endpoint: GET /auth/session (Returns current user profile + credit balance).

📦 Phase 2: Core Resources (Equipment & Users)

Goal: Implement CRUD operations for static data and user management.

2.1 Equipment Types

[ ] Endpoint: GET /equipment-types (Public/Auth).

[ ] Endpoint: POST /equipment-types (Admin only).

[ ] Logic: Standard CRUD.

2.2 Equipment Inventory

[ ] Endpoint: GET /equipment

Logic: Filter by type_id, status.

Logic: Favorites Algorithm: Sort top 3 items per type based on user's specific rental history, then alphabetical.

Logic: Exclude is_archived unless requested by Admin.

[ ] Endpoint: GET /equipment/:id (Include maintenance_logs).

[ ] Endpoint: POST /equipment (Admin only).

Validation: Unique internal_id per type.

[ ] Endpoint: PATCH /equipment/:id (Admin only).

Trigger: Status change to 'broken' automatically fires DB trigger for log, but API should accept optional notes.

[ ] Endpoint: DELETE /equipment/:id (Admin only).

Logic: Soft delete (is_archived = true). Fail if active reservations exist.

2.3 User Management

[ ] Endpoint: GET /users/me (Own profile).

[ ] Endpoint: GET /users (Admin: List all).

[ ] Endpoint: POST /users (SuperAdmin: Create user).

Logic: This creates an entry in profiles. Note: Actual auth user creation usually happens in Supabase Auth. If this endpoint is meant to create the Auth User + Profile, Go must call Supabase Admin API.

[ ] Endpoint: PATCH /users/:id (SuperAdmin: Update role/credits).

Logic: If credits change, insert record into credit_history (Reason: admin_adjustment).

📅 Phase 3: The Reservation Engine (Complex)

Goal: Handle the core business logic: availability, credit transactions, and booking.

3.1 Availability Logic

[ ] Endpoint: GET /equipment/:id/availability

Logic: Check overlaps.

Query: EXCLUDE constraint simulation or direct lookup against reservations where range overlaps.

3.2 Create Reservation (Transactional)

[ ] Endpoint: POST /reservations

[ ] Validation:

Start Date > Now.

End Date >= Start Date.

Equipment is ok and not archived.

[ ] Business Logic (Atomic Transaction):

Calculate Cost: (End - Start + 1) \* Rate.

Check Balance: User.balance >= Cost.

Insert Reservation: Attempt insert. DB Constraint EXCLUDE USING gist will fail here if dates overlap. Handle 409 Conflict.

Deduct Credits: Update profiles.credit_balance.

Log Transaction: Insert into credit_history (Reason: reservation_charge).

Audit: reservation_history (Handled by DB Trigger).

[ ] Post-Transaction:

Email: Send confirmation email via SMTP (Async/Goroutine).

3.3 Read Reservations

[ ] Endpoint: GET /reservations (User: Own, Admin: All).

Filters: Status, Date Range.

[ ] Endpoint: GET /reservations/:id (Include Audit Trail).

🔄 Phase 4: Reservation Lifecycle & Credits

Goal: Manage changes to bookings and the resulting credit impacts.

4.1 Modification & Cancellation

[ ] Endpoint: PATCH /reservations/:id

[ ] Logic (User - PENDING only):

Cancel: Set status DENIED. Refund full credits (reservation_refund).

Modify Dates:

Check availability for new dates.

Calc new cost.

Diff = New - Old.

If Diff > 0 (Charge): Check balance, Deduct.

If Diff < 0 (Refund): Refund to balance.

Warning: If extension > 50% or > 3 days, flag in response (Frontend handles UI warning, Backend enforces cost).

[ ] Logic (Admin):

Pickup: Set RENTED.

Return: Set RETURNED.

Bulk Update: PATCH /reservations/bulk.

4.2 Credit System

[ ] Endpoint: GET /credit-history (User: Own, Admin: All).

[ ] Endpoint: POST /credit-requests (User requests work credits).

[ ] Endpoint: PATCH /credit-requests/:id (SuperAdmin only).

Logic: If APPROVED, add credits to profile, Log credit_history (Reason: work_credit).

📊 Phase 5: Admin Tools & Analytics

Goal: Dashboards and maintenance tools.

5.1 Maintenance

[ ] Endpoint: GET /equipment/:id/maintenance-logs.

[ ] Endpoint: POST /equipment/:id/maintenance-logs.

5.2 Dashboard & Analytics

[ ] Endpoint: GET /reservations/dashboard

Logic: Aggregations. Count PENDING, Overdue (End Date < Today AND Status != RETURNED).

[ ] Endpoint: GET /calendar/availability

Logic: Return array of status for requested range (Month view).

[ ] Endpoint: GET /analytics/equipment-stats

Logic: Aggregation query (Group by Equipment).

[ ] Endpoint: GET /analytics/user-stats

Logic: Aggregation query (Group by User).

🛠 Technical Reference

Database Schema (Backend View)

Users: id (UUID), role (enum), credit_balance (int).

Equipment: id (UUID), internal_id (Unique/Type), status (Enum).

Reservations: id, user_id, equipment_id, start (Date), end (Date), range (Daterange - computed), status.

Credit Calculation Rules

Rates: Kayak (4), Paddle (2), Others (Configurable).

Formula: Days = EndDate - StartDate + 1.

Cost: Days \* Rate.

Dockerfile Requirements

The Go container must be optimized for size and security.

# Build Stage

FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/api

# Run Stage

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/main /

# Copy templates/assets if any

CMD ["/main"]
