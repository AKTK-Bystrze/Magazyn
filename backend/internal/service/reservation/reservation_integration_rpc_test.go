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

// ============================================================================
// P1.1: create_reservation_atomic - Missing Tests
// ============================================================================

// TestCreateAtomic_InsufficientCredits_RollsBack verifies that when a user
// doesn't have enough credits, the entire transaction rolls back atomically.
// No reservation should be created and balance should remain unchanged.
func TestCreateAtomic_InsufficientCredits_RollsBack(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	// Arrange: Set user balance to very low (not enough for reservation)
	lowBalance := int32(1) // 1 credit
	_, _, _ = fixture.client.From("profiles").
		Update(map[string]interface{}{"credit_balance": lowBalance}, "", "").
		Eq("id", fixture.testUserID).
		Execute()

	balanceBefore := fixture.getUserBalance(fixture.testUserID)
	require.Equal(t, lowBalance, balanceBefore, "Setup failed: balance not set")

	// Act: Try to create 3-day reservation (cost >> 1 credit)
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(5),
				EndDate:     dateOffset(7), // 3 days
			},
		},
	}
	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID)

	// Assert: Should fail with conflict/insufficient credits error
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "Reservation failed", "Expected RPC error message")

	// Assert: Balance should be UNCHANGED (rollback verification)
	balanceAfter := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, balanceBefore, balanceAfter, "Balance changed despite rollback - ATOMICITY VIOLATED")

	// Assert: No reservation should exist
	// Verify by checking if we can create it now with sufficient credits
	_, _, _ = fixture.client.From("profiles").
		Update(map[string]interface{}{"credit_balance": 100000}, "", "").
		Eq("id", fixture.testUserID).
		Execute()

	resp2, err2 := fixture.svc.Create(ctx, cmd, fixture.testUserID)
	require.NoError(t, err2, "If rollback worked, reservation should not exist")
	assert.NotNil(t, resp2)
	t.Logf("✓ Atomicity verified: rollback on insufficient credits")

	// Cleanup
	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("reservations").Delete("", "").Eq("id", resp2.Reservations[0].ID).Execute()
	})
}

// ============================================================================
// P1.2: refund_reservation_credits - Complete Test Coverage
// ============================================================================

// TestRefundCredits_ValidCancellation_RefundsAndLogs verifies that cancelling
// a reservation refunds credits to the user AND creates a credit_history entry.
func TestRefundCredits_ValidCancellation_RefundsAndLogs(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	// Arrange: Create reservation (3 days)
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)

	// Get credit history count before cancellation
	type historyEntry struct {
		ID string `json:"id"`
	}
	var historyBefore []historyEntry
	dataBefore, _, _ := fixture.client.From("credit_history").
		Select("id", "exact", false).
		Eq("user_id", fixture.testUserID).
		Execute()
	json.Unmarshal(dataBefore, &historyBefore)
	historyCountBefore := len(historyBefore)

	// Act: Cancel reservation (status change to DENIED for user cancellation)
	updateCmd := types.UpdateReservationCommand{
		Status: stringPtr("DENIED"),
	}
	_, err = fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
	require.NoError(t, err)

	// Assert: Credits refunded
	balanceAfterCancel := fixture.getUserBalance(fixture.testUserID)
	refundAmount := balanceAfterCancel - balanceAfterCreate
	expectedRefund := 3 * fixture.costPerDay

	assert.Equal(t, expectedRefund, refundAmount, "Refund amount mismatch")
	t.Logf("✓ Refunded %d credits", refundAmount)

	// Assert: Credit history entry created
	var historyAfter []historyEntry
	dataAfter, _, _ := fixture.client.From("credit_history").
		Select("id", "exact", false).
		Eq("user_id", fixture.testUserID).
		Execute()
	json.Unmarshal(dataAfter, &historyAfter)
	historyCountAfter := len(historyAfter)

	assert.Greater(t, historyCountAfter, historyCountBefore, "No credit_history entry created")
	t.Logf("✓ Credit history logged (%d -> %d entries)", historyCountBefore, historyCountAfter)
}

// TestRefundCredits_DeniedReservation_RefundsCorrectly verifies that when an
// admin denies a pending reservation, credits are refunded via the RPC.
func TestRefundCredits_DeniedReservation_RefundsCorrectly(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	// Arrange: Create reservation
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 10, 14) // 5 days
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)

	// Act: Admin denies reservation
	updateCmd := types.UpdateReservationCommand{
		Status: stringPtr("DENIED"),
	}
	_, err = fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUser2ID, "admin")
	require.NoError(t, err)

	// Assert: Refund applied
	balanceAfter := fixture.getUserBalance(fixture.testUserID)
	refundAmount := balanceAfter - balanceAfterCreate
	expectedRefund := 5 * fixture.costPerDay

	assert.Equal(t, expectedRefund, refundAmount)
	t.Logf("✓ Admin denial refunded %d credits", refundAmount)
}

// ============================================================================
// P1.3: update_reservation_with_audit - Audit Trail Verification
// ============================================================================

// TestUpdateAudit_StatusChange_CreatesAuditEntry verifies that updating
// reservation status creates an entry in reservation_history table.
func TestUpdateAudit_StatusChange_CreatesAuditEntry(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	// Arrange: Create reservation (status: PENDING)
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)

	// Get audit trail before update
	type auditEntry struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	var auditBefore []auditEntry
	dataBefore, _, _ := fixture.client.From("reservation_history").
		Select("id,status", "exact", false).
		Eq("reservation_id", reservationID).
		Execute()
	json.Unmarshal(dataBefore, &auditBefore)
	auditCountBefore := len(auditBefore)
	t.Logf("Audit entries before: %d", auditCountBefore)

	// Act: Update status to RENTED
	updateCmd := types.UpdateReservationCommand{
		Status: stringPtr("RENTED"),
	}
	resp, err := fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUser2ID, "admin")
	require.NoError(t, err)
	assert.Equal(t, "RENTED", resp.Status)

	// Assert: Audit entry created
	var auditAfter []auditEntry
	dataAfter, _, _ := fixture.client.From("reservation_history").
		Select("id,status", "exact", false).
		Eq("reservation_id", reservationID).
		Order("created_at", nil).
		Execute()
	json.Unmarshal(dataAfter, &auditAfter)
	auditCountAfter := len(auditAfter)

	assert.Greater(t, auditCountAfter, auditCountBefore, "No audit entry created")
	t.Logf("✓ Audit trail: %d -> %d entries", auditCountBefore, auditCountAfter)

	// Verify the new entry contains the OLD status (audit records state before change)
	latestEntry := auditAfter[len(auditAfter)-1]
	assert.Equal(t, "PENDING", latestEntry.Status, "Audit entry should record old status")
	t.Logf("✓ Audit entry preserves old status: %s", latestEntry.Status)
}

// TestUpdateAudit_DateChange_RecordsOldDates verifies that when dates are
// modified, the audit trail records the OLD values for historical reference.
func TestUpdateAudit_DateChange_RecordsOldDates(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	originalStart := dateOffset(5)
	originalEnd := dateOffset(7)

	// Arrange: Create reservation
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)

	// Act: Modify dates
	newEnd := dateOffset(10)
	updateCmd := types.UpdateReservationCommand{
		EndDate: &newEnd,
	}
	_, err = fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
	require.NoError(t, err)

	// Assert: Fetch audit trail
	type auditEntry struct {
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
	}
	var auditEntries []auditEntry
	data, _, _ := fixture.client.From("reservation_history").
		Select("start_date,end_date", "exact", false).
		Eq("reservation_id", reservationID).
		Order("created_at", nil).
		Execute()
	json.Unmarshal(data, &auditEntries)

	// The audit should contain at least one entry with ORIGINAL dates
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

// ============================================================================
// P1.5: bulk_update_reservations_status - Bulk Refund Tests
// ============================================================================

// TestBulkUpdate_DenyMultiple_RefundsAllCredits verifies that bulk denial
// of multiple reservations refunds credits to ALL affected users atomically.
func TestBulkUpdate_DenyMultiple_RefundsAllCredits(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	// Arrange: Create 2 reservations for different users
	res1ID, err := fixture.createTestReservation(fixture.testUserID, 5, 7) // 3 days
	require.NoError(t, err)
	balance1After := fixture.getUserBalance(fixture.testUserID)

	res2ID, err := fixture.createTestReservation(fixture.testUser2ID, 10, 13) // 4 days
	require.NoError(t, err)
	balance2After := fixture.getUserBalance(fixture.testUser2ID)

	// Act: Bulk deny both reservations
	updateCmd := types.BulkUpdateReservationsCommand{
		ReservationIDs: []string{res1ID, res2ID},
		Status:         "DENIED",
	}
	resp, err := fixture.svc.BulkUpdate(ctx, updateCmd, fixture.testUser2ID)
	require.NoError(t, err)
	assert.Equal(t, 2, resp.UpdatedCount)

	// Assert: Both users refunded
	balance1Final := fixture.getUserBalance(fixture.testUserID)
	balance2Final := fixture.getUserBalance(fixture.testUser2ID)

	refund1 := balance1Final - balance1After
	refund2 := balance2Final - balance2After

	expectedRefund1 := 3 * fixture.costPerDay
	expectedRefund2 := 4 * fixture.costPerDay

	assert.Equal(t, expectedRefund1, refund1, "User1 refund mismatch")
	assert.Equal(t, expectedRefund2, refund2, "User2 refund mismatch")
	t.Logf("✓ Bulk denial refunded: User1=%d, User2=%d credits", refund1, refund2)
}

// ============================================================================
// Helper Functions
// ============================================================================

func stringPtr(s string) *string {
	return &s
}
