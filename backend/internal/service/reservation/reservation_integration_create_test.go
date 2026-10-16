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

func TestReservationDateConflicts(t *testing.T) {
	tests := []struct {
		name      string
		firstUser string
		first1    int
		first2    int
		secUser   string
		sec1      int
		sec2      int
		wantErr   bool
	}{
		{"Adjacent_SameUser", "u1", 7, 10, "u1", 11, 13, false},
		{"Adjacent_DifferentUser", "u1", 7, 10, "u2", 11, 13, false},
		{"Overlap_SameUser", "u1", 7, 10, "u1", 9, 12, true},
		{"Overlap_DifferentUser", "u1", 7, 10, "u2", 8, 11, true},
		{"ExactSameDates", "u1", 7, 10, "u1", 7, 10, true},
		{"AfterExistingEndsToday", "u1", -1, 0, "u1", 1, 2, false},
		{"ConflictWithOngoing", "u1", -1, 1, "u1", 0, 0, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fixture := setupDateTestFixture(t)
			defer fixture.teardown()
			user1 := fixture.testUserID
			user2 := fixture.testUserID
			if tt.secUser == "u2" {
				user2 = fixture.testUser2ID
			}
			_, err := fixture.createTestReservation(user1, tt.first1, tt.first2)
			require.NoError(t, err)
			res2, err := fixture.createTestReservation(user2, tt.sec1, tt.sec2)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotEmpty(t, res2)
			}
		})
	}
}

func TestTodayReservation(t *testing.T) {
	tests := []struct {
		name         string
		start        string
		end          string
		expectedDays int32
	}{
		{"SingleDay", todayStr(), todayStr(), 1},
		{"MultiDay", dateOffset(0), dateOffset(3), 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fixture := setupDateTestFixture(t)
			defer fixture.teardown()
			ctx := context.Background()
			balanceBefore := fixture.getUserBalance(fixture.testUserID)
			cmd := types.CreateReservationsCommand{
				Reservations: []types.CreateReservationItem{
					{
						EquipmentID: fixture.equipmentID,
						StartDate:   tt.start,
						EndDate:     tt.end,
					},
				},
			}
			resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID, "user")
			require.NoError(t, err)
			assert.NotEmpty(t, resp.Reservations)
			actualCost := balanceBefore - resp.RemainingBalance
			assert.Equal(t, fixture.costPerDay*tt.expectedDays, actualCost)
			fixture.cleanup = append(fixture.cleanup, func() {
				fixture.client.From("reservations").Delete("", "").Eq("id", resp.Reservations[0].ID).Execute()
			})
		})
	}
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
