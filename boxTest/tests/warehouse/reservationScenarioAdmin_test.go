package warehouseTests

import (
	"boxTest/common/app"
	"boxTest/tests"
	"log"
	"testing"
	"time"
)

func reservationAdminSkippedActions(transitions changeHistory) {
	testSetUp()
	items := user.GetAvailableItems(time.Now(), time.Now().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	testCases := []testCase{
		{
			name:                "Reservation with skipped admin actions",
			startTime:           time.Now().AddDate(0, 0, 1),
			endTime:             time.Now().AddDate(0, 0, 7),
			transition:          make(changeHistory),
			item:                app.Item{},
			creditsWhenCreated:  0,
			creditsWhenReturned: 0,
		}}
	for _, tc := range testCases {
		testSetUp()
		defer testTearDown()
		log.Printf("TEST reservation case:\n\t %v since %v till %v", tc.name, tc.startTime, tc.endTime)
		tc.transition = transitions
		tc.creditsWhenCreated = tests.CalculateCost(reservedItem.Type, tc.startTime, tc.endTime)
		tc.creditsWhenReturned = expectedCostAtTheEndBasedOnActions(transitions, tc.startTime, tc.endTime, reservedItem.Type)
		tc.item = reservedItem
		BaseScenario(tc)
		testTearDown()
		log.Printf("TEST reservation case %v PASSED", tc.name)
	}
}

func Test_reservationAdminDoesNoting(t *testing.T) {
	reservationAdminSkippedActions(changeHistory{
		app.PENDING: {status: app.PENDING, timestamp: time.Now()},
	})
}

func Test_reservationAdminDoesntApprove(t *testing.T) {
	reservationAdminSkippedActions(
		changeHistory{
			app.PENDING:  {status: app.PENDING, timestamp: time.Now()},
			app.RENTED:   {status: app.RENTED, timestamp: time.Now().AddDate(0, 0, 2)},
			app.RETURNED: {status: app.RETURNED, timestamp: time.Now().AddDate(0, 0, 8)},
		},
	)
}

func Test_AdminDoesntRent(t *testing.T) {
	reservationAdminSkippedActions(
		changeHistory{
			app.PENDING:  {status: app.PENDING, timestamp: time.Now()},
			app.APPROVED: {status: app.APPROVED, timestamp: time.Now()},
			app.RETURNED: {status: app.RETURNED, timestamp: time.Now().AddDate(0, 0, 8)},
		},
	)
}

func Test_AdminDoesntReturn(t *testing.T) {
	reservationAdminSkippedActions(
		changeHistory{
			app.PENDING:  {status: app.PENDING, timestamp: time.Now()},
			app.APPROVED: {status: app.APPROVED, timestamp: time.Now()},
			app.RENTED:   {status: app.RENTED, timestamp: time.Now().AddDate(0, 0, 2)},
		},
	)
}

func Test_AdminCancelReservation(t *testing.T) {
	reservationAdminSkippedActions(
		changeHistory{
			app.PENDING:  {status: app.PENDING, timestamp: time.Now()},
			app.APPROVED: {status: app.APPROVED, timestamp: time.Now()},
			app.RENTED:   {status: app.RENTED, timestamp: time.Now().AddDate(0, 0, 2)},
		},
	)
}
