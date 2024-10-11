package warehouseTests

import (
	"boxTest/handlers/app"
	"boxTest/tests"
	"boxTest/tests/warehouse/common"
	"testing"
	"time"
)

var (
	endDay   = 7
	startDay = 1
)

func reservationAdminSkippedActions(transitions common.ChangeHistory, testName string) {
	common.TestSetUp()
	items := common.User.GetAvailableItems(time.Now(), time.Now().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	testCases := []common.TestCase{
		{
			Name:                testName,
			StartTime:           time.Now().AddDate(0, 0, startDay),
			EndTime:             time.Now().AddDate(0, 0, endDay),
			Transition:          make(common.ChangeHistory),
			Item:                app.Item{},
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		}}
	for _, tc := range testCases {
		common.TestSetUp()
		tc.Transition = transitions
		tc.CreditsWhenCreated = tests.CalculateCost(reservedItem.Type, tc.StartTime, tc.EndTime)
		tc.CreditsWhenReturned = common.ExpectedCostAtTheEndBasedOnActions(transitions, tc.StartTime, tc.EndTime, reservedItem.Type)
		tc.Item = reservedItem
		common.BaseScenario(tc)
		common.TestTearDown()
	}
}

func Test_reservationAdminDoesNothing(t *testing.T) {
	reservationAdminSkippedActions(common.ChangeHistory{
		app.PENDING: {Status: app.PENDING, Timestamp: time.Now()},
	},
		"Admin does no status change",
	)
}

func Test_reservationAdminDoesntApprove(t *testing.T) {
	reservationAdminSkippedActions(
		common.ChangeHistory{
			app.PENDING:  {Status: app.PENDING, Timestamp: time.Now()},
			app.RENTED:   {Status: app.RENTED, Timestamp: time.Now().AddDate(0, 0, startDay+1)},
			app.RETURNED: {Status: app.RETURNED, Timestamp: time.Now().AddDate(0, 0, endDay+1)},
		},
		"Admin doesn't change status to APPROVED",
	)
}

func Test_AdminDoesntRent(t *testing.T) {
	reservationAdminSkippedActions(
		common.ChangeHistory{
			app.PENDING:  {Status: app.PENDING, Timestamp: time.Now()},
			app.APPROVED: {Status: app.APPROVED, Timestamp: time.Now()},
			app.RETURNED: {Status: app.RETURNED, Timestamp: time.Now().AddDate(0, 0, endDay+1)},
		},
		"Admin doesn't change status to RENTED",
	)
}

func Test_AdminDoesntReturn(t *testing.T) {
	reservationAdminSkippedActions(
		common.ChangeHistory{
			app.PENDING:  {Status: app.PENDING, Timestamp: time.Now()},
			app.APPROVED: {Status: app.APPROVED, Timestamp: time.Now()},
			app.RENTED:   {Status: app.RENTED, Timestamp: time.Now().AddDate(0, 0, startDay+1)},
		},
		"Admin doesn't change status to RETURNED",
	)
}

func Test_AdminDeniesReservation(t *testing.T) {
	reservationAdminSkippedActions(
		common.ChangeHistory{
			app.PENDING: {Status: app.PENDING, Timestamp: time.Now()},
			app.DENIED:  {Status: app.DENIED, Timestamp: time.Now()},
		},
		"Admin denies reservation immediately",
	)
}

func Test_AdminDeniesReservationAfterApproving(t *testing.T) {
	reservationAdminSkippedActions(
		common.ChangeHistory{
			app.PENDING:  {Status: app.PENDING, Timestamp: time.Now()},
			app.APPROVED: {Status: app.APPROVED, Timestamp: time.Now()},
			app.DENIED:   {Status: app.DENIED, Timestamp: time.Now()},
		},
		"Admin denies reservation after approving",
	)
}
