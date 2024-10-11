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

func reservationAdminSkippedActions(transitions *common.ChangeHistory, testName string) {
	common.TestSetUp()
	items := common.User.GetAvailableItems(time.Now(), time.Now().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	testCases := []common.TestCase{
		{
			Name:                testName,
			StartTime:           time.Now().AddDate(0, 0, startDay),
			EndTime:             time.Now().AddDate(0, 0, endDay),
			Transition:          nil,
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
	changesHistory := common.NewChangeHistoryBuilder().
		AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: time.Now()}).
		Build()

	reservationAdminSkippedActions(changesHistory, "Admin does no status change")
}

func Test_reservationAdminDoesntApprove(t *testing.T) {
	changesHistory := common.NewChangeHistoryBuilder().
		AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: time.Now()}).
		AddChange(app.RENTED, common.Change{Status: app.RENTED, Timestamp: time.Now().AddDate(0, 0, startDay+1)}).
		AddChange(app.RETURNED, common.Change{Status: app.RETURNED, Timestamp: time.Now().AddDate(0, 0, endDay+1)}).
		Build()

	reservationAdminSkippedActions(changesHistory, "Admin doesn't change status to APPROVED")
}

func Test_AdminDoesntRent(t *testing.T) { //todo
	changesHistory := common.NewChangeHistoryBuilder().
		AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: time.Now()}).
		AddChange(app.APPROVED, common.Change{Status: app.APPROVED, Timestamp: time.Now()}).
		AddChange(app.RETURNED, common.Change{Status: app.RETURNED, Timestamp: time.Now().AddDate(0, 0, endDay+1)}).
		Build()

	reservationAdminSkippedActions(changesHistory, "Admin doesn't change status to RENTED")
}

func Test_AdminDoesntReturn(t *testing.T) {
	changesHistory := common.NewChangeHistoryBuilder().
		AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: time.Now()}).
		AddChange(app.APPROVED, common.Change{Status: app.APPROVED, Timestamp: time.Now()}).
		AddChange(app.RENTED, common.Change{Status: app.RENTED, Timestamp: time.Now().AddDate(0, 0, startDay+1)}).
		Build()

	reservationAdminSkippedActions(changesHistory, "Admin doesn't change status to RETURNED")
}

func Test_AdminDeniesReservation(t *testing.T) {
	changesHistory := common.NewChangeHistoryBuilder().
		AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: time.Now()}).
		AddChange(app.DENIED, common.Change{Status: app.DENIED, Timestamp: time.Now()}).
		Build()

	reservationAdminSkippedActions(changesHistory, "Admin denies reservation immediately")
}

func Test_AdminDeniesReservationAfterApproving(t *testing.T) {
	changesHistory := common.NewChangeHistoryBuilder().
		AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: time.Now()}).
		AddChange(app.APPROVED, common.Change{Status: app.APPROVED, Timestamp: time.Now()}).
		AddChange(app.DENIED, common.Change{Status: app.DENIED, Timestamp: time.Now()}).
		Build()

	reservationAdminSkippedActions(changesHistory, "Admin denies reservation after approving")
}
