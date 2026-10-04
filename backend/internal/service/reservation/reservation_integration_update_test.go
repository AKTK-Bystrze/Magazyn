//go:build integration

package reservation_test

import (
	"context"
	"magazyn/backend/internal/types"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestModifyDates_ExtendEnd(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Arrange: Create user reservation (days 5-7, 3 days)
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	// Act: Extend End by 3 days (5-10, total 6 days)
	// Additional cost = 3 days * costPerDay
	updateCmd := types.UpdateReservationCommand{
		EndDate: dateStringPtr(dateOffset(10)),
	}
	resp, err := fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
	// Assert
	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, dateOffset(10), resp.EndDate)
	balanceAfterUpdate := fixture.getUserBalance(fixture.testUserID)
	costDifference := balanceAfterCreate - balanceAfterUpdate
	expectedDifference := 3 * fixture.costPerDay
	assert.Equal(t, expectedDifference, costDifference)
	t.Logf("Extended reservation: charged %d credits for 3 extra days ✓", costDifference)
}
func TestModifyDates_ExtendStart(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Arrange: Days 5-7
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	// Act: Extend Start earlier by 2 days (3-7, total 5 days (+2))
	updateCmd := types.UpdateReservationCommand{
		StartDate: dateStringPtr(dateOffset(3)),
	}
	resp, err := fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
	// Assert
	require.NoError(t, err)
	assert.Equal(t, dateOffset(3), resp.StartDate)
	balanceAfterUpdate := fixture.getUserBalance(fixture.testUserID)
	expectedDifference := 2 * fixture.costPerDay
	assert.Equal(t, expectedDifference, balanceAfterCreate-balanceAfterUpdate)
	t.Logf("Extended start: charged %d credits for 2 extra days ✓", expectedDifference)
}
func TestModifyDates_ExtendBoth(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Arrange: Days 5-7
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	// Act: Extend both (3-10, total 8 days (was 3) => +5 days)
	updateCmd := types.UpdateReservationCommand{
		StartDate: dateStringPtr(dateOffset(3)),
		EndDate:   dateStringPtr(dateOffset(10)),
	}
	_, err = fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
	// Assert
	require.NoError(t, err)
	balanceAfterUpdate := fixture.getUserBalance(fixture.testUserID)
	expectedDifference := 5 * fixture.costPerDay
	assert.Equal(t, expectedDifference, balanceAfterCreate-balanceAfterUpdate)
	t.Logf("Extended both: charged %d credits for 5 extra days ✓", expectedDifference)
}
func TestModifyDates_ShortenEnd(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Arrange: Days 5-10 (6 days)
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 10)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	// Act: Shorten to 5-7 (3 days, remove 3 days)
	updateCmd := types.UpdateReservationCommand{
		EndDate: dateStringPtr(dateOffset(7)),
	}
	resp, err := fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
	// Assert
	require.NoError(t, err)
	assert.Equal(t, dateOffset(7), resp.EndDate)
	balanceAfterUpdate := fixture.getUserBalance(fixture.testUserID)
	refundAmount := balanceAfterUpdate - balanceAfterCreate
	expectedRefund := 3 * fixture.costPerDay
	assert.Equal(t, expectedRefund, refundAmount)
	t.Logf("Shortened end: refunded %d credits for 3 days ✓", refundAmount)
}
func TestModifyDates_ShortenStart(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Arrange: Days 5-10 (6 days)
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 10)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	// Act: Shorten to 8-10 (3 days, remove first 3 days)
	updateCmd := types.UpdateReservationCommand{
		StartDate: dateStringPtr(dateOffset(8)),
	}
	resp, err := fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
	// Assert
	require.NoError(t, err)
	assert.Equal(t, dateOffset(8), resp.StartDate)
	balanceAfterUpdate := fixture.getUserBalance(fixture.testUserID)
	refundAmount := balanceAfterUpdate - balanceAfterCreate
	expectedRefund := 3 * fixture.costPerDay
	assert.Equal(t, expectedRefund, refundAmount)
	t.Logf("Shortened start: refunded %d credits ✓", refundAmount)
}
func TestModifyDates_ShortenBoth(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Arrange: Days 5-10 (6 days)
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 10)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	// Act: Shorten to 3 days (6-8)
	updateCmd := types.UpdateReservationCommand{
		StartDate: dateStringPtr(dateOffset(6)),
		EndDate:   dateStringPtr(dateOffset(8)),
	}
	_, err = fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
	// Assert
	require.NoError(t, err)
	balanceAfterUpdate := fixture.getUserBalance(fixture.testUserID)
	refundAmount := balanceAfterUpdate - balanceAfterCreate
	expectedRefund := 3 * fixture.costPerDay
	assert.Equal(t, expectedRefund, refundAmount)
	t.Logf("Shortened both: refunded %d credits ✓", refundAmount)
}
func TestModifyDates_ShiftLater(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Arrange: Days 5-7 (3 days)
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	// Act: Shift to 10-12 (3 days)
	updateCmd := types.UpdateReservationCommand{
		StartDate: dateStringPtr(dateOffset(10)),
		EndDate:   dateStringPtr(dateOffset(12)),
	}
	_, err = fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
	// Assert
	require.NoError(t, err)
	balanceAfterUpdate := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, balanceAfterCreate, balanceAfterUpdate)
	t.Logf("Shifted dates: cost remained Unchanged ✓")
}
func TestModifyDates_ShiftEarlier(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Arrange: Days 10-12 (3 days)
	reservationID, err := fixture.createTestReservation(fixture.testUserID, 10, 12)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	// Act: Shift to 5-7 (3 days)
	updateCmd := types.UpdateReservationCommand{
		StartDate: dateStringPtr(dateOffset(5)),
		EndDate:   dateStringPtr(dateOffset(7)),
	}
	_, err = fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
	// Assert
	require.NoError(t, err)
	balanceAfterUpdate := fixture.getUserBalance(fixture.testUserID)
	assert.Equal(t, balanceAfterCreate, balanceAfterUpdate)
	t.Logf("Shifted earlier: cost remained Unchanged ✓")
}
func TestModifyDates_ConflictWithOther(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Arrange: User 1 has 5-7
	resID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	// Arrange: User 2 blocks 10-12
	_, err = fixture.createTestReservation(fixture.testUser2ID, 10, 12)
	require.NoError(t, err)
	// Act: User 1 tries to extend into User 2 (5-11)
	updateCmd := types.UpdateReservationCommand{
		EndDate: dateStringPtr(dateOffset(11)),
	}
	_, err = fixture.svc.Update(ctx, resID, updateCmd, fixture.testUserID, "user")
	// Assert: Should fail
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Dates not available")
	t.Logf("Modification blocked by conflict ✓")
}
func TestModifyDates_AdjacentToOther(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Arrange: User 1 has 5-7
	resID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
	require.NoError(t, err)
	// Arrange: User 2 blocks 10-12
	// NOTE: In this system, dates are inclusive.
	// If User 2 has 10-12, User 1 can safely extend up to day 9.
	// 5-9 ends on day 9. Day 10 starts User 2. (Adjacent)
	_, err = fixture.createTestReservation(fixture.testUser2ID, 10, 12)
	require.NoError(t, err)
	// Act: User 1 extends to 5-9
	updateCmd := types.UpdateReservationCommand{
		EndDate: dateStringPtr(dateOffset(9)),
	}
	resp, err := fixture.svc.Update(ctx, resID, updateCmd, fixture.testUserID, "user")
	// Assert
	require.NoError(t, err)
	assert.Equal(t, dateOffset(9), resp.EndDate)
	t.Logf("Modification to adjacent dates succeeded ✓")
}
