//go:build integration

package reservation_test

import (
	"context"
	"encoding/json"
	"testing"

	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestAdjacentDates_SameUserCanReserveAfterReturn verifies that a user can start a new reservation
// on the day immediately following the end of their previous reservation.
// Note: In this system, dates are inclusive full days.
// If Res A ends on day X, Res B must start on day X+1 to be non-overlapping.
func TestAdjacentDates_SameUserCanReserveAfterReturn(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	// Arrange: Create reservation days 7-10 (End date is inclusive: 10th)
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, 7, 10)
	require.NoError(t, err)
	t.Logf("First reservation: %s (days 7-10)", reservationID1)

	// Act: Create adjacent reservation (day 11-13, starts day after first ends)
	reservationID2, err := fixture.createTestReservation(fixture.testUserID, 11, 13)

	// Assert: Should succeed (adjacent is OK)
	assert.NoError(t, err)
	assert.NotEmpty(t, reservationID2)
	t.Logf("Second reservation: %s (days 11-13) - SUCCESS", reservationID2)
}

// TestAdjacentDates_DifferentUserCanReserveAfterReturn verifies that a different user can reserve
// the equipment starting the day after the previous user returns it.
func TestAdjacentDates_DifferentUserCanReserveAfterReturn(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	// Arrange: User A reserves days 7-10
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, 7, 10)
	require.NoError(t, err)
	t.Logf("User A reservation: %s (days 7-10)", reservationID1)

	// Act: User B reserves days 11-13 (starts day after)
	reservationID2, err := fixture.createTestReservation(fixture.testUser2ID, 11, 13)

	// Assert: Should succeed
	assert.NoError(t, err)
	assert.NotEmpty(t, reservationID2)
	t.Logf("User B reservation: %s (days 11-13) - SUCCESS", reservationID2)
}

// TestOverlappingDates_SameUserConflict ensures a user cannot create overlapping reservations for same equipment.
func TestOverlappingDates_SameUserConflict(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	// Arrange: Create reservation days 7-10
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, 7, 10)
	require.NoError(t, err)
	t.Logf("First reservation: %s (days 7-10)", reservationID1)

	// Act: Try to reserve days 9-12 (overlaps)
	_, err = fixture.createTestReservation(fixture.testUserID, 9, 12)

	// Assert: Should fail with conflict
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Reservation failed")
	t.Logf("Overlapping reservation rejected - EXPECTED")
}

// TestOverlappingDates_DifferentUserConflict ensures conflicting reservations from different users are rejected.
func TestOverlappingDates_DifferentUserConflict(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	// Arrange: User A reserves days 7-10
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, 7, 10)
	require.NoError(t, err)
	t.Logf("User A reservation: %s (days 7-10)", reservationID1)

	// Act: User B tries to reserve days 8-11 (overlaps)
	_, err = fixture.createTestReservation(fixture.testUser2ID, 8, 11)

	// Assert: Should fail
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Reservation failed")
	t.Logf("User B conflicting reservation rejected - EXPECTED")
}

// TestExactSameDates_Conflict ensures exact duplicate dates are rejected.
func TestExactSameDates_Conflict(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	// Arrange: Create reservation days 7-10
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, 7, 10)
	require.NoError(t, err)
	t.Logf("First reservation: %s (days 7-10)", reservationID1)

	// Act: Try to reserve exact same dates
	_, err = fixture.createTestReservation(fixture.testUserID, 7, 10)

	// Assert: Should fail
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Reservation failed")
	t.Logf("Duplicate date reservation rejected - EXPECTED")
}

// TestTodayReservation_SingleDay verifies a reservation can be made for the current day only (1 day cost).
func TestTodayReservation_SingleDay(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	ctx := context.Background()
	balanceBefore := fixture.getUserBalance(fixture.testUserID)

	// Act: Reserve for today only
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   todayStr(),
				EndDate:     todayStr(),
			},
		},
	}
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID)

	// Assert: Should succeed, cost = 1 day
	require.NoError(t, err)
	assert.NotEmpty(t, resp.Reservations)

	expectedCost := fixture.costPerDay
	actualCost := balanceBefore - resp.RemainingBalance
	assert.Equal(t, expectedCost, actualCost, "Cost should be 1 day")
	t.Logf("Single-day (today) reservation cost: %d credits", actualCost)

	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[0].ID).Execute()
	})
}

// TestTodayReservation_MultiDay verifies reservations starting today spanning multiple days calculate cost correctly.
func TestTodayReservation_MultiDay(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	ctx := context.Background()
	balanceBefore := fixture.getUserBalance(fixture.testUserID)

	// Act: Reserve today → today+3 (4 days total)
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(0),
				EndDate:     dateOffset(3),
			},
		},
	}
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID)

	// Assert: Should succeed, cost = 4 days
	require.NoError(t, err)
	expectedCost := fixture.costPerDay * 4
	actualCost := balanceBefore - resp.RemainingBalance
	assert.Equal(t, expectedCost, actualCost, "Cost should be 4 days")
	t.Logf("Multi-day (today+3) reservation cost: %d credits", actualCost)

	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[0].ID).Execute()
	})
}

// TestTodayReservation_AfterExistingEndsToday verifies that if a reservation ends today (e.g. returned today),
// another reservation can start immediately tomorrow.
func TestTodayReservation_AfterExistingEndsToday(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	// Arrange: Create reservation ending today (yesterday → today)
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, -1, 0)
	require.NoError(t, err)
	t.Logf("First reservation: %s (yesterday → today)", reservationID1)

	// Act: Create reservation starting TOMORROW (day 1)
	reservationID2, err := fixture.createTestReservation(fixture.testUserID, 1, 2)

	// Assert: Should succeed (adjacent)
	assert.NoError(t, err)
	assert.NotEmpty(t, reservationID2)
	t.Logf("Today-start reservation: %s - SUCCESS", reservationID2)
}

// TestTodayReservation_ConflictWithOngoing verifies that creating a reservation for today fails
// if there is already an ongoing reservation covering today.
func TestTodayReservation_ConflictWithOngoing(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	// Arrange: Create reservation spanning yesterday to tomorrow
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, -1, 1)
	require.NoError(t, err)
	t.Logf("Ongoing reservation: %s (yesterday → tomorrow)", reservationID1)

	// Act: Try to reserve for today
	_, err = fixture.createTestReservation(fixture.testUserID, 0, 0)

	// Assert: Should fail
	assert.Error(t, err)
	t.Logf("Conflict with ongoing reservation rejected - EXPECTED")
}

// TestCostCalculation_Matrix verifies cost calculations on matrix of durations.
func TestCostCalculation_Matrix(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	ctx := context.Background()

	tests := []struct {
		name      string
		startDays int
		endDays   int
		wantDays  int32
	}{
		{"Single Day", 5, 5, 1},
		{"Two Days", 7, 8, 2},
		{"Week Long", 10, 16, 7},
		{"Month Long", 20, 50, 31},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			balanceBefore := fixture.getUserBalance(fixture.testUserID)

			// Act
			cmd := types.CreateReservationsCommand{
				Reservations: []types.CreateReservationItem{
					{
						EquipmentID: fixture.equipmentID,
						StartDate:   dateOffset(tt.startDays),
						EndDate:     dateOffset(tt.endDays),
					},
				},
			}
			resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID)

			// Assert
			require.NoError(t, err)
			assert.NotEmpty(t, resp.Reservations)

			expectedCost := tt.wantDays * fixture.costPerDay
			actualCost := balanceBefore - resp.RemainingBalance
			assert.Equal(t, expectedCost, actualCost)
			t.Logf("Cost for %d days: %d credits ✓", tt.wantDays, actualCost)

			// Cleanup
			fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[0].ID).Execute()
		})
	}
}

// TestMultiReservation_SameEquipmentDifferentDates verifies batch creation of non-overlapping reservations.
func TestMultiReservation_SameEquipmentDifferentDates(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	ctx := context.Background()

	// Act: Create 2 distinct reservations for same equipment
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(5),
				EndDate:     dateOffset(7),
			},
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(10), // Gap of 2 days
				EndDate:     dateOffset(12),
			},
		},
	}
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID)

	// Assert: Should succeed
	require.NoError(t, err)
	assert.Len(t, resp.Reservations, 2)
	t.Logf("Batch reservation successful. IDs: %s, %s", resp.Reservations[0].ID, resp.Reservations[1].ID)

	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[0].ID).Execute()
		fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[1].ID).Execute()
	})
}

// TestMultiReservation_PartialConflict verifies that if ANY reservation in a batch conflicts, NONE are created.
func TestMultiReservation_PartialConflict(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	ctx := context.Background()

	// Arrange: Create blocking reservation (10-12)
	blockingID, err := fixture.createTestReservation(fixture.testUser2ID, 10, 12)
	require.NoError(t, err)
	t.Logf("Blocking reservation: %s", blockingID)

	// Act: Try batch where one is OK (5-7) and one conflicts (10-12)
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(5),
				EndDate:     dateOffset(7),
			},
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(10),
				EndDate:     dateOffset(12),
			},
		},
	}
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID)

	// Assert: Should fail ATOMICALLY (none created)
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "Reservation failed") // Matches our DB error
	t.Logf("Batch rejected due to partial conflict - EXPECTED (atomic) ✓")
}

// TestMultiReservation_TotalCostCalculation verifies the total cost of a batch is the sum of relevant items.
func TestMultiReservation_TotalCostCalculation(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	balanceBefore := fixture.getUserBalance(fixture.testUserID)

	// Act: Create 3 items × 3 days each = 9 total days
	res1ID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)

	res2ID, err := fixture.createTestReservation(fixture.testUserID, 10, 12)
	require.NoError(t, err)

	res3ID, err := fixture.createTestReservation(fixture.testUserID, 15, 17)
	require.NoError(t, err)

	// Assert: Total cost = 9 days × costPerDay
	balanceAfter := fixture.getUserBalance(fixture.testUserID)
	totalCost := balanceBefore - balanceAfter
	expectedCost := 9 * fixture.costPerDay

	assert.Equal(t, expectedCost, totalCost)
	t.Logf("Multi-reservation total: 9 days × %d/day = %d credits ✓", fixture.costPerDay, totalCost)
	t.Logf("Reservation IDs: %s, %s, %s", res1ID, res2ID, res3ID)
}

// TestFreeReservation_AdminCanCreateWithoutDeductingCredits verifies that an admin
// can create a free reservation that doesn't charge the user's credit balance.
func TestFreeReservation_AdminCanCreateWithoutDeductingCredits(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	ctx := context.Background()

	// Get initial balance
	balanceBefore := fixture.getUserBalance(fixture.testUserID)
	t.Logf("Initial balance: %d credits", balanceBefore)

	// Create free reservation
	isFree := true
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(5),
				EndDate:     dateOffset(7), // 3 days
			},
		},
		FreeReservation: &isFree,
	}
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID)

	// Assert: Should succeed
	require.NoError(t, err)
	assert.Len(t, resp.Reservations, 1)

	// Verify reservation was created with is_free = true
	var reservations []struct {
		ID     string `json:"id"`
		IsFree bool   `json:"is_free"`
	}
	data, _, err := fixture.client.From("reservations").
		Select("id,is_free", "", false).
		Eq("id", resp.Reservations[0].ID).
		Execute()
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(data, &reservations))
	require.Len(t, reservations, 1)
	assert.True(t, reservations[0].IsFree, "Reservation should be marked as free")

	// Verify balance was NOT deducted
	balanceAfter := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, balanceBefore, balanceAfter, "Balance should remain unchanged for free reservation")
	t.Logf("Balance after free reservation: %d credits (unchanged) ✓", balanceAfter)

	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[0].ID).Execute()
	})
}

// TestFreeReservation_CostComparison verifies that free reservations have 0 cost
// compared to regular reservations of the same duration.
func TestFreeReservation_CostComparison(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	ctx := context.Background()

	days := 5 // 5-day reservation
	expectedCost := int32(days) * fixture.costPerDay

	// Test 1: Regular reservation (should deduct credits)
	balanceBeforeRegular := fixture.getUserBalance(fixture.testUserID)

	cmdRegular := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(5),
				EndDate:     dateOffset(5 + days - 1), // 5 days
			},
		},
	}
	respRegular, err := fixture.svc.Create(ctx, cmdRegular, fixture.testUserID)
	require.NoError(t, err)

	balanceAfterRegular := fixture.getUserBalance(fixture.testUserID)
	costRegular := balanceBeforeRegular - balanceAfterRegular
	assert.Equal(t, expectedCost, costRegular, "Regular reservation should deduct correct amount")
	t.Logf("Regular reservation: %d days, cost %d credits ✓", days, costRegular)

	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", respRegular.Reservations[0].ID).Execute()
	})

	// Test 2: Free reservation (should NOT deduct credits)
	balanceBeforeFree := fixture.getUserBalance(fixture.testUserID)

	isFree := true
	cmdFree := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(15),            // Different date range
				EndDate:     dateOffset(15 + days - 1), // Same 5-day duration
			},
		},
		FreeReservation: &isFree,
	}
	respFree, err := fixture.svc.Create(ctx, cmdFree, fixture.testUserID)
	require.NoError(t, err)

	balanceAfterFree := fixture.getUserBalance(fixture.testUserID)
	costFree := balanceBeforeFree - balanceAfterFree
	assert.Equal(t, int32(0), costFree, "Free reservation should cost 0 credits")
	t.Logf("Free reservation: %d days, cost %d credits ✓", days, costFree)

	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", respFree.Reservations[0].ID).Execute()
	})
}
