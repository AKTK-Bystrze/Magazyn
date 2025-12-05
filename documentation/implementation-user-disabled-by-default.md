# Implementation Summary: User Creation with Disabled by Default

## Problem
The login page was failing to create new users with the error:
```
"Signups not allowed for otp"
```

This happened because `CreateUser: false` was set in the auth service, preventing new user registration via the login page.

## Solution
Implemented a system where:
1. New users can be created via the login page
2. New users are **disabled by default** (cannot access the application)
3. SuperAdmin must enable users before they can access the application

## Changes Made

### 1. Database Migration (`20251205200300_add_user_enabled_flag.sql`)
- Added `is_enabled` column to `profiles` table (default: `false`)
- Updated `handle_new_user()` trigger to create disabled users by default
- Added index on `is_enabled` for performance
- Existing users are set to enabled for backward compatibility

### 2. Backend Auth Service (`auth.service.go`)
- Changed `CreateUser: false` to `CreateUser: true` in the OTP request
- Added comments explaining that new users are disabled by default

### 3. Backend Types (`database.types.go`)
- Added `IsEnabled` field to `PublicProfilesSelect`
- Added `IsEnabled` field to `PublicProfilesInsert`
- Added `IsEnabled` field to `PublicProfilesUpdate`

### 4. Session Response (`auth.dto.go`)
- Added `IsEnabled` field to `SessionResponse`

### 5. Auth Middleware (`auth.middleware.go`)
- Added check for `is_enabled` status after user authentication
- Disabled users receive HTTP 403 Forbidden with message: "Account is disabled. Please contact an administrator."

## Next Steps

### Required Actions:
1. **Start Docker Desktop** (if not running)
2. **Apply the migration**:
   ```bash
   npx supabase db reset
   ```
   Or if you want to apply only the new migration:
   ```bash
   npx supabase migration up
   ```

3. **Restart the backend** (if running):
   - Stop the current `go run cmd/api/main.go` process
   - Start it again to pick up the type changes

### Testing the Implementation:
1. Try to create a new user via the login page
2. Check that the magic link is sent successfully
3. Click the magic link to authenticate
4. Verify that the user is created in the database with `is_enabled = false`
5. Try to access any protected endpoint - should receive 403 Forbidden
6. Have a SuperAdmin enable the user (this will be implemented in a future task)
7. After enabling, the user should be able to access the application

## Future Work
- Implement SuperAdmin user management view to enable/disable users
- Add UI feedback for disabled users on the frontend
- Consider adding email notification when user is enabled

## Files Modified
- `supabase/migrations/20251205200300_add_user_enabled_flag.sql` (new)
- `backend/internal/service/auth.service.go`
- `backend/internal/service/auth.dto.go`
- `backend/internal/types/database.types.go`
- `backend/internal/middleware/auth.middleware.go`
