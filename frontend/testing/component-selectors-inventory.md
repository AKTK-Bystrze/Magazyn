# Component Selector Inventory

This document tracks which components need `data-testid` selectors and their implementation status.

## Priority Legend

| Priority | Description |
|----------|-------------|
| 🔴 P0 | Critical user flows (auth, core actions) |
| 🟠 P1 | Main features (equipment, reservations) |
| 🟡 P2 | Secondary features (filters, admin) |
| 🟢 P3 | Nice to have |

---

## Authentication (`src/components/auth/`)

| Component | Priority | Status | Key Selectors |
|-----------|----------|--------|---------------|
| `LoginForm.tsx` | 🔴 P0 | ✅ DONE | `login-form`, `login-email-input`, `login-submit-button`, `login-error-alert` |
| `MagicLinkSent.tsx` | 🔴 P0 | ✅ DONE | `magic-link-sent-container`, `magic-link-sent-email` |
| `AuthListener.tsx` | 🟢 P3 | ⬜ TODO | (no visible UI) |

---

## Navigation (`src/components/navigation/`)

| Component | Priority | Status | Key Selectors |
|-----------|----------|--------|---------------|
| `TopNavBar.tsx` | 🔴 P0 | ✅ DONE | `topbar`, `nav-logo`, `nav-mobile-menu-button`, `nav-credits-badge` |
| `UserMenu.tsx` | 🔴 P0 | ✅ DONE | `user-menu-trigger`, `user-menu-dropdown`, `logout-button` |
| `UserSidebar.tsx` | 🟠 P1 | ⬜ TODO | `sidebar`, `sidebar-nav-link-{name}` |
| `MobileMenu.tsx` | 🟠 P1 | ⬜ TODO | `mobile-menu`, `mobile-nav-link-{name}` |
| `Breadcrumbs.tsx` | 🟡 P2 | ⬜ TODO | `breadcrumbs` |
| `ThemeToggle.tsx` | 🟢 P3 | ⬜ TODO | `theme-toggle-button` |

---

## Equipment (`src/components/equipment/`)

| Component | Priority | Status | Key Selectors |
|-----------|----------|--------|---------------|
| `EquipmentSearchContainer.tsx` | 🔴 P0 | ✅ DONE | `equipment-search-container` |
| `EquipmentGrid.tsx` | 🔴 P0 | ✅ DONE | `equipment-grid`, `equipment-grid-empty` |
| `EquipmentCard.tsx` | 🔴 P0 | ✅ DONE | `equipment-card-{id}`, `equipment-add-to-cart-{id}`, `equipment-details-button-{id}`, `equipment-status-badge-{id}` |
| `EquipmentDetailsSheet.tsx` | 🟠 P1 | ⬜ TODO | `equipment-details-sheet`, `equipment-details-close-button` |
| `FilterSidebar.tsx` | 🟠 P1 | ⬜ TODO | `equipment-filter-sidebar`, `category-filter`, `status-filter` |
| `CartIndicator.tsx` | 🔴 P0 | ✅ DONE | `cart-indicator`, `cart-item-count` |
| `EquipmentManagerContainer.tsx` | 🟠 P1 | ⬜ TODO | `equipment-manager-container` |
| `EquipmentTable.tsx` | 🟠 P1 | ⬜ TODO | `equipment-table`, `equipment-row-{id}` |
| `AddEquipmentDialog.tsx` | 🟠 P1 | ⬜ TODO | `add-equipment-dialog`, `equipment-name-input`, `equipment-submit-button` |
| `EditEquipmentDialog.tsx` | 🟠 P1 | ⬜ TODO | `edit-equipment-dialog` |
| `ConfirmArchiveDialog.tsx` | 🟡 P2 | ⬜ TODO | `confirm-archive-dialog`, `confirm-archive-button` |

---

## Reservations (`src/components/reservations/`)

| Component | Priority | Status | Key Selectors |
|-----------|----------|--------|---------------|
| `ReservationCartView.tsx` | 🔴 P0 | ✅ DONE | `reservation-cart`, `checkout-button`, `cart-empty-state` |
| `DateRangePicker.tsx` | 🔴 P0 | ✅ DONE | `date-range-picker`, `start-date-input`, `end-date-input` |
| `CostEstimator.tsx` | 🔴 P0 | ✅ DONE | `cost-estimator`, `total-cost-display` |
| `ConfirmationModal.tsx` | 🔴 P0 | ✅ DONE | `reservation-confirmation-modal`, `confirm-reservation-button`, `cancel-confirmation-button` |
| `ReservationListContainer.tsx` | 🟠 P1 | ⬜ TODO | `reservation-list-container` |
| `ReservationCard.tsx` | 🟠 P1 | ⬜ TODO | `reservation-card-{id}` |
| `ReservationDetailsView.tsx` | 🟠 P1 | ⬜ TODO | `reservation-details-view` |
| `ReservationFilters.tsx` | 🟡 P2 | ⬜ TODO | `reservation-filters`, `reservation-status-filter` |
| `ReservationViewTabs.tsx` | 🟡 P2 | ⬜ TODO | `reservation-view-tabs`, `tab-my-reservations`, `tab-all-reservations` |
| `StatusBadge.tsx` | 🟡 P2 | ⬜ TODO | `status-badge-{status}` |
| `ReservationStatusActions.tsx` | 🟠 P1 | ⬜ TODO | `reservation-actions`, `cancel-button`, `return-button` |
| `CancelReservationDialog.tsx` | 🟠 P1 | ⬜ TODO | `cancel-reservation-dialog` |
| `ModifyDatesDialog.tsx` | 🟠 P1 | ⬜ TODO | `modify-dates-dialog` |
| `ReturnWithDatesDialog.tsx` | 🟠 P1 | ⬜ TODO | `return-with-dates-dialog` |
| `StatusChangeDialog.tsx` | 🟠 P1 | ⬜ TODO | `status-change-dialog` |

---

## Users (`src/components/users/`)

| Component | Priority | Status | Key Selectors |
|-----------|----------|--------|---------------|
| `UserListContainer.tsx` | 🟠 P1 | ⬜ TODO | `user-list-container` |
| `UserTable.tsx` | 🟠 P1 | ⬜ TODO | `users-table`, `user-row-{id}` |
| `UserFilters.tsx` | 🟡 P2 | ⬜ TODO | `user-filters`, `user-role-filter`, `user-search-input` |
| `CreateUserDialog.tsx` | 🟠 P1 | ⬜ TODO | `create-user-dialog`, `user-email-input`, `user-submit-button` |
| `EditUserDialog.tsx` | 🟠 P1 | ⬜ TODO | `edit-user-dialog` |
| `AdjustCreditsDialog.tsx` | 🟠 P1 | ⬜ TODO | `adjust-credits-dialog`, `credits-amount-input` |

---

## Credits (`src/components/credits/`)

| Component | Priority | Status | Key Selectors |
|-----------|----------|--------|---------------|
| `CreditHistoryContainer.tsx` | 🟡 P2 | ⬜ TODO | `credit-history-container` |
| `CreditHistoryTable.tsx` | 🟡 P2 | ⬜ TODO | `credit-history-table` |

---

## Admin (`src/components/admin/`)

| Component | Priority | Status | Key Selectors |
|-----------|----------|--------|---------------|
| `AdminHeader.tsx` | 🟡 P2 | ⬜ TODO | `admin-header` |
| `AdminSidebar.tsx` | 🟠 P1 | ⬜ TODO | `admin-sidebar`, `admin-nav-link-{name}` |
| `DashboardStats.tsx` | 🟡 P2 | ⬜ TODO | `dashboard-stats`, `stat-card-{metric}` |
| `UserSelector.tsx` | 🟡 P2 | ⬜ TODO | `user-selector` |

---

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| 🔴 P0 | 12 | Critical flows - implement first |
| 🟠 P1 | 22 | Main features - implement second |
| 🟡 P2 | 11 | Secondary - implement as needed |
| 🟢 P3 | 2 | Nice to have |

## Recommended Implementation Order

1. **Phase 1 (P0)**: Auth flow + Equipment browsing + Cart/Checkout
2. **Phase 2 (P1)**: Reservations management + User management
3. **Phase 3 (P2+)**: Filters, admin, secondary features
