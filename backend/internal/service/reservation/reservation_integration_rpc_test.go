//go:build integration

package reservation_test

import (
	"context"
	"encoding/json"
	"testing"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/testutils"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCreateAtomic_InsufficientCredits_RollsBack verifies that when a user
// doesn't have enough credits, the entire transaction rolls back atomically.
// No reservation should be created and balance should remain unchanged.
func TestCreateAtomic_InsufficientCredits_RollsBack(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	lowBalance := int32(1)
	fixture.setUserBalance(fixture.testUserID, lowBalance)
	balanceBefore := fixture.getUserBalance(fixture.testUserID)
	require.Equal(t, lowBalance, balanceBefore, "Setup failed: balance not set")
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(5),
				EndDate:     dateOffset(7),
			},
		},
	}
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID, "user")
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "Reservation failed", "Expected RPC error message")
	balanceAfter := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, balanceBefore, balanceAfter, "Balance changed despite rollback - ATOMICITY VIOLATED")
	fixture.setUserBalance(fixture.testUserID, 100)
	resp2, err2 := fixture.svc.Create(ctx, cmd, fixture.testUserID, "user")
	require.NoError(t, err2, "If rollback worked, reservation should not exist")
	assert.NotNil(t, resp2)
	t.Logf("✓ Atomicity verified: rollback on insufficient credits")
	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", resp2.Reservations[0].ID).Execute()
	})
}

// TestRefundCredits_ValidCancellation_RefundsAndLogs verifies that cancelling
// a reservation refunds credits to the user AND creates a credit_history entry.
func TestRefundCredits_ValidCancellation_RefundsAndLogs(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	updateCmd := types.UpdateReservationCommand{
		Status: testutils.StringPtr(constants.ReservationStatusCancelled),
	}
	_, err = fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
	require.NoError(t, err)
	balanceAfterCancel := fixture.getUserBalance(fixture.testUserID)
	refundAmount := balanceAfterCancel - balanceAfterCreate
	expectedRefund := 3 * fixture.costPerDay
	assert.Equal(t, expectedRefund, refundAmount, "Refund amount mismatch")
	t.Logf("✓ Refunded %d credits", refundAmount)
	var refundEntries []types.PublicCreditHistorySelect
	dataAfter, _, err := fixture.client.From("credit_history").
		Select("id,amount,reason,reservation_id,user_id", "exact", false).
		Eq("user_id", fixture.testUserID).
		Eq("reservation_id", reservationID).
		Eq("reason", "reservation_refund").
		Execute()
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(dataAfter, &refundEntries))
	require.Len(t, refundEntries, 1, "Exactly one refund credit_history entry must exist for this reservation")
	assert.Equal(t, expectedRefund, refundEntries[0].Amount, "Credit history refund amount mismatch")
	t.Logf("✓ Credit history logged: 1 refund entry with %d credits", refundEntries[0].Amount)
}

// TestUpdateAudit_StatusChange_CreatesAuditEntry verifies that updating
// reservation status creates an entry in reservation_history table.
func TestUpdateAudit_StatusChange_CreatesAuditEntry(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 0, 2)
	require.NoError(t, err)

	var auditBefore []types.PublicReservationHistorySelect
	dataBefore, _, err := fixture.client.From("reservation_history").
		Select("id,status,reservation_id", "exact", false).
		Eq("reservation_id", reservationID).
		Execute()
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(dataBefore, &auditBefore))
	auditCountBefore := len(auditBefore)
	t.Logf("Audit entries before: %d", auditCountBefore)

	updateCmd := types.UpdateReservationCommand{
		Status: testutils.StringPtr(constants.ReservationStatusRented),
	}
	resp, err := fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUser2ID, "admin")
	require.NoError(t, err)
	assert.Equal(t, constants.ReservationStatusRented, resp.Status)

	var auditAfter []types.PublicReservationHistorySelect
	dataAfter, _, err := fixture.client.From("reservation_history").
		Select("id,status,reservation_id", "exact", false).
		Eq("reservation_id", reservationID).
		Order("created_at", nil).
		Execute()
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(dataAfter, &auditAfter))
	require.Len(t, auditAfter, auditCountBefore+1, "Exactly one audit entry must be added")
	t.Logf("✓ Audit trail: %d -> %d entries", auditCountBefore, len(auditAfter))

	latestEntry := auditAfter[len(auditAfter)-1]
	assert.Equal(t, constants.ReservationStatusPending, latestEntry.Status, "Audit entry should record old status")
	t.Logf("✓ Audit entry preserves old status: %s", latestEntry.Status)
}

func TestUpdateAudit_DateChange_RecordsOldDates(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	originalStart := dateOffset(5)
	originalEnd := dateOffset(7)
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	newEnd := dateOffset(10)
	updateCmd := types.UpdateReservationCommand{
		EndDate: &newEnd,
	}
	_, err = fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
	require.NoError(t, err)

	var auditEntries []types.PublicReservationHistorySelect
	data, _, err := fixture.client.From("reservation_history").
		Select("id,start_date,end_date,reservation_id", "exact", false).
		Eq("reservation_id", reservationID).
		Order("created_at", nil).
		Execute()
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(data, &auditEntries))
	found := false
	for _, entry := range auditEntries {
		if entry.StartDate == originalStart && entry.EndDate == originalEnd {
			found = true
			break
		}
	}
	assert.True(t, found, "Audit trail missing original dates")
	t.Logf("✓ Audit trail preserves original dates: %s to %s", originalStart, originalEnd)
}

// TestBulkUpdate_DenyMultiple_RefundsAllCredits verifies that bulk denial
// of multiple reservations refunds credits to ALL affected users atomically.
func TestBulkUpdate_DenyMultiple_RefundsAllCredits(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	res1ID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	balance1After := fixture.getUserBalance(fixture.testUserID)
	res2ID, err := fixture.createTestReservation(fixture.testUser2ID, 10, 13)
	require.NoError(t, err)
	balance2After := fixture.getUserBalance(fixture.testUser2ID)
	updateCmd := types.BulkUpdateReservationsCommand{
		ReservationIDs: []string{res1ID, res2ID},
		Status:         constants.ReservationStatusCancelled,
	}
	resp, err := fixture.svc.BulkUpdate(ctx, updateCmd, fixture.testUser2ID, auth.RoleAdmin)
	require.NoError(t, err)
	assert.Equal(t, int32(2), resp.UpdatedCount)
	balance1Final := fixture.getUserBalance(fixture.testUserID)
	balance2Final := fixture.getUserBalance(fixture.testUser2ID)
	refund1 := balance1Final - balance1After
	refund2 := balance2Final - balance2After
	expectedRefund1 := 3 * fixture.costPerDay
	expectedRefund2 := 4 * fixture.costPerDay
	t.Logf("User1 - BalanceAfter: %d, BalanceFinal: %d, Refund: %d, Expected: %d, CostPerDay: %d",
		balance1After, balance1Final, refund1, expectedRefund1, fixture.costPerDay)
	t.Logf("User2 - BalanceAfter: %d, BalanceFinal: %d, Refund: %d, Expected: %d, CostPerDay: %d",
		balance2After, balance2Final, refund2, expectedRefund2, fixture.costPerDay)
	assert.Equal(t, expectedRefund1, refund1, "User1 refund mismatch")
	assert.Equal(t, expectedRefund2, refund2, "User2 refund mismatch")
	t.Logf("✓ Bulk denial refunded: User1=%d, User2=%d credits", refund1, refund2)
}
