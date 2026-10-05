//go:build integration

package reservation_test

import (
	"context"
	"encoding/json"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTS1_BrokenEquipmentCannotBeReserved(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	_, _, err := fixture.client.From("equipment").
		Update(map[string]interface{}{"status": constants.EquipmentStatusBroken}, "", "").
		Eq("id", fixture.equipmentID).
		Execute()
	require.NoError(t, err)
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
	_, err = fixture.svc.Create(ctx, cmd, fixture.testUserID, "user")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not available", "Broken equipment should not be reservable")
	t.Logf("✓ Broken equipment reservation rejected")
}
func TestTS1_ReservationLifecycle_Full(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	type histEntry struct {
		ID string `json:"id"`
	}
	var histInitial []histEntry
	dataInitial, _, _ := fixture.client.From("credit_history").Select("id", "exact", false).Eq("user_id", fixture.testUserID).Execute()
	_ = json.Unmarshal(dataInitial, &histInitial)
	countInitial := len(histInitial)
	initialBalance := fixture.getUserBalance(fixture.testUserID)
	resID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, 3*fixture.costPerDay, initialBalance-balanceAfterCreate, "3-day reservation should deduct 3x costPerDay")
	newEnd1 := dateOffset(8)
	resp1, err := fixture.svc.Update(ctx, resID, types.UpdateReservationCommand{EndDate: &newEnd1}, fixture.testUserID, "user")
	require.NoError(t, err)
	assert.Equal(t, newEnd1, resp1.EndDate)
	balanceAfterExtend1 := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, fixture.costPerDay, balanceAfterCreate-balanceAfterExtend1, "Extending by 1 day should charge 1x costPerDay")
	t.Logf("✓ Step 13: Extended by 1 day, charged %d credits", fixture.costPerDay)
	newEnd2 := dateOffset(13)
	resp2, err := fixture.svc.Update(ctx, resID, types.UpdateReservationCommand{EndDate: &newEnd2}, fixture.testUserID, "user")
	require.NoError(t, err)
	assert.Equal(t, newEnd2, resp2.EndDate)
	balanceAfterExtend2 := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, 5*fixture.costPerDay, balanceAfterExtend1-balanceAfterExtend2, "Extending by 5 days should charge 5x costPerDay")
	t.Logf("✓ Step 14: Extended by 5 days, charged %d credits", 5*fixture.costPerDay)
	cancelStatus := constants.ReservationStatusDenied
	_, err = fixture.svc.Update(ctx, resID, types.UpdateReservationCommand{Status: &cancelStatus}, fixture.testUserID, "user")
	require.NoError(t, err)
	balanceAfterCancel := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, initialBalance, balanceAfterCancel, "Full refund: balance should match initial after cancel")
	t.Logf("✓ Step 15: Cancelled, balance restored to %d credits", balanceAfterCancel)
	var histAfter []histEntry
	dataAfter, _, _ := fixture.client.From("credit_history").Select("id", "exact", false).Eq("user_id", fixture.testUserID).Execute()
	_ = json.Unmarshal(dataAfter, &histAfter)
	assert.GreaterOrEqual(t, len(histAfter)-countInitial, 4, "Should have at least 4 credit history entries across full lifecycle")
	t.Logf("✓ Step 16: %d new credit history entries created (initial charge, 2 extensions, refund)", len(histAfter)-countInitial)
}
