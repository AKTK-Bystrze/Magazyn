package warehouseTests

import (
	"boxTest/common/app"
	"boxTest/tests"
	"log"
	"testing"
	"time"
)

var (
	endDay   = 7
	startDay = 1
)

func reservationAdminSkippedActions(transitions changeHistory, testName string) {
	testSetUp()
	items := user.GetAvailableItems(time.Now(), time.Now().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	testCases := []testCase{
		{
			name:                testName,
			startTime:           time.Now().AddDate(0, 0, startDay),
			endTime:             time.Now().AddDate(0, 0, endDay),
			transition:          make(changeHistory),
			item:                app.Item{},
			creditsWhenCreated:  0,
			creditsWhenReturned: 0,
		}}
	for _, tc := range testCases {
		testSetUp()
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
	},
		"Admin does no status change",
	)
}

func Test_reservationAdminDoesntApprove(t *testing.T) {
	reservationAdminSkippedActions(
		changeHistory{
			app.PENDING:  {status: app.PENDING, timestamp: time.Now()},
			app.RENTED:   {status: app.RENTED, timestamp: time.Now().AddDate(0, 0, startDay+1)},
			app.RETURNED: {status: app.RETURNED, timestamp: time.Now().AddDate(0, 0, endDay+1)},
		},
		"Admin doesn't change status to APPROVED",
	)
}

func Test_AdminDoesntRent(t *testing.T) {
	reservationAdminSkippedActions(
		changeHistory{
			app.PENDING:  {status: app.PENDING, timestamp: time.Now()},
			app.APPROVED: {status: app.APPROVED, timestamp: time.Now()},
			app.RETURNED: {status: app.RETURNED, timestamp: time.Now().AddDate(0, 0, endDay+1)},
		},
		"Admin doesn't change status to RENTED",
	)
}

func Test_AdminDoesntReturn(t *testing.T) {
	reservationAdminSkippedActions(
		changeHistory{
			app.PENDING:  {status: app.PENDING, timestamp: time.Now()},
			app.APPROVED: {status: app.APPROVED, timestamp: time.Now()},
			app.RENTED:   {status: app.RENTED, timestamp: time.Now().AddDate(0, 0, startDay+1)},
		},
		"Admin doesn't change status to RETURNED",
	)
}

func Test_AdminDeniesReservation(t *testing.T) {
	reservationAdminSkippedActions(
		changeHistory{
			app.PENDING: {status: app.PENDING, timestamp: time.Now()},
			app.DENIED:  {status: app.DENIED, timestamp: time.Now()},
		},
		"Admin denies reservation immediately",
	)
}

func Test_AdminDeniesReservationAfterApproving(t *testing.T) {
	reservationAdminSkippedActions(
		changeHistory{
			app.PENDING:  {status: app.PENDING, timestamp: time.Now()},
			app.APPROVED: {status: app.APPROVED, timestamp: time.Now()},
			app.DENIED:   {status: app.DENIED, timestamp: time.Now()},
		},
		"Admin denies reservation after approving",
	)
}
