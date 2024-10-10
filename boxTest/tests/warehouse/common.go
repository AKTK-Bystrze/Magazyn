package warehouseTests

import (
	"boxTest/env"
	"boxTest/handlers/app"
	"boxTest/handlers/db"
	"boxTest/tests"
	"log"
	"time"
)

var (
	user  = app.UserClient{}
	admin = app.UserClient{}
)

type changeHistory map[string]change

type change struct {
	status    string
	timestamp time.Time
}

type testCase struct {
	name                string
	startTime           time.Time
	endTime             time.Time
	transition          changeHistory
	item                app.Item
	creditsWhenCreated  int
	creditsWhenReturned int
}

func testSetUp() {
	log.Print("\n\tSET UP...")
	user = app.UserClient{
		User:   db.USERS_MAP[app.UserName1],
		Client: app.CreateHttpClient(),
	}
	user.Login()
	admin = app.UserClient{
		User:   db.USERS_MAP[app.AdminName1],
		Client: app.CreateHttpClient(),
	}
	admin.Login()
	db.RemoveReservations()
	db.RemoveAudits()
	log.Print("\n\tSETTED")
}

func testTearDown() {
	log.Print("\n\tCLEAN UP...")
	user.LogOut()
	admin.LogOut()
	env.RevertContainerTime(env.TEST_APP_NAME)
	db.RemoveReservations()
	db.RemoveAudits()
	log.Print("\n\tCLEANED")
}

func BaseScenario(tc testCase) {
	log.Printf("TESTCASE \n\n%v\n\n", tc)
	userBefore := db.GetUserById(int(user.User.ID))
	reserveWithTimestamp(tc.transition[app.PENDING], tc.startTime, tc.endTime, tc.item.ID)
	checkCredits(userBefore, tc.creditsWhenCreated)
	reservation := db.GetReservation(
		db.ByItemID(tc.item.ID),
		db.ByStatus(app.PENDING),
		db.ByUserID(int(user.User.ID)),
		db.ByStartTime(tc.startTime),
		db.ByEndTime(tc.endTime),
	)
	checkItemAvailabilityWhileReserved(tc.startTime, tc.endTime, tc.item, user)
	adminActions(tc.transition, reservation)
	checkCredits(userBefore, tc.creditsWhenReturned)
	checkItemAvailabilityAfterReservation(tc)
	checkReservationAudits(reservation.ID, tc.transition)
	log.Printf("TESTCASE PASSED \n\n%v\n\n", tc)
}

func checkItemAvailabilityAfterReservation(tc testCase) {
	log.Print("Check item avaiablity after the reservation")
	keys := getKeys(tc.transition)
	if contains(keys, app.DENIED) {
		items := user.GetAvailableItems(tc.startTime, tc.endTime)
		if !tests.IsItemAvailable(tc.item, items) {
			log.Fatal("Reserved item should be available after reservation is done within reservation time due to denial")
		}
	}
	var endTime time.Time
	if contains(keys, app.RETURNED) {
		endTime = tc.transition[app.RETURNED].timestamp
	} else {
		endTime = tc.endTime
	}
	items := user.GetAvailableItems(endTime.AddDate(0, 0, 1), endTime.AddDate(0, 0, 1).Add(2*time.Hour))
	if !tests.IsItemAvailable(tc.item, items) {
		log.Fatal("Reserved item should be available after reservation is is finished")
	}

}

func adminActions(actions changeHistory, reservation app.Reservation) {
	for actionName, action := range actions {
		if contains(app.ADMIN_ACTIONS, actionName) {
			log.Printf("Performing action for key: %v, status: %v", actionName, action)
			changeReservationStatusWithTimestamp(action, reservation)
		}
	}
}

func checkCredits(userBefore app.User, expectedCost int) {
	log.Print("check user credits ")
	userAfter := db.GetUserById(int(userBefore.ID))
	expectedUserCreditsAfter := userBefore.Credits - expectedCost
	if userAfter.Credits != expectedUserCreditsAfter {
		calculatedCost := userAfter.Credits - userBefore.Credits
		log.Fatalf("User credits is %v, should be %v\n expected cost %v calculated cost %v",
			userAfter.Credits, expectedUserCreditsAfter, expectedCost, calculatedCost)
	}
}

func expectedCostAtTheEndBasedOnActions(actions changeHistory, startTime time.Time, endTime time.Time, reservedItem string) int {
	actionsToPerformByAdmin := getKeys(actions)
	reservationSince := startTime
	reservationTill := endTime
	if contains(actionsToPerformByAdmin, app.RENTED) {
		reservationSince = actions[app.RENTED].timestamp
	}
	if contains(actionsToPerformByAdmin, app.RETURNED) {
		reservationTill = actions[app.RETURNED].timestamp
	}
	if contains(actionsToPerformByAdmin, app.DENIED) {
		return 0
	}
	return tests.CalculateCost(reservedItem, reservationSince, reservationTill)
}

func checkItemAvailabilityWhileReserved(reservationStart time.Time, reservationEnd time.Time, reservedItem app.Item, user app.UserClient) {
	log.Printf("Check item availability")
	log.Printf("Check item availability - same time")
	items := user.GetAvailableItems(reservationStart, reservationEnd)
	if tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item shouldn't be available when reserved")
	}
	if !tests.IsSameDay(reservationStart, time.Now()) && reservationStart.AddDate(0, 0, -1).After(time.Now()) {
		log.Printf("Check item availability - before")
		items = user.GetAvailableItems(time.Now(), reservationStart.AddDate(0, 0, -1))
		if !tests.IsItemAvailable(reservedItem, items) {
			log.Fatal("Reserved item should be available before reservation")
		}
	}
	log.Printf("Check item availability - after")
	items = user.GetAvailableItems(reservationEnd.AddDate(0, 0, 1), reservationEnd.AddDate(0, 0, 2))
	if !tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item should be available after reservation")
	}
	if tests.IsSameDay(reservationStart, reservationEnd) {
		log.Printf("Check item availability - overlapping")
		items = user.GetAvailableItems(reservationStart, reservationEnd.AddDate(0, 0, 1))
		if tests.IsItemAvailable(reservedItem, items) {
			log.Fatal("Reserved item shouldn't be available in overlapping durations")
		}
	} else {
		log.Printf("Check item availability - overlapping")
		items = user.GetAvailableItems(reservationStart.AddDate(0, 0, 1), reservationEnd.AddDate(0, 0, 1))
		if tests.IsItemAvailable(reservedItem, items) {
			log.Fatal("Reserved item shouldn't be available in overlapping durations")
		}
	}
}

func reserveWithTimestamp(change change, reservationStart time.Time, reservationEnd time.Time, itemId int) {
	env.SetContainerTime(change.timestamp.Add(-1*time.Minute), env.TEST_APP_NAME)
	user.ReserveItem(itemId, reservationStart, reservationEnd)
	env.RevertContainerTime(env.TEST_APP_NAME)
}

func changeReservationStatusWithTimestamp(change change, reservation app.Reservation) {
	env.SetContainerTime(change.timestamp.Add(-1*time.Minute), env.TEST_APP_NAME)
	changeReservationStatus(change.status, reservation)
	env.RevertContainerTime(env.TEST_APP_NAME)
}

func changeReservationStatus(status string, reservation app.Reservation) {
	admin.ChangeReservationStatus(reservation, status)
	reservationLoaded := db.GetReservation(db.ByID(reservation.ID))
	if reservationLoaded.Status != status {
		log.Fatalf("status didn't change. Want %v have %v", status, reservation.Status)
	}
}

func checkReservationAudits(reservationId int, expectedChangesHistory changeHistory) {
	log.Print("check reservation history")
	history := db.GetReservationAudit(reservationId)
	if len(history) != len(expectedChangesHistory) {
		log.Fatal("Changes history has different length than expected")
	}
	keys := []string{app.PENDING, app.APPROVED, app.RENTED, app.RETURNED}
	for i, audit := range history {
		expectedChange := expectedChangesHistory[keys[i]]
		if audit.Auditor != admin.User.Name &&
			tests.IsSameDay(audit.ChangeDate, expectedChange.timestamp) &&
			audit.Status != expectedChange.status {
			log.Fatalf("Reservation change should be %v but is %v", expectedChange, audit)
		}
	}
}

func contains(list []string, key string) bool {
	for _, item := range list {
		if item == key {
			return true
		}
	}
	return false
}

func getKeys(ch changeHistory) []string {
	keys := make([]string, 0, len(ch))
	for key := range ch {
		keys = append(keys, key)
	}
	return keys
}
