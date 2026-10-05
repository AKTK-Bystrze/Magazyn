# Database Schema Plan

This document outlines the database schema for the Equipment Rental System, designed for PostgreSQL on Supabase.

## 1. Enums

Custom enumerated types to ensure data consistency.

- **user_role**:
  - `user`
  - `admin`
  - `super_admin`
- **reservation_status**:
  - `PENDING`
  - `RENTED`
  - `RETURNED`
  - `DENIED`
- **equipment_status**:
  - `ok`
  - `broken`
- **credit_request_status**:
  - `PENDING`
  - `APPROVED`
  - `DENIED`
- **credit_transaction_reason**:
  - `reservation_charge`
  - `reservation_refund`
  - `reservation_adjustment`
  - `admin_adjustment`
  - `work_credit`

## 2. Tables

### `profiles`

Public profile table extending `auth.users`.
_Note: Referred to as "users" in requirements, but named `profiles` to avoid collision with reserved keywords and `auth.users`._

| Column           | Data Type     | Constraints                  | Description                          |
| ---------------- | ------------- | ---------------------------- | ------------------------------------ |
| `id`             | `uuid`        | `PK`, `FK -> auth.users.id`  | Links to Supabase Auth               |
| `email`          | `text`        | `NOT NULL`                   | Copied from auth for easier querying |
| `username`       | `text`        | `UNIQUE`, `NOT NULL`         | Display name                         |
| `role`           | `user_role`   | `NOT NULL`, `DEFAULT 'user'` | Authorization level                  |
| `credit_balance` | `integer`     | `NOT NULL`, `DEFAULT 0`      | Current credits                      |
| `is_enabled`     | `boolean`     | `NOT NULL`, `DEFAULT false`  | Controls user access to application  |
| `created_at`     | `timestamptz` | `NOT NULL`, `DEFAULT now()`  |                                      |
| `updated_at`     | `timestamptz` |                              |                                      |

### `equipment_types`

Categories of equipment with standardized pricing.

| Column                | Data Type     | Constraints                       | Description             |
| --------------------- | ------------- | --------------------------------- | ----------------------- |
| `id`                  | `uuid`        | `PK`, `DEFAULT gen_random_uuid()` |                         |
| `name`                | `text`        | `UNIQUE`, `NOT NULL`              | e.g., "Kayak", "Paddle" |
| `credit_cost_per_day` | `integer`     | `NOT NULL`, `CHECK (value >= 0)`  | Base cost for this type |
| `created_at`          | `timestamptz` | `NOT NULL`, `DEFAULT now()`       |                         |

### `equipment`

Individual physical items available for rent.

| Column        | Data Type          | Constraints                            | Description            |
| ------------- | ------------------ | -------------------------------------- | ---------------------- |
| `id`          | `uuid`             | `PK`, `DEFAULT gen_random_uuid()`      |                        |
| `internal_id` | `text`             | `NOT NULL`                             | e.g., "K-01", "P-10"   |
| `type_id`     | `uuid`             | `FK -> equipment_types.id`, `NOT NULL` |                        |
| `name`        | `text`             |                                        | Optional nickname      |
| `description` | `text`             |                                        |                        |
| `status`      | `equipment_status` | `NOT NULL`, `DEFAULT 'ok'`             | Current physical state |
| `image_path`  | `text`             |                                        | Path in storage bucket |
| `is_archived` | `boolean`          | `NOT NULL`, `DEFAULT false`            | Soft delete flag       |
| `created_at`  | `timestamptz`      | `NOT NULL`, `DEFAULT now()`            |                        |
| `updated_at`  | `timestamptz`      |                                        |                        |

**Constraints:**

- `UNIQUE (type_id, internal_id)`: Ensures internal IDs are unique within a specific equipment type.

### `reservations`

Booking records linking users to equipment for specific dates.

| Column         | Data Type            | Constraints                       | Description          |
| -------------- | -------------------- | --------------------------------- | -------------------- |
| `id`           | `uuid`               | `PK`, `DEFAULT gen_random_uuid()` |                      |
| `user_id`      | `uuid`               | `FK -> profiles.id`, `NOT NULL`   | `ON DELETE RESTRICT` |
| `equipment_id` | `uuid`               | `FK -> equipment.id`, `NOT NULL`  | `ON DELETE RESTRICT` |
| `start_date`   | `date`               | `NOT NULL`                        |                      |
| `end_date`     | `date`               | `NOT NULL`                        |                      |
| `status`       | `reservation_status` | `NOT NULL`, `DEFAULT 'PENDING'`   |                      |
| `created_at`   | `timestamptz`        | `NOT NULL`, `DEFAULT now()`       |                      |
| `updated_at`   | `timestamptz`        |                                   |                      |

**Constraints:**

- `CHECK (end_date >= start_date)`
- **Exclusion Constraint**: Prevent overlapping bookings for the same equipment.
  - `EXCLUDE USING gist (equipment_id WITH =, daterange(start_date, end_date, '[]') WITH &&)`
  - _Note: Requires `btree_gist` extension._

### `credit_history`

Immutable ledger of all credit transactions.

| Column           | Data Type                   | Constraints                       | Description                         |
| ---------------- | --------------------------- | --------------------------------- | ----------------------------------- |
| `id`             | `uuid`                      | `PK`, `DEFAULT gen_random_uuid()` |                                     |
| `user_id`        | `uuid`                      | `FK -> profiles.id`, `NOT NULL`   | Owner of the credits                |
| `amount`         | `integer`                   | `NOT NULL`                        | Positive or negative change         |
| `reason`         | `credit_transaction_reason` | `NOT NULL`                        | Type of transaction                 |
| `description`    | `text`                      |                                   | Human readable detail               |
| `reservation_id` | `uuid`                      | `FK -> reservations.id`           | Optional link to reservation        |
| `admin_id`       | `uuid`                      | `FK -> profiles.id`               | Admin who performed action (if any) |
| `created_at`     | `timestamptz`               | `NOT NULL`, `DEFAULT now()`       |                                     |

### `credit_requests`

Requests for credits (e.g., for volunteer work) requiring approval.

| Column        | Data Type               | Constraints                       | Description       |
| ------------- | ----------------------- | --------------------------------- | ----------------- |
| `id`          | `uuid`                  | `PK`, `DEFAULT gen_random_uuid()` |                   |
| `user_id`     | `uuid`                  | `FK -> profiles.id`, `NOT NULL`   | Requester         |
| `amount`      | `integer`               | `NOT NULL`, `CHECK (value > 0)`   | Requested amount  |
| `description` | `text`                  | `NOT NULL`                        | Work description  |
| `status`      | `credit_request_status` | `NOT NULL`, `DEFAULT 'PENDING'`   |                   |
| `admin_id`    | `uuid`                  | `FK -> profiles.id`               | Approver/Denier   |
| `admin_note`  | `text`                  |                                   | Optional feedback |
| `created_at`  | `timestamptz`           | `NOT NULL`, `DEFAULT now()`       |                   |
| `updated_at`  | `timestamptz`           |                                   |                   |

### `maintenance_logs`

Audit trail for equipment status changes.

| Column            | Data Type          | Constraints                       | Description                          |
| ----------------- | ------------------ | --------------------------------- | ------------------------------------ |
| `id`              | `uuid`             | `PK`, `DEFAULT gen_random_uuid()` |                                      |
| `equipment_id`    | `uuid`             | `FK -> equipment.id`, `NOT NULL`  |                                      |
| `previous_status` | `equipment_status` |                                   | Status before change                 |
| `new_status`      | `equipment_status` | `NOT NULL`                        | Status after change                  |
| `notes`           | `text`             |                                   | Maintenance details                  |
| `admin_id`        | `uuid`             | `FK -> profiles.id`               | Who logged it (optional via trigger) |
| `created_at`      | `timestamptz`      | `NOT NULL`, `DEFAULT now()`       |                                      |

### `reservation_history`

Audit trail for all reservation changes (insert-only, immutable).

| Column               | Data Type            | Constraints                         | Description                     |
| -------------------- | -------------------- | ----------------------------------- | ------------------------------- |
| `id`                 | `uuid`               | `PK`, `DEFAULT gen_random_uuid()`   |                                 |
| `reservation_id`     | `uuid`               | `FK -> reservations.id`, `NOT NULL` | Link to reservation             |
| `user_id`            | `uuid`               | `FK -> profiles.id`, `NOT NULL`     | Snapshot of reservation owner   |
| `equipment_id`       | `uuid`               | `FK -> equipment.id`, `NOT NULL`    | Snapshot of equipment           |
| `start_date`         | `date`               | `NOT NULL`                          | Snapshot of start date          |
| `end_date`           | `date`               | `NOT NULL`                          | Snapshot of end date            |
| `status`             | `reservation_status` | `NOT NULL`                          | Snapshot of status              |
| `changed_by_user_id` | `uuid`               | `FK -> profiles.id`                 | User/admin who made this change |
| `created_at`         | `timestamptz`        | `NOT NULL`, `DEFAULT now()`         | When this change occurred       |

## 3. Views

Database views to simplify analytics and reporting.

### `analytics_equipment_stats`

Aggregates usage statistics per equipment item.

- Columns: `equipment_id`, `equipment_name`, `total_reservations`, `total_days_rented`, `utilization_rate` (days rented / days available).

### `analytics_user_stats`

Aggregates user activity.

- Columns: `user_id`, `username`, `total_reservations`, `total_credits_spent`, `last_reservation_date`.

## 4. Relationships Summary

- **Users & Auth**: 1:1 mapping between `auth.users` and `public.profiles`.
- **Equipment & Types**: Many-to-One (`equipment` -> `equipment_types`).
- **Reservations**:
  - Many-to-One -> `profiles` (renter). `ON DELETE RESTRICT`.
  - Many-to-One -> `equipment` (item). `ON DELETE RESTRICT`.
- **Credits**:
  - `credit_history` -> `profiles` (owner).
  - `credit_history` -> `reservations` (optional source).
  - `credit_requests` -> `profiles` (requester).
- **Maintenance**: `maintenance_logs` -> `equipment`.
- **Reservation Audit**: `reservation_history` -> `reservations` (audit trail).

## 5. Indexes

To optimize performance for common query patterns:

1.  **Reservations**:
    - `gist (equipment_id, daterange(start_date, end_date, '[]'))` (Constraint & Index)
    - `(user_id, start_date)` (For "My Reservations")
    - `(equipment_id, start_date)` (For availability calendars)
    - `(status)` (For admin filtering)

2.  **Equipment**:
    - `(type_id, internal_id)` (Unique constraint lookup)
    - `(status)` (Filtering available items)

3.  **Profiles**:
    - `(username)` (Search/Lookup)
    - `(email)` (Search/Lookup)

4.  **Analytics / Favorites**:
    - `reservations(user_id, equipment_id)` (To quickly calculate user's favorite items)

5.  **Reservation History**:
    - `(reservation_id, created_at)` (For timeline queries ordered by timestamp)

## 6. Row Level Security (RLS) Policies

### `profiles`

- **Select**: Users can see their own profile. Admins/SuperAdmins can see all.
- **Update**: Admins/SuperAdmins can update any profile. Users cannot update their own (per PRD).

### `equipment`

- **Select**: Public (or Authenticated) access.
- **Insert/Update/Delete**: Admins/SuperAdmins only.

### `reservations`

- **Select**: Users can see their own. Admins/SuperAdmins can see all.
- **Insert**: Users can insert for themselves. Admins can insert for any user.
- **Update**:
  - Users can update their own if status is `PENDING` (e.g., cancel/modify dates).
  - Admins can update any.

### `credit_history`

- **Select**: Users can see their own. Admins/SuperAdmins can see all.
- **Insert**: System/Admin only (via backend logic or triggers).

### `credit_requests`

- **Select**: Users can see their own. Admins/SuperAdmins can see all.
- **Insert**: Users can create requests.
- **Update**: SuperAdmins only (approve/deny).

### `reservation_history`

- **Select**: Users can see audit records for their own reservations. Admins/SuperAdmins can see all.
- **Insert**: System via trigger or Admins for manual adjustments.
- **Update/Delete**: Not allowed (insert-only, immutable audit trail).

## 7. Database Triggers & Functions

1.  **`handle_new_user`**: Trigger on `auth.users` insert to automatically create a row in `public.profiles`.
2.  **`log_maintenance_change`**: Trigger on `equipment` update. If `status` changes, insert row into `maintenance_logs`.
3.  **`log_reservation_change`**: Trigger on `reservations` insert or update. Logs complete snapshot of reservation state to `reservation_history` with change author.
4.  **`update_updated_at`**: Standard trigger to update `updated_at` timestamp on modification.

## 8. Notes

- **Extensions**: `btree_gist` is required for the exclusion constraint on reservations.
- **Realtime**: Enable Supabase Realtime for `reservations` and `equipment` tables to support live updates on the frontend.
- **Soft Delete**: `equipment` uses `is_archived`. Queries should filter `WHERE is_archived = false` by default.
- **Date Handling**: `start_date` and `end_date` are strictly `DATE` types to avoid timezone complexity for daily rentals.
