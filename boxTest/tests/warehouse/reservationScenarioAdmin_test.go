package warehouseTests

import (
	"boxTest/common/app"
	"boxTest/tests"
	"log"
	"testing"
	"time"
)

func reservationWithAdminSkippedActions(actionsToSkip []string) {
	testSetUp()
	items := user.GetAvailableItems(time.Now(), time.Now().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	testCases := testCaseNotAsPlanned
	for _, tc := range testCases {
		testSetUp()
		defer testTearDown()
		log.Printf("TEST reservation case:\n\t %v since %v till %v", tc.name, tc.startTime, tc.endTime)
		changesHistory := changeHistory{
			app.PENDING:  {status: app.PENDING, timestamp: time.Now()},
			app.APPROVED: {status: app.APPROVED, timestamp: time.Now()},
			app.RENTED:   {status: app.RENTED, timestamp: tc.startTime},
			app.RETURNED: {status: app.RETURNED, timestamp: tc.endTime},
		}
		tc.transition = changesHistory
		expectedCost := tests.CalculateCost(reservedItem.Type, tc.startTime, tc.endTime)
		tc.creditsWhenCreated = expectedCost
		tc.creditsWhenReturned = expectedCost
		tc.item = reservedItem
		BaseScenario(tc, actionsToSkip)
		testTearDown()
		log.Printf("TEST reservation case %v PASSED", tc.name)
	}
}

func Test_reservationAdminDoesNoting(t *testing.T) {
	reservationWithAdminSkippedActions([]string{app.APPROVED, app.RENTED, app.RETURNED})
}

func Test_reservationAdminDoesntApprove(t *testing.T) {
	reservationWithAdminSkippedActions([]string{app.APPROVED})
}

func Test_AdminDoesntRent(t *testing.T) {
	reservationWithAdminSkippedActions([]string{app.RENTED})
}

func Test_AdminDoesntReturn(t *testing.T) {
	reservationWithAdminSkippedActions([]string{app.RETURNED})
}
