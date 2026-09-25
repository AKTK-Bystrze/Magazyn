//go:build integration

package reservation_test

import (
	"context"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTS3_EarlyReturn(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Reservation: days 5-10 (6 days), returned early on day 5 (admin marks RETURNED)
	resID, err := fixture.createTestReservation(fixture.testUserID, 5, 10)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	returnStatus := constants.ReservationStatusReturned
	resp, err := fixture.svc.Update(ctx, resID,
		types.UpdateReservationCommand{Status: &returnStatus},
		fixture.testUser2ID, "admin")
	require.NoError(t, err)
	assert.Equal(t, constants.ReservationStatusReturned, resp.Status, "Status should be RETURNED")
	// Balance unchanged: RETURNED does not trigger a refund
	assert.Equal(t, balanceAfterCreate, fixture.getUserBalance(fixture.testUserID), "No credit change on RETURNED status")
	t.Logf("✓ TS-3 early return: status=RETURNED, balance unchanged")
}
func TestTS3_OnTimeReturn(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Reservation: today only (start=today, end=today)
	resID, err := fixture.createTestReservation(fixture.testUserID, 0, 0)
	require.NoError(t, err)
	returnStatus := constants.ReservationStatusReturned
	resp, err := fixture.svc.Update(ctx, resID,
		types.UpdateReservationCommand{Status: &returnStatus},
		fixture.testUser2ID, "admin")
	require.NoError(t, err)
	assert.Equal(t, constants.ReservationStatusReturned, resp.Status)
	t.Logf("✓ TS-3 on-time return: status=RETURNED")
}
func TestTS3_LateReturn_Succeeds(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	// Reservation A: testUser, days -5 to -2 (declared end date was 2 days ago)
	resAID, err := fixture.createTestReservation(fixture.testUserID, -5, -2)
	require.NoError(t, err)
	// Reservation B: testUser2, adjacent booking starting day -1 to +3 (started yesterday)
	_, err = fixture.createTestReservation(fixture.testUser2ID, -1, 3)
	require.NoError(t, err)
	// Admin marks reservation A as RETURNED today (2 days after declared end date)
	returnStatus := constants.ReservationStatusReturned
	resp, err := fixture.svc.Update(ctx, resAID,
		types.UpdateReservationCommand{Status: &returnStatus},
		fixture.testUser2ID, "admin")
	require.NoError(t, err, "Late return must NOT be blocked by the system")
	assert.Equal(t, constants.ReservationStatusReturned, resp.Status)
	t.Logf("✓ TS-3 late return: allowed - admin must handle follow-up reservation manually")
}
