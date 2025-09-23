package warehouseTests

import (
	"boxTest/handlers/app"
	"boxTest/tests"
	"boxTest/tests/warehouse/common"
	"testing"
)

var (
	endDay   = 7
	startDay = 1
)

func reservationAdminSkippedActions(transitions *common.ChangeHistory, testName string) {
	common.TestSetUp("Suite_Test_reservationAdminSkippedActions_" + testName)
	items := common.User.GetAvailableItems(timeNow(), timeNow().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	testCases := []common.TestCase{
		{
			Name:                testName,
			StartTime:           timeNow().AddDate(0, 0, startDay),
			EndTime:             timeNow().AddDate(0, 0, endDay),
			Transition:          nil,
			Item:                app.Item{},
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		}}
	for _, tc := range testCases {
		common.TestSetUp(tc.Name)
		tc.Transition = transitions
		tc.CreditsWhenCreated = tests.CalculateCost(reservedItem.Type, tc.StartTime, tc.EndTime)
		tc.CreditsWhenReturned = common.ExpectedCostAtTheEndBasedOnActions(transitions, tc.StartTime, tc.EndTime, reservedItem.Type)
		tc.Item = reservedItem
		common.BaseScenario(tc)
	}
}
func Test_reservationAdminDoesNothing(t *testing.T) {
	changesHistory := common.NewChangeHistoryBuilder().
		AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: timeNow()}).
		Build()

	reservationAdminSkippedActions(changesHistory, "Admin does no status change")
}

func Test_AdminDoesntRent(t *testing.T) {
	changesHistory := common.NewChangeHistoryBuilder().
		AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: timeNow()}).
		AddChange(app.RETURNED, common.Change{Status: app.RETURNED, Timestamp: timeNow().AddDate(0, 0, endDay+1)}).
		Build()

	reservationAdminSkippedActions(changesHistory, "Admin doesn't change status to RENTED")
}

func Test_AdminDoesntReturn(t *testing.T) {
	changesHistory := common.NewChangeHistoryBuilder().
		AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: timeNow()}).
		AddChange(app.RENTED, common.Change{Status: app.RENTED, Timestamp: timeNow().AddDate(0, 0, startDay+1)}).
		Build()

	reservationAdminSkippedActions(changesHistory, "Admin doesn't change status to RETURNED")
}

func Test_AdminDeniesReservation(t *testing.T) {
	changesHistory := common.NewChangeHistoryBuilder().
		AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: timeNow()}).
		AddChange(app.DENIED, common.Change{Status: app.DENIED, Timestamp: timeNow()}).
		Build()

	reservationAdminSkippedActions(changesHistory, "Admin denies reservation immediately")
}
