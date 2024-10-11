package common

import (
	"boxTest/env"
	"boxTest/handlers/app"
	"boxTest/handlers/db"
	"boxTest/tests"
	"log"
	"time"
)

var (
	User  = app.UserClient{}
	Admin = app.UserClient{}
)

func TestSetUp() {
	log.Print("\n\tSET UP...")
	User = app.UserClient{
		User:   db.USERS_MAP[app.UserName1],
		Client: app.CreateHttpClient(),
	}
	User.Login()
	Admin = app.UserClient{
		User:   db.USERS_MAP[app.AdminName1],
		Client: app.CreateHttpClient(),
	}
	Admin.Login()
	db.RemoveReservations()
	db.RemoveAudits()
	log.Print("\n\tSETTED")
}

func TestTearDown() {
	log.Print("\n\tCLEAN UP...")
	User.LogOut()
	Admin.LogOut()
	env.RevertContainerTime(env.TEST_APP_NAME)
	db.RemoveReservations()
	db.RemoveAudits()
	log.Print("\n\tCLEANED")
}

func BaseScenario(tc TestCase) {
	tc.toString("")
	userBefore := db.GetUserById(int(User.User.ID))
	ReserveWithTimestamp(tc.Transition[app.PENDING], tc.StartTime, tc.EndTime, tc.Item.ID)
	CheckCredits(userBefore, tc.CreditsWhenCreated)
	reservation := db.GetReservation(
		db.ByItemID(tc.Item.ID),
		db.ByStatus(app.PENDING),
		db.ByUserID(int(User.User.ID)),
		db.ByStartTime(tc.StartTime),
		db.ByEndTime(tc.EndTime),
	)
	CheckItemAvailabilityWhileReserved(tc.StartTime, tc.EndTime, tc.Item, User)
	AdminActions(tc.Transition, reservation)
	CheckCredits(userBefore, tc.CreditsWhenReturned)
	CheckItemAvailabilityAfterReservation(tc)
	CheckReservationAudits(reservation.ID, tc.Transition)
	tc.toString("PASSED")
}

func AdminActions(actions ChangeHistory, reservation app.Reservation) {
	for actionName, action := range actions {
		if contains(app.ADMIN_ACTIONS, actionName) {
			log.Printf("Performing action for key: %v, status: %v", actionName, action)
			ChangeReservationStatusWithTimestamp(action, reservation)
		}
	}
}

func ExpectedCostAtTheEndBasedOnActions(actions ChangeHistory, startTime time.Time, endTime time.Time, reservedItem string) int {
	actionsToPerformByAdmin := getKeys(actions)
	reservationSince := startTime
	reservationTill := endTime
	if contains(actionsToPerformByAdmin, app.RENTED) {
		reservationSince = actions[app.RENTED].Timestamp
	}
	if contains(actionsToPerformByAdmin, app.RETURNED) {
		reservationTill = actions[app.RETURNED].Timestamp
	}
	if contains(actionsToPerformByAdmin, app.DENIED) {
		return 0
	}
	return tests.CalculateCost(reservedItem, reservationSince, reservationTill)
}

func ReserveWithTimestamp(change change, reservationStart time.Time, reservationEnd time.Time, itemId int) {
	env.SetContainerTime(change.Timestamp.Add(-1*time.Minute), env.TEST_APP_NAME)
	User.ReserveItem(itemId, reservationStart, reservationEnd)
	env.RevertContainerTime(env.TEST_APP_NAME)
}

func ChangeReservationStatusWithTimestamp(change change, reservation app.Reservation) {
	env.SetContainerTime(change.Timestamp.Add(-1*time.Minute), env.TEST_APP_NAME)
	ChangeReservationStatus(change.Status, reservation)
	env.RevertContainerTime(env.TEST_APP_NAME)
}

func ChangeReservationStatus(status string, reservation app.Reservation) {
	Admin.ChangeReservationStatus(reservation, status)
	reservationLoaded := db.GetReservation(db.ByID(reservation.ID))
	if reservationLoaded.Status != status {
		log.Fatalf("status didn't change. Want %v have %v", status, reservation.Status)
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

func getKeys(ch ChangeHistory) []string {
	keys := make([]string, 0, len(ch))
	for key := range ch {
		keys = append(keys, key)
	}
	return keys
}
