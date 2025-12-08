# Implementation: Disabled User Redirect to Account Disabled Page

## Overview
This implementation ensures that users with disabled accounts are automatically redirected to a dedicated "Account Disabled" page when they attempt to log in or access any protected routes. Disabled users cannot access any part of the application until a SuperAdmin enables their account.

## Problem Solved
When a new user is created, they are disabled by default and must wait for SuperAdmin approval. Previously, there was no user-friendly way to inform disabled users about their account status. This implementation provides:

1. **Clear communication** - Users understand why they can't access the application
2. **Account status checking** - Users can check if their account has been enabled
3. **Proper route protection** - Disabled users are blocked from all protected routes and API endpoints

## Changes Made

### 1. Frontend Types (`frontend/src/types.ts`)
- **Added** `isEnabled: boolean` field to `SessionInfo` type
- This field tracks whether a user's account is enabled or disabled

### 2. Session Utility (`frontend/src/lib/auth/session-utils.ts`) - NEW FILE
- **Created** `getUserSession()` function to fetch complete session info from backend
- Calls `GET /auth/session` endpoint with authorization token
- Returns `SessionInfo` including the `isEnabled` status

### 3. Role Utils (`frontend/src/lib/auth/role-utils.ts`)
- **Updated** `getDefaultRouteForUser()` to accept optional `SessionInfo` parameter
- **Added** check for disabled users - redirects to `/account-disabled` before role-based routing
- Ensures disabled users are always sent to the account disabled page

### 4. Account Disabled Page (`frontend/src/pages/account-disabled.astro`) - NEW FILE
- **Created** dedicated page for disabled users with:
  - Clear messaging about account pending activation
  - Explanation of what's happening and what to do
  - "Check Account Status" button to verify if account has been enabled
  - "Logout" button to sign out
  - Visual feedback with status messages
  - Auto-redirect when account becomes enabled

**Features:**
- ✅ User-friendly UI with icon and clear messaging
- ✅ Real-time account status checking via backend API
- ✅ Automatic redirect to home when account is enabled
- ✅ Logout functionality
- ✅ Loading states and error handling

### 5. Middleware (`frontend/src/middleware/index.ts`)
- **Added** import for `getUserSession` and `SessionInfo` type
- **Added** `isAccountDisabledRoute` check for `/account-disabled` path
- **Added** session info fetching for authenticated users
- **Added** redirect logic for disabled users (step 3)
- **Added** redirect logic to prevent enabled users from accessing `/account-disabled` (step 4)
- **Updated** API route protection to block disabled users from API access (step 5)
- **Updated** page route protection to allow access to `/account-disabled` (step 6)
- **Updated** all calls to `getDefaultRouteForUser()` to pass `sessionInfo` parameter

**Middleware Flow:**
1. Check if user is authenticated
2. Fetch session info (including `isEnabled` status) from backend
3. If user is disabled and trying to access protected route → redirect to `/account-disabled`
4. If user is enabled and trying to access `/account-disabled` → redirect to appropriate dashboard
5. Block disabled users from all API endpoints (403 Forbidden)
6. Continue with normal authentication and role-based routing

## How It Works

### For Disabled Users:
1. User logs in via magic link
2. Middleware fetches session info from backend
3. Backend returns `isEnabled: false`
4. Middleware redirects user to `/account-disabled`
5. User sees clear message about pending activation
6. User can click "Check Account Status" to verify if enabled
7. When SuperAdmin enables the account, status check will detect it
8. User is automatically redirected to appropriate dashboard

### For Enabled Users:
1. User logs in via magic link
2. Middleware fetches session info from backend
3. Backend returns `isEnabled: true`
4. Middleware allows normal role-based routing
5. User is redirected to their appropriate dashboard (`/dashboard`, `/admin`, etc.)

## Route Protection

### Disabled Users Can Access:
- `/login` - Login page
- `/account-disabled` - Account disabled page

### Disabled Users CANNOT Access:
- `/dashboard` - User dashboard
- `/admin` - Admin dashboard
- `/equipment` - Equipment pages
- Any `/api/*` endpoints (except `/api/auth/*`)
- Any other protected routes

## Backend Integration

The implementation relies on the backend `/auth/session` endpoint returning:
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "username": "username",
  "role": "user",
  "creditBalance": 0,
  "isEnabled": false,
  "expiresAt": "2025-12-06T20:00:00Z"
}
```

The backend middleware already blocks disabled users with 403 Forbidden, but this frontend implementation provides a better user experience.

## Testing

### Test Scenario 1: New Disabled User
1. Create a new user via login page
2. Click magic link to authenticate
3. Verify redirect to `/account-disabled`
4. Verify clear messaging is displayed
5. Click "Check Account Status" - should show "still pending"
6. Try to navigate to `/dashboard` - should redirect back to `/account-disabled`

### Test Scenario 2: Account Gets Enabled
1. While on `/account-disabled` page
2. Have SuperAdmin enable the account in database
3. Click "Check Account Status"
4. Verify success message appears
5. Verify automatic redirect to appropriate dashboard

### Test Scenario 3: Enabled User
1. Login as enabled user
2. Verify normal redirect to role-based dashboard
3. Try to navigate to `/account-disabled` - should redirect to dashboard

## Files Modified
- `frontend/src/types.ts`
- `frontend/src/lib/auth/role-utils.ts`
- `frontend/src/middleware/index.ts`

## Files Created
- `frontend/src/lib/auth/session-utils.ts`
- `frontend/src/pages/account-disabled.astro`

## Future Enhancements
- Add email notification when account is enabled
- Add estimated time for approval
- Add contact information for administrators
- Add automatic polling for account status (instead of manual refresh)
- Add analytics to track how long users wait for approval
