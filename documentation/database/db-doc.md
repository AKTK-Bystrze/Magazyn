# Database Documentation

This document reflects the current state of the database schema as of the latest migrations.

## Enums

### user_role
- `user`
- `admin`
- `super_admin`

### reservation_status
- `PENDING`
- `RENTED`
- `RETURNED`
- `DENIED`
- `CANCELLED`

### equipment_status
- `ok`
- `broken`
- `blocked`

### credit_request_status
- `awaiting`
- `approved`
- `rejected`
- `approved with changes`

### credit_transaction_reason
- `reservation_charge`
- `reservation_refund`
- `reservation_adjustment`
- `admin_adjustment`
- `work_credit`

---

## Tables

### profiles
Public profile table extending `auth.users`.
- `id` (uuid, pk, foreign key to auth.users)
- `email` (text)
- `username` (text, unique)
- `role` (user_role, default: 'user')
- `credit_balance` (integer, default: 0)
- `is_enabled` (boolean, default: false) - *Controls if user can access the app (must be enabled by SuperAdmin)*
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### equipment_types
Categories of equipment.
- `id` (uuid, pk)
- `name` (text, unique)
- `credit_cost_per_day` (integer)
- `created_at` (timestamptz)

### equipment
Individual physical items.
- `id` (uuid, pk)
- `internal_id` (text)
- `type_id` (uuid, foreign key to equipment_types)
- `name` (text)
- `description` (text)
- `status` (equipment_status, default: 'ok')
- `image_path` (text)
- `is_archived` (boolean, default: false)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- Unique constraint on `(type_id, internal_id)`

### reservations
Booking records.
- `id` (uuid, pk)
- `user_id` (uuid, foreign key to profiles)
- `equipment_id` (uuid, foreign key to equipment)
- `start_date` (date)
- `end_date` (date)
- `status` (reservation_status, default: 'PENDING')
- `is_free` (boolean, not null, default: false) - *Indicates whether the reservation is free of credit cost*
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- Constraint: `end_date >= start_date`
- Exclusion constraint to prevent overlapping bookings for the same equipment.

### credit_history
Immutable ledger of credit transactions.
- `id` (uuid, pk)
- `user_id` (uuid, foreign key to profiles)
- `amount` (integer)
- `reason` (credit_transaction_reason)
- `description` (text)
- `reservation_id` (uuid, foreign key to reservations, nullable)
- `author_id` (uuid, foreign key to profiles, nullable)
- `created_at` (timestamptz)

### credit_requests
Requests submitted by users to earn credits for club service or helping others.
- `id` (uuid, pk)
- `title` (varchar(255), not null)
- `description` (text)
- `credits_value` (integer, not null, check: credits_value > 0)
- `requestor_id` (uuid, foreign key to profiles)
- `user_helped_id` (uuid, foreign key to profiles, nullable)
- `status` (varchar(50), not null, default: 'awaiting', check: in 'awaiting', 'approved', 'rejected', 'approved with changes')
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### credit_request_helpers
Junction table linking credit requests with multiple helper users who participated in the task.
- `credit_request_id` (uuid, foreign key to credit_requests on delete cascade)
- `user_id` (uuid, foreign key to profiles on delete set null)
- Primary Key: `(credit_request_id, user_id)`

### maintenance_logs
Audit trail for equipment status changes.
- `id` (uuid, pk)
- `equipment_id` (uuid, foreign key to equipment)
- `previous_status` (equipment_status)
- `new_status` (equipment_status)
- `notes` (text)
- `admin_id` (uuid, foreign key to profiles, nullable)
- `created_at` (timestamptz)

### reservation_history
Audit trail for reservation changes.
- `id` (uuid, pk)
- `reservation_id` (uuid, foreign key to reservations)
- `user_id` (uuid, foreign key to profiles)
- `equipment_id` (uuid, foreign key to equipment)
- `start_date` (date)
- `end_date` (date)
- `status` (reservation_status)
- `changed_by_user_id` (uuid, foreign key to profiles, nullable)
- `created_at` (timestamptz)

---

## Views

### analytics_equipment_stats
Calculated statistics for equipment.
- `equipment_id`
- `equipment_name`
- `total_reservations`
- `total_days_rented`
- `utilization_rate`

### analytics_user_stats
Calculated statistics for users.
- `user_id`
- `username`
- `total_reservations`
- `total_credits_spent`
- `last_reservation_date`

---

## RPC Functions (Stored Procedures)

### create_reservation_atomic
Creates reservations and deducts credits in a single atomic transaction.
- **Parameters**: 
  - `p_user_id` (UUID)
  - `p_total_cost` (INTEGER)
  - `p_is_free` (BOOLEAN)
  - `p_created_by_user_id` (UUID)
  - `p_reservations` (JSONB array of objects: `{equipment_id, start_date, end_date}`)
- **Returns**: JSONB (`{reservation_ids: UUID[], new_balance: INTEGER}`)

### modify_reservation_dates_with_credits
Modifies reservation date ranges, checks conflicts, and atomically recalculates/adjusts user credit balance (bypassing adjustments for free reservations).
- **Parameters**:
  - `p_reservation_id` (UUID)
  - `p_changed_by_user_id` (UUID)
  - `p_new_start_date` (DATE)
  - `p_new_end_date` (DATE)
- **Returns**: JSONB (updated reservation details and new balance)

### bulk_update_reservations_status
Updates multiple reservation statuses atomically, refunding credits if reservations are denied (skipping refunds for free reservations).
- **Parameters**:
  - `p_reservation_ids` (UUID[])
  - `p_status` (TEXT)
  - `p_admin_id` (UUID)
- **Returns**: JSONB (`{updated_count: INTEGER, skipped_ids: UUID[]}`)

### refund_reservation_credits
Refunds credits to a user and logs the transaction.
- **Parameters**:
  - `p_reservation_id` (UUID)
  - `p_amount` (INTEGER)
- **Returns**: void

---

## Row Level Security (RLS) & Policies
RLS is enabled on all tables. Policies generally follow:
- `select`: Public for equipment/types. Users see their own personal data. Admins/SuperAdmins see all.
- `insert/update/delete`: Restricted to Admins/SuperAdmins for most resources. Users can manage their own requests/reservations within limits (e.g., PENDING only).

**Note**: Infinite recursion in Admin policies was fixed by using a `security definer` function `get_user_role()` to check roles.

---

## Triggers & Automation
- `handle_new_user` (split into `set_user_role_metadata` and `create_user_profile`): Sets default role to 'user' and creates a disabled profile upon signup.
- `update_updated_at`: Automatically updates `updated_at` timestamp.
- `log_equipment_status_change`: Logs changes to `maintenance_logs`.
- `log_reservation_changes`: Logs changes to `reservation_history`.
