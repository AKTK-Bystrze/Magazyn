# All Reservations View Implementation Plan

Enable all users to view both their own reservations and all reservations in the system, with role-based modification permissions. This extends the existing reservation views without duplicating components.

## Requirements Summary

| Feature | User | Admin |
|---------|------|-------|
| View own reservations | ✅ | ✅ |
| View all reservations | ✅ (read-only) | ✅ |
| Modify own reservations | ✅ (cancel, dates, status) | ✅ |
| Modify others' reservations | ❌ | ✅ (cancel, dates, status) |
| Highlighted own reservations | ✅ (in "All" view) | ✅ (in "All" view) |

## User Review Required

> [!IMPORTANT]
> **Backend Permission Change**: Currently, non-admin users are restricted to only see their own reservations (enforced at line 63-65 in `reservation_handler.go`). This change will remove that restriction, allowing all authenticated users to list all reservations when `scope=all` is passed.

---

## Proposed Changes

### Backend Changes

#### [MODIFY] [reservation_handler.go](file:///e:/bystrze/Magazyn/backend/internal/handler/reservation/reservation_handler.go)

Add `scope` query parameter support:

```diff
 func (h *ReservationHandler) HandleList(w http.ResponseWriter, r *http.Request) {
     // ... existing code ...
     
+    // New: Check scope parameter
+    scope := r.URL.Query().Get("scope")
+    
-    // Enforce non-admin can only see own
-    if role != auth.RoleAdmin && role != auth.RoleSuperAdmin {
-        query.UserID = &userID
-    }
+    // Apply ownership filter based on scope
+    if scope == "my" || scope == "" {
+        // Default: user sees own reservations
+        query.UserID = &userID
+    }
+    // scope="all" → no UserID filter, show all reservations
 }
```

---

### Frontend Changes

#### [MODIFY] [reservation.types.ts](file:///e:/bystrze/Magazyn/frontend/src/types/reservations/reservation.types.ts#L177-L183)

Add `scope` to filter state:

```diff
 export type ReservationFilterState = {
   page: number;
   perPage: number;
   status: Enums<"reservation_status"> | "ALL";
   sort: ReservationSortOption;
   query?: string;
+  scope: "my" | "all";
 };
```

---

#### [MODIFY] [useReservations.ts](file:///e:/bystrze/Magazyn/frontend/src/hooks/useReservations.ts)

Update default filters and API call:

```diff
 const DEFAULT_FILTERS: ReservationFilterState = {
   page: DEFAULT_PAGE,
   perPage: DEFAULT_PAGE_SIZE,
   status: DEFAULT_STATUS_FILTER,
   sort: DEFAULT_SORT_OPTION,
+  scope: "my",
 };
```

---

#### [MODIFY] [reservations-api.ts](file:///e:/bystrze/Magazyn/frontend/src/lib/api/reservations-api.ts#L29-L48)

Pass scope to backend:

```diff
   list: async (filters: Partial<ReservationFilterState>): Promise<...> => {
     const params: Record<string, string | number | undefined> = {
       page: filters.page,
       per_page: filters.perPage,
       sort: filters.sort,
+      scope: filters.scope,
     };
```

---

#### [NEW] [ReservationViewTabs.tsx](file:///e:/bystrze/Magazyn/frontend/src/components/reservations/ReservationViewTabs.tsx)

Simple tabs component for switching between views:

```tsx
interface ReservationViewTabsProps {
  activeScope: "my" | "all";
  onScopeChange: (scope: "my" | "all") => void;
}

export function ReservationViewTabs({ activeScope, onScopeChange }: ReservationViewTabsProps) {
  return (
    <div className="flex border-b mb-4">
      <button 
        className={cn("px-4 py-2 border-b-2", activeScope === "my" ? "border-primary" : "border-transparent")}
        onClick={() => onScopeChange("my")}
      >
        My Reservations
      </button>
      <button 
        className={cn("px-4 py-2 border-b-2", activeScope === "all" ? "border-primary" : "border-transparent")}
        onClick={() => onScopeChange("all")}
      >
        All Reservations
      </button>
    </div>
  );
}
```

---

#### [MODIFY] [ReservationListContainer.tsx](file:///e:/bystrze/Magazyn/frontend/src/components/reservations/ReservationListContainer.tsx)

Add tabs and scope handling:

- Import and render `ReservationViewTabs` above filters
- Pass `scope` to `useReservations` via `setFilter`
- Pass `currentUserId` to `ReservationCardList` for highlighting

---

#### [MODIFY] [ReservationCardList.tsx](file:///e:/bystrze/Magazyn/frontend/src/components/reservations/ReservationCardList.tsx)

Add highlighting of current user's reservations:

- Accept new prop: `currentUserId?: string`
- Accept new prop: `scope: "my" | "all"`
- When `scope === "all"`, add visual highlight (border/badge) to cards where `reservation.userId === currentUserId`
- Hide action buttons when `scope === "all"` and `mode === "user"`

---

#### [MODIFY] [ReservationCard.tsx](file:///e:/bystrze/Magazyn/frontend/src/components/reservations/ReservationCard.tsx)

Add `isOwn` prop for highlighting:

```diff
 interface ReservationCardProps {
   reservation: ReservationListItem;
+  isOwn?: boolean;        // Highlight if current user's reservation
+  showActions?: boolean;  // Control action button visibility
   // ... existing props
 }
```

Apply visual distinction (e.g., subtle border color or "Your reservation" badge).

---

#### [MODIFY] [index.astro](file:///e:/bystrze/Magazyn/frontend/src/pages/reservations/index.astro)

Pass user ID and URL scope to container:

```diff
-<ReservationListContainer mode="user" client:load />
+<ReservationListContainer 
+  mode="user" 
+  currentUserId={user.id}
+  initialFilters={{ scope: initialScope }}
+  client:load 
+/>
```

Read `scope` from URL params on server side to pass as initial state.

---

## Verification Plan

### Manual Testing

1. **User "My Reservations" tab (default)**
   - Navigate to `/reservations`
   - Verify URL shows `?scope=my` or no param
   - Verify only logged-in user's reservations appear
   - Verify action buttons (Cancel, Modify) are visible

2. **User "All Reservations" tab**
   - Click "All Reservations" tab
   - Verify URL updates to `?scope=all`
   - Verify all users' reservations appear
   - Verify current user's reservations are highlighted
   - Verify NO action buttons are shown

3. **Admin "All Reservations" tab**
   - Login as admin, navigate to `/reservations?scope=all`
   - Verify all reservations appear
   - Verify admin CAN see action buttons on all reservations

4. **URL Shareability**
   - Copy URL with `?scope=all`
   - Open in new tab
   - Verify correct tab is selected

5. **Tab persistence**
   - Switch to "All" tab
   - Navigate away and back to `/reservations`
   - Verify defaults to "My Reservations" (not persisted)
