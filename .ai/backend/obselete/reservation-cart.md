# Reservation Cart & Checkout Feature

## Overview
A new "Reservation Cart" flow allows users to select multiple equipment items, estimate costs, check availability in real-time, and create a batched reservation.

## New Features
1. **Persistent Cart**:
   - Items stored in `sessionStorage` (Key: `reservation_cart`).
   - Persists across page reloads.
2. **Real-time Cost Estimator**:
   - Calculates total credits required based on selected duration.
   - Checks against user's current credit balance.
   - Shows detailed breakdown per item.
3. **Availability Validation**:
   - Parallel checks for all cart items against `GET /api/equipment/:id/availability`.
   - Prevents conflicts before submission.
4. **Reservation Creation**:
   - Batched submission via `POST /api/reservations`.
   - Handling of backend validation errors.

## Manual Testing Guide

### Prerequisites
- Ensure Backend is running (`go run cmd/api/main.go`).
- Ensure Frontend is running (`npm run dev`).
- Log in as a user with some credits.

### Test Case 1: Happy Path (Successful Reservation)
1. **Add Items**: 
   - Navigate to Equipment list (e.g., `/equipment`).
   - Find available items.
   - Click the **Add to Cart** button (Shopping Cart icon). 
   - *Verify*: Alert confirms "Item added to cart".
2. **Checkout**: 
   - Navigate to `/reservations/create`.
   - *Verify*: List includes added items.
   - *Verify*: Clear Cart button is visible.
3. **Select Dates**: 
   - Pick a valid Start Date (e.g., tomorrow).
   - Pick a valid End Date (e.g., next week).
   - *Verify*: "Days" count updates correctly.
   - *Verify*: Total Cost updates (Item Cost x Days).
   - *Verify*: "Remaining Balance" is calculated.
4. **Review**: 
   - Click **Review & Confirm**.
   - *Verify*: Loading spinner appears briefly while checking availability.
   - *Verify*: Confirmation Modal opens with correct dates and total cost.
5. **Confirm**: 
   - Click **Confirm Reservation** in the modal.
   - *Verify*: Modal shows loading state.
   - *Verify*: Redirect to `/reservations?success=true`.
   - *Verify*: Cart is empty if you return to `/reservations/create`.

### Test Case 2: Validation Handling
1. **Invalid Dates**: 
   - Select End Date *before* Start Date.
   - *Verify*: Error "End date must be after start date" appears.
   - *Verify*: "Review & Confirm" button is **disabled**.
2. **Insufficient Credits**: 
   - Add multiple items or select a very long date range to exceed your current balance.
   - *Verify*: "Insufficient credits" warning appears in red.
   - *Verify*: "Review & Confirm" button is **disabled**.

### Test Case 3: Availability Conflict
1. **Pre-condition**: Ensure an item is already reserved for a specific date range (or reserve it in another tab).
2. **Test**: 
   - Add the same item to cart.
   - Select the overlapping date range.
   - Click **Review & Confirm**.
3. **Result**:
   - *Verify*: "Availability Issues Detected" alert appears at the top.
   - *Verify*: The specific item is listed with "Item is not available..." reason.
   - *Verify*: Confirmation Modal does **not** open.
