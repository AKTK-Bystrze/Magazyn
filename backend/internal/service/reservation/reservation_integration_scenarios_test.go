//go:build integration

package reservation_test

import (
	"context"
	"encoding/json"
	"testing"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestTS1_BrokenEquipmentCannotBeReserved verifies TS-1 step 5:
// Equipment with status "broken" must be rejected when attempting to reserve it.
func TestTS1_BrokenEquipmentCannotBeReserved(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	// Set equipment to broken
	_, _, err := fixture.client.From("equipment").
		Update(map[string]interface{}{"status": constants.EquipmentStatusBroken}, "", "").
		Eq("id", fixture.equipmentID).
		Execute()
	require.NoError(t, err)

	// Restore to "ok" on teardown before equipment is deleted (append = runs first in LIFO)
	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("equipment").
			Update(map[string]interface{}{"status": constants.EquipmentStatusOK}, "", "").
			Eq("id", fixture.equipmentID).
			Execute()
	})

	ctx := context.Background()
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{EquipmentID: fixture.equipmentID, StartDate: dateOffset(3), EndDate: dateOffset(5)},
		},
	}
	_, err = fixture.svc.Create(ctx, cmd, fixture.testUserID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not available", "Broken equipment should not be reservable")
	t.Logf("✓ Broken equipment reservation rejected")
}

// TestTS1_ReservationLifecycle_Full verifies the complete TS-1 sequential lifecycle:
// Create (3 days) -> Extend end +1 day -> Extend end +5 days -> Cancel -> Verify full refund + credit history.
// Maps to TS-1 steps 11-16.
func TestTS1_ReservationLifecycle_Full(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	// Count credit_history entries initially
	type histEntry struct {
		ID string `json:"id"`
	}
	var histInitial []histEntry
	dataInitial, _, _ := fixture.client.From("credit_history").Select("id", "exact", false).Eq("user_id", fixture.testUserID).Execute()
	_ = json.Unmarshal(dataInitial, &histInitial)
	countInitial := len(histInitial)

	// TS-1 step 11: Create reservation (3 days: offset 5->7)
	initialBalance := fixture.getUserBalance(fixture.testUserID)
	resID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, 3*fixture.costPerDay, initialBalance-balanceAfterCreate, "3-day reservation should deduct 3x costPerDay")

	// TS-1 step 13: Extend end date +1 day (5->8, now 4 days)
	newEnd1 := dateOffset(8)
	resp1, err := fixture.svc.Update(ctx, resID, types.UpdateReservationCommand{EndDate: &newEnd1}, fixture.testUserID, "user")
	require.NoError(t, err)
	assert.Equal(t, newEnd1, resp1.EndDate)
	balanceAfterExtend1 := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, fixture.costPerDay, balanceAfterCreate-balanceAfterExtend1, "Extending by 1 day should charge 1x costPerDay")
	t.Logf("✓ Step 13: Extended by 1 day, charged %d credits", fixture.costPerDay)

	// TS-1 step 14: Extend end date +5 more days (5->13, now 9 days)
	newEnd2 := dateOffset(13)
	resp2, err := fixture.svc.Update(ctx, resID, types.UpdateReservationCommand{EndDate: &newEnd2}, fixture.testUserID, "user")
	require.NoError(t, err)
	assert.Equal(t, newEnd2, resp2.EndDate)
	balanceAfterExtend2 := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, 5*fixture.costPerDay, balanceAfterExtend1-balanceAfterExtend2, "Extending by 5 days should charge 5x costPerDay")
	t.Logf("✓ Step 14: Extended by 5 days, charged %d credits", 5*fixture.costPerDay)

	// TS-1 step 15: Cancel reservation -> full refund (9 days)
	cancelStatus := constants.ReservationStatusDenied
	_, err = fixture.svc.Update(ctx, resID, types.UpdateReservationCommand{Status: &cancelStatus}, fixture.testUserID, "user")
	require.NoError(t, err)
	balanceAfterCancel := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, initialBalance, balanceAfterCancel, "Full refund: balance should match initial after cancel")
	t.Logf("✓ Step 15: Cancelled, balance restored to %d credits", balanceAfterCancel)

	// TS-1 step 16: Verify credit history (initial charge + 2 extensions + refund = at least 4 entries)
	var histAfter []histEntry
	dataAfter, _, _ := fixture.client.From("credit_history").Select("id", "exact", false).Eq("user_id", fixture.testUserID).Execute()
	_ = json.Unmarshal(dataAfter, &histAfter)
	assert.GreaterOrEqual(t, len(histAfter)-countInitial, 4, "Should have at least 4 credit history entries across full lifecycle")
	t.Logf("✓ Step 16: %d new credit history entries created (initial charge, 2 extensions, refund)", len(histAfter)-countInitial)
}
