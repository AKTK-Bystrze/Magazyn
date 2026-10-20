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
	resID, err := fixture.createTestReservation(fixture.testUserID, 5, 10)
	require.NoError(t, err)
	balanceAfterCreate := fixture.getUserBalance(fixture.testUserID)
	returnStatus := constants.ReservationStatusReturned
	resp, err := fixture.svc.Update(ctx, resID,
		types.UpdateReservationCommand{Status: &returnStatus},
		fixture.testUser2ID, "admin")
	require.NoError(t, err)
	assert.Equal(t, constants.ReservationStatusReturned, resp.Status, "Status should be RETURNED")
	assert.Equal(t, balanceAfterCreate, fixture.getUserBalance(fixture.testUserID), "No credit change on RETURNED status")
	t.Logf("✓ TS-3 early return: status=RETURNED, balance unchanged")
}
func TestTS3_OnTimeReturn(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
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
	resAID, err := fixture.createTestReservation(fixture.testUserID, -5, -2)
	require.NoError(t, err)
	_, err = fixture.createTestReservation(fixture.testUser2ID, -1, 3)
	require.NoError(t, err)
	returnStatus := constants.ReservationStatusReturned
	resp, err := fixture.svc.Update(ctx, resAID,
		types.UpdateReservationCommand{Status: &returnStatus},
		fixture.testUser2ID, "admin")
	require.NoError(t, err, "Late return must NOT be blocked by the system")
	assert.Equal(t, constants.ReservationStatusReturned, resp.Status)
	t.Logf("✓ TS-3 late return: allowed - admin must handle follow-up reservation manually")
}

func TestTS3_Return_ZeroBalance_StandardReturnSucceeds(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	resID, err := fixture.createTestReservation(fixture.testUserID, 0, 0)
	require.NoError(t, err)

	// Set user balance to 0 credits to test boundary condition
	fixture.setUserBalance(fixture.testUserID, 0)
	require.Equal(t, int32(0), fixture.getUserBalance(fixture.testUserID))

	returnStatus := constants.ReservationStatusReturned
	resp, err := fixture.svc.Update(ctx, resID,
		types.UpdateReservationCommand{Status: &returnStatus},
		fixture.testUser2ID, "admin")
	require.NoError(t, err, "Return should succeed even when user balance is zero")
	assert.Equal(t, constants.ReservationStatusReturned, resp.Status)
	assert.Equal(t, int32(0), fixture.getUserBalance(fixture.testUserID), "Balance should remain zero")
	t.Logf("✓ TS-3 zero balance return: allowed without errors")
}

func TestTS3_Return_ExistingNegativeBalance(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	resID, err := fixture.createTestReservation(fixture.testUserID, 0, 0)
	require.NoError(t, err)

	// Set user balance to negative credits (-5)
	fixture.setUserBalance(fixture.testUserID, -5)
	require.Equal(t, int32(-5), fixture.getUserBalance(fixture.testUserID))

	returnStatus := constants.ReservationStatusReturned
	resp, err := fixture.svc.Update(ctx, resID,
		types.UpdateReservationCommand{Status: &returnStatus},
		fixture.testUser2ID, "admin")
	require.NoError(t, err, "Returning equipment must be allowed when user has negative balance")
	assert.Equal(t, constants.ReservationStatusReturned, resp.Status)
	assert.Equal(t, int32(-5), fixture.getUserBalance(fixture.testUserID), "Negative balance preserved")
	t.Logf("✓ TS-3 return with existing negative balance allowed")
}

func TestTS3_User_Return_ExistingNegativeBalance(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	resID, err := fixture.createTestReservation(fixture.testUserID, 0, 0)
	require.NoError(t, err)

	// Set user balance to negative credits (-5)
	fixture.setUserBalance(fixture.testUserID, -5)
	require.Equal(t, int32(-5), fixture.getUserBalance(fixture.testUserID))

	returnStatus := constants.ReservationStatusReturned
	resp, err := fixture.svc.Update(ctx, resID,
		types.UpdateReservationCommand{Status: &returnStatus},
		fixture.testUserID, "user")
	require.NoError(t, err, "User must be allowed to return reservation with negative balance")
	assert.Equal(t, constants.ReservationStatusReturned, resp.Status)
	assert.Equal(t, int32(-5), fixture.getUserBalance(fixture.testUserID), "Negative balance preserved")
	t.Logf("✓ TS-3 user return with negative balance succeeded")
}

func TestTS3_User_Return_RentedOverdue(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	// Reservation in past (-3 to -1 days)
	resID, err := fixture.createTestReservation(fixture.testUserID, -3, -1)
	require.NoError(t, err)

	// Admin marked it RENTED
	rentedStatus := constants.ReservationStatusRented
	_, err = fixture.svc.Update(ctx, resID,
		types.UpdateReservationCommand{Status: &rentedStatus},
		fixture.testUser2ID, "admin")
	require.NoError(t, err)

	// Owner returns overdue rented reservation
	returnStatus := constants.ReservationStatusReturned
	resp, err := fixture.svc.Update(ctx, resID,
		types.UpdateReservationCommand{Status: &returnStatus},
		fixture.testUserID, "user")
	require.NoError(t, err, "Owner must be allowed to return overdue rented reservation")
	assert.Equal(t, constants.ReservationStatusReturned, resp.Status)
	t.Logf("✓ TS-3 owner return of overdue rented reservation succeeded")
}

func TestTS3_NonOwner_CannotReturn(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	resID, err := fixture.createTestReservation(fixture.testUserID, 0, 1)
	require.NoError(t, err)

	// Non-owner (testUser2ID) tries to return it as a regular user
	returnStatus := constants.ReservationStatusReturned
	_, err = fixture.svc.Update(ctx, resID,
		types.UpdateReservationCommand{Status: &returnStatus},
		fixture.testUser2ID, "user")
	require.Error(t, err, "Non-owner should be forbidden from returning someone else's reservation")
	assert.IsType(t, &types.ForbiddenError{}, err)
	t.Logf("✓ TS-3 non-owner return rejected with ForbiddenError")
}
