# Remove Service Role Key Usage Plan

## Objective

Minimize usage of `SUPABASE_SERVICE_ROLE_KEY` in the backend by migrating admin operations to RLS-policy-based authorization, while keeping the service key only for operations that absolutely require it.

---

## Strategy Overview

**Keep service role key for:**
- `AuthRepository.CreateUser` - Required by Supabase Admin API
- Test infrastructure (`testutils`, integration tests)

**Migrate to RLS policies:**
- Reservation operations (viewing all, bulk updates, dashboard stats)
- Equipment operations (availability checks across all reservations)
- User operations (bulk credit adjustments)

---

## Phase 1: Database Layer - Update RLS Policies

### 1.1 Reservations Table RLS

**Current Issue**: Service role bypasses RLS to allow admins to see/modify all reservations.

**Solution**: Update RLS policies to grant admin/super_admin roles full access.

```sql
-- Drop existing restrictive policies (if any)
DROP POLICY IF EXISTS "Users can view their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can modify pending reservations" ON public.reservations;

-- Create new policies with admin access
CREATE POLICY "Users can view their own reservations or admins see all"
ON public.reservations FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Users can modify their pending reservations or admins modify all"
ON public.reservations FOR UPDATE
USING (
  (auth.uid() = user_id AND status = 'PENDING')
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can insert any reservation"
ON public.reservations FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);
```

### 1.2 Equipment Table RLS

**Current Issue**: Equipment repository uses service key for availability checks.

**Solution**: Ensure admins can see all equipment regardless of status.

```sql
CREATE POLICY "All authenticated users can view equipment"
ON public.equipment FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can modify equipment"
ON public.equipment FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);
```

### 1.3 Profiles Table RLS

**Current Issue**: Bulk credit adjustments may need service role.

**Solution**: Allow admins to view/modify all profiles.

```sql
CREATE POLICY "Users can view their own profile or admins see all"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);
```

---

## Phase 2: Backend Code Changes

### 2.1 Reservation Repository

**File**: [reservation_repository.go](file:///e:/bystrze/Magazyn/backend/internal/repository/supabase/reservation_repository.go)

#### Changes:

1. **Remove `serviceRoleKey` field** from struct (L21)
2. **Update constructor** to not accept service role key (L25)
3. **Update methods** to remove service role client creation:
   - `GetReservations` (L39-44) - Remove bypass RLS logic, rely on RLS policies
   - `UpdateReservation` (L337-341) - Use auth client instead
   - `BulkUpdateStatusAtomic` (L398-402) - Use auth client instead
   - `BulkUpdateReservations` (L435-439) - Use auth client instead
   - `GetOverlappingReservations` (L455-459) - Use auth client instead
   - `GetDashboardStats` (L489-493) - Use auth client instead
   - `ModifyReservationDatesWithCredits` (L574-578) - Use auth client instead

#### Example Change:

```go
// BEFORE
func (r *reservationRepository) GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error) {
    client, err := supabase.NewClient(r.supabaseURL, r.serviceRoleKey, nil)
    if err != nil {
        return nil, types.NewInternalError("Failed to create service client", err)
    }
    // ... rest of implementation
}

// AFTER
func (r *reservationRepository) GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error) {
    client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
    // ... rest of implementation
    // RLS policies now allow admin to see all reservations
}
```

### 2.2 Equipment Repository

**File**: [equipment_repository.go](file:///e:/bystrze/Magazyn/backend/internal/repository/supabase/equipment_repository.go)

#### Changes:

1. **Remove `serviceKey` field** from struct (L20)
2. **Update constructor** to not accept service key (L23-31)
3. Remove any service role client usage (verify via search)

### 2.3 User Repository

**File**: [user_repository.go](file:///e:/bystrze/Magazyn/backend/internal/repository/supabase/user_repository.go)

#### Changes:

1. **Update `BulkAdjustCreditsAtomic`** (L176-179):
   - Verify it's using auth client (seems it already is)
   - Update comment to reflect RLS-based permissions

### 2.4 Auth Repository

**File**: [auth_repository.go](file:///e:/bystrze/Magazyn/backend/internal/repository/supabase/auth_repository.go)

#### Changes:

**KEEP AS IS** - `CreateUser` requires service role key for `AdminCreateUser` API.

### 2.5 Config & Main

**File**: [config.go](file:///e:/bystrze/Magazyn/backend/internal/config/config.go)

#### Changes:

1. **Keep `SupabaseServiceKey` field** (L18) - still needed for auth
2. **Keep env loading** (L53) - still needed for auth

**File**: [main.go](file:///e:/bystrze/Magazyn/backend/cmd/api/main.go)

#### Changes:

1. **Update repository initialization**:
   - `authRepo` - Keep service key parameter (L52)
   - `equipmentRepo` - Remove service key parameter (L53)
   - `reservationRepo` - Remove service key parameter (L56)

```go
// BEFORE
equipmentRepo := supabaserepo.NewEquipmentRepository(appState.SupabaseClient, appState.Config.SupabaseURL, appState.Config.SupabaseServiceKey)
reservationRepo := supabaserepo.NewReservationRepository(appState.SupabaseClient, appState.Config.SupabaseURL, appState.Config.SupabaseKey, appState.Config.SupabaseServiceKey)

// AFTER
equipmentRepo := supabaserepo.NewEquipmentRepository(appState.SupabaseClient, appState.Config.SupabaseURL)
reservationRepo := supabaserepo.NewReservationRepository(appState.SupabaseClient, appState.Config.SupabaseURL, appState.Config.SupabaseKey)
```

2. **Update warning message** (L45-48):

```go
// BEFORE
if appState.Config.SupabaseServiceKey == "" {
    logger.Warn(ctx, "⚠️ SUPABASE_SERVICE_ROLE_KEY is not set. Admin user creation will fail.")
} else {
    logger.Info(ctx, "✅ SUPABASE_SERVICE_ROLE_KEY loaded.")
}

// AFTER
if appState.Config.SupabaseServiceKey == "" {
    logger.Warn(ctx, "⚠️ SUPABASE_SERVICE_ROLE_KEY is not set. Admin user creation via API will fail.")
} else {
    logger.Info(ctx, "✅ SUPABASE_SERVICE_ROLE_KEY loaded for auth operations only.")
}
```

---

## Phase 3: Test Infrastructure

### 3.1 Test Utils

**File**: [testutils/config.go](file:///e:/bystrze/Magazyn/backend/internal/testutils/config.go)

**Keep AS IS** - Service role needed for creating/deleting test users.

### 3.2 Integration Tests

**Files**:
- [reservation_integration_test.go](file:///e:/bystrze/Magazyn/backend/internal/service/reservation/reservation_integration_test.go#L35)
- [auth_service_integration_test.go](file:///e:/bystrze/Magazyn/backend/internal/service/auth/auth_service_integration_test.go#L69)

**Keep AS IS** - Service role needed for test setup/cleanup.

---

## Phase 4: Documentation Updates

### 4.1 Architecture Documentation

**File**: [architecture.md](file:///e:/bystrze/Magazyn/backend/docs/architecture.md#L67-72)

Update section "Authentication Contexts" to reflect new usage:

```markdown
### Authentication Contexts: User Token vs Service Role Key

*   **User Token (RLS)**: For all standard operations and admin operations that access data. 
    We use the user's JWT (forwarded from the frontend) with the public/anon key. 
    Supabase's Row-Level Security (RLS) policies enforce authorization based on user role.
    *   **Usage**: All Repository methods (e.g., `GetProfile`, `CreateReservation`, admin dashboard queries).
    
*   **Service Role Key (Auth Admin Only)**: For privileged Supabase Auth API operations that cannot use RLS.
    *   **Usage**: `AuthRepository.CreateUser` (Admin User Creation via Supabase Auth Admin API), Test infrastructure.
    *   **Security**: This key is kept secret on the backend and never exposed to the client. 
        Used only for operations that have no RLS-based alternative.
```

### 4.2 Auth Documentation

**File**: [auth.md](file:///e:/bystrze/Magazyn/backend/docs/auth.md#L223-231)

Update section to clarify limited usage:

```markdown
### Service Role Key (Auth Admin Only)

The service role key is **only** used for:
- Creating users via Supabase Auth Admin API (`AdminCreateUser`)
- Test infrastructure (creating/deleting test users)

All other admin operations (viewing reservations, bulk updates, dashboard stats) use RLS policies 
that grant admin/super_admin roles appropriate permissions while still using the user's JWT token.

**Never expose to client** - This key bypasses all RLS policies when used.
```

---

## Verification Plan

### Step 1: Database Changes
```bash
# Connect to Supabase and apply RLS policy changes
# Manual verification via Supabase Dashboard > Authentication > Policies
```

### Step 2: Backend Changes
```bash
cd backend

# Run linter
golangci-lint run ./...

# Run unit tests
go test ./internal/... -v

# Run integration tests (requires test database)
go test ./internal/.../integration_test.go -v
```

### Step 3: Manual Testing

Test admin operations:
1. **Dashboard Stats** - Admin user views reservation dashboard
2. **Bulk Update** - Admin approves multiple pending reservations
3. **View All Reservations** - Admin filters by status/user
4. **User Creation** - Super admin creates new user account

### Step 4: Security Verification

Verify non-admin users CANNOT:
1. View other users' reservations (unless admin)
2. Modify approved/denied reservations
3. Access dashboard stats endpoint
4. Bulk update reservations

---

## Rollback Plan

If issues arise:
1. **Database**: Restore previous RLS policies from version control
2. **Backend**: Revert repository constructor changes
3. **Verify**: Run integration tests to confirm functionality restored

---

## Checklist

### Database
- [ ] Update reservations table RLS policies
- [ ] Update equipment table RLS policies  
- [ ] Update profiles table RLS policies
- [ ] Verify policies via Supabase Dashboard

### Backend Code
- [ ] Update `reservation_repository.go` - remove service key
- [ ] Update `equipment_repository.go` - remove service key
- [ ] Update `user_repository.go` - verify/update comments
- [ ] Update `main.go` - remove service key params
- [ ] Keep `auth_repository.go` - unchanged
- [ ] Keep `config.go` - unchanged

### Testing
- [ ] Run linter
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Manual admin operation testing
- [ ] Security testing (non-admin access)

### Documentation
- [ ] Update `architecture.md`
- [ ] Update `auth.md`
- [ ] Update `index.md` (if needed)

---

## Notes

- Service role key remains in `.env` for auth operations and tests
- RLS policies now provide admin authorization instead of bypassing security
- More secure: Admin operations audited via user token in request context
