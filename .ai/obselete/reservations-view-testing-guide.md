# Reservations View - Manual Testing Guide

## Prerequisites
1. Backend server running (`localhost:8080`)
2. Frontend dev server running (`npm run dev`)
3. Database seeded with equipment and users
4. At least one test user account
5. At least one admin account

## Test Scenarios

### 1. User View - Basic Access ✓

**Steps:**
1. Navigate to `/reservations` while **not logged in**
2. Verify redirect to login page with return URL
3. Log in as a regular user
4. Verify redirect back to `/reservations`
5. Verify page title: "My Reservations"
6. Verify "Browse Equipment" button is visible

**Expected:**
- Unauthenticated users redirected to login
- After login, user returns to reservations page
- Page loads without errors

---

### 2. User View - Empty State ✓

**Steps:**
1. Log in as a user with **no reservations**
2. Navigate to `/reservations`
3. Verify empty state message displays

**Expected:**
- Message: "No reservations yet"
- Suggestion to browse equipment
- No error messages

---

### 3. User View - List Display ✓

**Steps:**
1. Create 2-3 reservations for the logged-in user
2. Navigate to `/reservations`
3. Verify all reservations are displayed
4. Check each card shows:
   - Equipment name and type
   - Date range (dd.mm format)
   - Duration (X days)
   - Credit cost
   - Status badge (color-coded)

**Expected:**
- All user's reservations visible
- Data displayed correctly
- Responsive layout works

---

### 4. User View - Grouped Reservations ✓

**Steps:**
1. Create multiple reservations with **same start and end dates**
2. Navigate to `/reservations`
3. Verify reservations are grouped together
4. Click the group header to expand
5. Verify individual items show inside
6. Click again to collapse

**Expected:**
- Same-date reservations grouped
- Group shows: date range, total items, total cost, aggregate status
- Expand/collapse works smoothly
- Individual items visible when expanded

---

### 5. User View - Filtering ✓

**Steps:**
1. Ensure user has reservations with different statuses
2. Navigate to `/reservations`
3. Test each filter:
   - **Status**: All → Pending → Rented → Returned → Denied
   - **Sort**: Newest → Start Date ↑ → Start Date ↓
4. Verify list updates after each filter change
5. Click "Reset Filters" button
6. Verify filters return to defaults

**Expected:**
- Filters update URL search params
- List refreshes with filtered results
- Empty state shows "No reservations match your filters" when no results
- Reset button works correctly

---

### 6. User View - Pagination ✓

**Steps:**
1. Create more than 10 reservations for the user
2. Navigate to `/reservations`
3. Verify pagination controls appear
4. Click "Next" button
5. Verify page 2 loads
6. Click "Previous" button
7. Verify page 1 loads
8. Change filter and verify pagination resets to page 1

**Expected:**
- Pagination shows when > 10 items
- Next/Previous buttons work
- Current page indicator updates
- Buttons disabled at boundaries
- Filters reset pagination

---

### 7. User View - Cancel Single Reservation ✓

**Steps:**
1. Create a **PENDING** reservation
2. Navigate to `/reservations`
3. Click "Cancel" button on the reservation
4. Verify dialog opens with:
   - Equipment details
   - Refund information
   - Warning message
5. Click "Cancel Reservation" button
6. Verify success message appears
7. Verify reservation status changes to **DENIED**
8. Verify success message auto-dismisses after 5 seconds

**Expected:**
- Dialog shows correct information
- Cancellation processes successfully
- UI updates immediately (optimistic update)
- Success toast appears and dismisses
- Status badge changes to red "Denied"

---

### 8. User View - Cancel Grouped Reservations ✓

**Steps:**
1. Create multiple **PENDING** reservations with same dates
2. Navigate to `/reservations`
3. Expand the grouped reservation
4. Click "Cancel All" button
5. Verify all items are cancelled
6. Verify success message shows count

**Expected:**
- Bulk cancellation works
- All items in group change to DENIED
- Success message: "X reservations have been cancelled. Credits have been refunded."
- UI updates correctly

---

### 9. User View - Modify Reservation (Deferred) ⏸️

**Steps:**
1. Create a **PENDING** reservation
2. Click "Modify" button
3. Verify "coming soon" message appears

**Expected:**
- Error toast: "Modify functionality coming soon!"
- No crashes or errors

---

### 10. User View - View Details ✓

**Steps:**
1. Click "View Details" button on any reservation
2. Verify navigation to `/reservations/[id]`

**Expected:**
- URL changes to detail page
- (Detail page implementation is out of scope, may show 404)

---

### 11. User View - Success Message from Create ✓

**Steps:**
1. Create a new reservation via `/reservations/create`
2. After successful creation, verify redirect to `/reservations?success=true`
3. Verify green success alert appears at top
4. Verify message: "Success! Your reservation has been created successfully."

**Expected:**
- Success parameter in URL
- Green alert banner visible
- Message displays correctly
- Alert auto-dismisses after 5 seconds

---

### 12. Admin View - Access Control ✓

**Steps:**
1. Log in as a **regular user** (not admin)
2. Navigate to `/admin/reservations`
3. Verify redirect to dashboard
4. Log out
5. Log in as an **admin** user
6. Navigate to `/admin/reservations`
7. Verify page loads successfully

**Expected:**
- Non-admin users redirected to dashboard
- Admin users can access the page
- Page title: "Reservations Manager"
- Subtitle: "View and manage all reservations across the system"

---

### 13. Admin View - See All Reservations ✓

**Steps:**
1. Create reservations for multiple different users
2. Log in as admin
3. Navigate to `/admin/reservations`
4. Verify all reservations from all users are visible

**Expected:**
- Admin sees ALL reservations (not just their own)
- RLS bypassed via service role or admin permissions
- User information visible for each reservation

---

### 14. Admin View - Filtering and Sorting ✓

**Steps:**
1. As admin, navigate to `/admin/reservations`
2. Test all filters (same as user view)
3. Verify filtering works across all users' reservations

**Expected:**
- Filters work identically to user view
- Results include all users' data

---

### 15. Row Level Security (RLS) Verification ✓

**Steps:**
1. Create reservation for User A
2. Log in as User B
3. Navigate to `/reservations`
4. Verify User B **cannot** see User A's reservation
5. Log in as Admin
6. Navigate to `/admin/reservations`
7. Verify Admin **can** see both users' reservations

**Expected:**
- Users can only see their own reservations
- Admins can see all reservations
- No unauthorized data access

---

### 16. Error Handling ✓

**Steps:**
1. Disconnect backend server
2. Navigate to `/reservations`
3. Verify error message appears
4. Reconnect backend
5. Click "Reset Filters" or refresh
6. Verify data loads successfully

**Expected:**
- Network error shows red alert
- Error message: "An error occurred"
- Recovery works after reconnection

---

### 17. Responsive Design ✓

**Steps:**
1. Open `/reservations` on desktop (1920px)
2. Verify layout looks good
3. Resize to tablet (768px)
4. Verify layout adapts
5. Resize to mobile (375px)
6. Verify cards stack vertically
7. Verify all buttons and actions accessible

**Expected:**
- Desktop: Multi-column grid
- Tablet: 2-column grid
- Mobile: Single column
- No horizontal scrolling
- Touch targets large enough

---

### 18. Performance ✓

**Steps:**
1. Create 50+ reservations
2. Navigate to `/reservations`
3. Measure initial load time
4. Change filters multiple times
5. Verify no lag or freezing
6. Check browser DevTools Network tab

**Expected:**
- Initial load < 2 seconds
- Filter changes instant (cached)
- API calls debounced/cached
- No unnecessary re-renders

---

## Regression Testing

### Existing Features
- [ ] Equipment browsing still works
- [ ] Reservation cart still works
- [ ] Login/logout still works
- [ ] Admin dashboard still works
- [ ] Other admin pages still work

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Accessibility

- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces status changes
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Alt text on icons (if applicable)

---

## Notes

- **Modify functionality** is intentionally disabled (Phase 5)
- **Bulk admin actions** (Mark Rented/Returned) are not yet implemented
- **Details page** (`/reservations/[id]`) is not yet implemented
- All deferred features show appropriate "coming soon" messages

---

## Bug Report Template

If you find issues, report with:
- **URL**: 
- **User Role**: (user/admin)
- **Steps to Reproduce**:
- **Expected Behavior**:
- **Actual Behavior**:
- **Browser/Device**:
- **Screenshots** (if applicable):
- **Console Errors** (if any):
