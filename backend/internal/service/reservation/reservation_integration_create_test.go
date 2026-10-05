//go:build integration

package reservation_test

import (
	"context"
	"encoding/json"
	"magazyn/backend/internal/types"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAdjacentDates_SameUserCanReserveAfterReturn(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, 7, 10)
	require.NoError(t, err)
	t.Logf("First reservation: %s (days 7-10)", reservationID1)
	reservationID2, err := fixture.createTestReservation(fixture.testUserID, 11, 13)
	assert.NoError(t, err)
	assert.NotEmpty(t, reservationID2)
	t.Logf("Second reservation: %s (days 11-13) - SUCCESS", reservationID2)
}
func TestAdjacentDates_DifferentUserCanReserveAfterReturn(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, 7, 10)
	require.NoError(t, err)
	t.Logf("User A reservation: %s (days 7-10)", reservationID1)
	reservationID2, err := fixture.createTestReservation(fixture.testUser2ID, 11, 13)
	assert.NoError(t, err)
	assert.NotEmpty(t, reservationID2)
	t.Logf("User B reservation: %s (days 11-13) - SUCCESS", reservationID2)
}
func TestOverlappingDates_SameUserConflict(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, 7, 10)
	require.NoError(t, err)
	t.Logf("First reservation: %s (days 7-10)", reservationID1)
	_, err = fixture.createTestReservation(fixture.testUserID, 9, 12)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Reservation failed")
	t.Logf("Overlapping reservation rejected - EXPECTED")
}
func TestOverlappingDates_DifferentUserConflict(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, 7, 10)
	require.NoError(t, err)
	t.Logf("User A reservation: %s (days 7-10)", reservationID1)
	_, err = fixture.createTestReservation(fixture.testUser2ID, 8, 11)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Reservation failed")
	t.Logf("User B conflicting reservation rejected - EXPECTED")
}
func TestExactSameDates_Conflict(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, 7, 10)
	require.NoError(t, err)
	t.Logf("First reservation: %s (days 7-10)", reservationID1)
	_, err = fixture.createTestReservation(fixture.testUserID, 7, 10)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Reservation failed")
	t.Logf("Duplicate date reservation rejected - EXPECTED")
}
func TestTodayReservation_SingleDay(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	balanceBefore := fixture.getUserBalance(fixture.testUserID)
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   todayStr(),
				EndDate:     todayStr(),
			},
		},
	}
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID, "user")
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

func TestTodayReservation_MultiDay(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	balanceBefore := fixture.getUserBalance(fixture.testUserID)
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(0),
				EndDate:     dateOffset(3),
			},
		},
	}
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID, "user")
	require.NoError(t, err)
	expectedCost := fixture.costPerDay * 4
	actualCost := balanceBefore - resp.RemainingBalance
	assert.Equal(t, expectedCost, actualCost, "Cost should be 4 days")
	t.Logf("Multi-day (today+3) reservation cost: %d credits", actualCost)
	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[0].ID).Execute()
	})
}
func TestTodayReservation_AfterExistingEndsToday(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, -1, 0)
	require.NoError(t, err)
	t.Logf("First reservation: %s (yesterday → today)", reservationID1)
	reservationID2, err := fixture.createTestReservation(fixture.testUserID, 1, 2)
	assert.NoError(t, err)
	assert.NotEmpty(t, reservationID2)
	t.Logf("Today-start reservation: %s - SUCCESS", reservationID2)
}
func TestTodayReservation_ConflictWithOngoing(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	reservationID1, err := fixture.createTestReservation(fixture.testUserID, -1, 1)
	require.NoError(t, err)
	t.Logf("Ongoing reservation: %s (yesterday → tomorrow)", reservationID1)
	_, err = fixture.createTestReservation(fixture.testUserID, 0, 0)
	assert.Error(t, err)
	t.Logf("Conflict with ongoing reservation rejected - EXPECTED")
}
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
			cmd := types.CreateReservationsCommand{
				Reservations: []types.CreateReservationItem{
					{
						EquipmentID: fixture.equipmentID,
						StartDate:   dateOffset(tt.startDays),
						EndDate:     dateOffset(tt.endDays),
					},
				},
			}
			resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID, "user")
			require.NoError(t, err)
			assert.NotEmpty(t, resp.Reservations)
			expectedCost := tt.wantDays * fixture.costPerDay
			actualCost := balanceBefore - resp.RemainingBalance
			assert.Equal(t, expectedCost, actualCost)
			t.Logf("Cost for %d days: %d credits ✓", tt.wantDays, actualCost)
			fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[0].ID).Execute()
		})
	}
}

func TestMultiReservation_SameEquipmentDifferentDates(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
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
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID, "user")
	require.NoError(t, err)
	assert.Len(t, resp.Reservations, 2)
	t.Logf("Batch reservation successful. IDs: %s, %s", resp.Reservations[0].ID, resp.Reservations[1].ID)
	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[0].ID).Execute()
		fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[1].ID).Execute()
	})
}

func TestMultiReservation_PartialConflict(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	blockingID, err := fixture.createTestReservation(fixture.testUser2ID, 10, 12)
	require.NoError(t, err)
	t.Logf("Blocking reservation: %s", blockingID)
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
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID, "user")
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "Reservation failed")
	t.Logf("Batch rejected due to partial conflict - EXPECTED (atomic) ✓")
}
func TestMultiReservation_TotalCostCalculation(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	balanceBefore := fixture.getUserBalance(fixture.testUserID)
	res1ID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	res2ID, err := fixture.createTestReservation(fixture.testUserID, 10, 12)
	require.NoError(t, err)
	res3ID, err := fixture.createTestReservation(fixture.testUserID, 15, 17)
	require.NoError(t, err)
	balanceAfter := fixture.getUserBalance(fixture.testUserID)
	totalCost := balanceBefore - balanceAfter
	expectedCost := 9 * fixture.costPerDay
	assert.Equal(t, expectedCost, totalCost)
	t.Logf("Multi-reservation total: 9 days × %d/day = %d credits ✓", fixture.costPerDay, totalCost)
	t.Logf("Reservation IDs: %s, %s, %s", res1ID, res2ID, res3ID)
}
func TestFreeReservation_AdminCanCreateWithoutDeductingCredits(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	balanceBefore := fixture.getUserBalance(fixture.testUserID)
	t.Logf("Initial balance: %d credits", balanceBefore)
	isFree := true
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(5),
				EndDate:     dateOffset(7),
			},
		},
		FreeReservation: &isFree,
	}
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID, "admin")
	require.NoError(t, err)
	assert.Len(t, resp.Reservations, 1)
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
	balanceAfter := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, balanceBefore, balanceAfter, "Balance should remain unchanged for free reservation")
	t.Logf("Balance after free reservation: %d credits (unchanged) ✓", balanceAfter)
	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[0].ID).Execute()
	})
}

func TestFreeReservation_CostComparison(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	days := 5
	expectedCost := int32(days) * fixture.costPerDay
	balanceBeforeRegular := fixture.getUserBalance(fixture.testUserID)
	cmdRegular := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(5),
				EndDate:     dateOffset(5 + days - 1),
			},
		},
	}
	respRegular, err := fixture.svc.Create(ctx, cmdRegular, fixture.testUserID, "user")
	require.NoError(t, err)
	balanceAfterRegular := fixture.getUserBalance(fixture.testUserID)
	costRegular := balanceBeforeRegular - balanceAfterRegular
	assert.Equal(t, expectedCost, costRegular, "Regular reservation should deduct correct amount")
	t.Logf("Regular reservation: %d days, cost %d credits ✓", days, costRegular)
	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", respRegular.Reservations[0].ID).Execute()
	})
	balanceBeforeFree := fixture.getUserBalance(fixture.testUserID)
	isFree := true
	cmdFree := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(15),
				EndDate:     dateOffset(15 + days - 1),
			},
		},
		FreeReservation: &isFree,
	}
	respFree, err := fixture.svc.Create(ctx, cmdFree, fixture.testUserID, "admin")
	require.NoError(t, err)
	balanceAfterFree := fixture.getUserBalance(fixture.testUserID)
	costFree := balanceBeforeFree - balanceAfterFree
	assert.Equal(t, int32(0), costFree, "Free reservation should cost 0 credits")
	t.Logf("Free reservation: %d days, cost %d credits ✓", days, costFree)
	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", respFree.Reservations[0].ID).Execute()
	})
}

func TestTS2_AdminCreatesReservationForUser(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	targetUserBalance := fixture.getUserBalance(fixture.testUserID)
	adminBalance := fixture.getUserBalance(fixture.testUser2ID)
	targetID := fixture.testUserID
	isFree := false
	cmd := types.CreateReservationsCommand{
		UserID:          &targetID,
		FreeReservation: &isFree,
		Reservations: []types.CreateReservationItem{
			{EquipmentID: fixture.equipmentID, StartDate: dateOffset(5), EndDate: dateOffset(7)},
		},
	}
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUser2ID, "admin")
	require.NoError(t, err)
	require.NotEmpty(t, resp.Reservations)
	assert.Equal(t, targetID, resp.Reservations[0].UserID, "Reservation owner should be the target user")
	assert.Equal(t, 3*fixture.costPerDay, targetUserBalance-fixture.getUserBalance(fixture.testUserID), "3-day cost from TARGET user")
	assert.Equal(t, adminBalance, fixture.getUserBalance(fixture.testUser2ID), "Admin balance must not change")
	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[0].ID).Execute()
	})
	t.Logf("✓ TS-2: Admin created reservation for user, credits deducted from target")
}
func TestTS2_AdminModifiesAnotherUsersReservation(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	resID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	newEnd := dateOffset(9)
	resp, err := fixture.svc.Update(ctx, resID, types.UpdateReservationCommand{EndDate: &newEnd}, fixture.testUser2ID, "admin")
	require.NoError(t, err)
	assert.Equal(t, newEnd, resp.EndDate)
	assert.Equal(t, 2*fixture.costPerDay, balanceAfterCreate-fixture.getUserBalance(fixture.testUserID), "Admin extension charges target user")
	t.Logf("✓ TS-2: Admin modified reservation, 2-day charge applied to target user")
}
