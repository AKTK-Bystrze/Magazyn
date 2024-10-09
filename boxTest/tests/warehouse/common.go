package warehouseTests

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"boxTest/common/db"
	"boxTest/env"
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
	log.Print("Test set up...")
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
}

func testTearDown() {
	log.Print("test clean up...")
	user.LogOut()
	admin.LogOut()
	env.RevertContainerTime(consts.TEST_APP_NAME)
	db.RemoveReservations()
	db.RemoveAudits()
}

func BaseScenario(tc testCase) {
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
	checkItemAvailability(tc.startTime, tc.endTime, tc.item, user)
	adminActions(tc.transition, reservation)
	checkCredits(userBefore, tc.creditsWhenReturned)
	items := user.GetAvailableItems(tc.startTime, tc.endTime)
	if tests.IsItemAvailable(tc.item, items) {
		log.Fatal("Reserved item should be available after closed reservation")
	}
	checkReservationAudits(reservation.ID, tc.transition)
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

func checkItemAvailability(reservationStart time.Time, reservationEnd time.Time, reservedItem app.Item, user app.UserClient) {
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
	env.SetContainerTime(change.timestamp.Add(-1*time.Minute), consts.TEST_APP_NAME)
	user.ReserveItem(itemId, reservationStart, reservationEnd)
	env.RevertContainerTime(consts.TEST_APP_NAME)
}

func changeReservationStatusWithTimestamp(change change, reservation app.Reservation) {
	env.SetContainerTime(change.timestamp.Add(-1*time.Minute), consts.TEST_APP_NAME)
	changeReservationStatus(change.status, reservation)
	env.RevertContainerTime(consts.TEST_APP_NAME)
}

func changeReservationStatus(status string, reservation app.Reservation) {
	admin.ChangeReservationStatus(reservation, status)
	reservationLoaded := db.GetReservation(db.ByID(reservation.ID))
	if reservationLoaded.Status != status {
		log.Fatalf("status didn't change. Want %v have %v", status, reservation.Status)
	}
}

func checkReservationAudits(reservationId int, expectedChangesHistory changeHistory) { //todo update expectedChangesHistory based on skiped actions
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
