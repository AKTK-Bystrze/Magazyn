package common

import (
	"boxTest/env"
	"boxTest/handlers/app"
	"boxTest/handlers/db"
	"boxTest/tests"
	"log"
	"strings"
	"testing"
	"time"
)

var (
	User  = app.UserClient{}
	Admin = app.UserClient{}
)

func TestSetUp(testName string) {
	env.MarkNewTestInLogs("SetUp_before_" + strings.ReplaceAll(testName, " ", "-"))
	log.Print("\n\tSET UP...")
	env.ConnectToDB()
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
	db.RemoveAudits()
	db.RemoveReservations()
	env.RevertContainerTime(env.TEST_APP_NAME)
	log.Print("\n\tSETTED")
	env.MarkNewTestInLogs("SettedUp")
}

func TestTearDown(testName string) {
	env.MarkNewTestInLogs("TearDown_After_" + strings.ReplaceAll(testName, " ", "-"))
	log.Print("\n\tCLEAN UP...")
	User.LogOut()
	Admin.LogOut()
	env.RevertContainerTime(env.TEST_APP_NAME)
	db.RemoveAudits()
	db.RemoveReservations()
	log.Print("\n\tCLEANED")
}

func BaseScenario(tc TestCase) {
	tc.toString("")
	userBefore := db.GetUserById(int(User.User.ID))
	log.Printf("User details: %v", userBefore)
	ReserveWithTimestamp(tc.Transition.GetChangeByKey(app.PENDING), tc.StartTime, tc.EndTime, tc.Item.ID)
	CheckCredits(userBefore, tc.CreditsWhenCreated)
	reservation, err := db.GetReservation(
		db.ByItemID(tc.Item.ID),
		db.ByStatus(app.PENDING),
		db.ByUserID(int(User.User.ID)),
		//db.ByStartTime(tc.StartTime.UTC()),
		//db.ByEndTime(tc.EndTime.UTC()),
	)
	log.Print("Time range according to TEST", tc.StartTime, tc.EndTime)
	log.Print("Fetched reservation:", reservation)

	if err != nil {
		log.Fatalf("Failed to get reservation from db: %v", err)
	}
	CheckItemAvailabilityWhileReserved(tc.StartTime, tc.EndTime, tc.Item, User)
	AdminChangeReservationStatus(tc.Transition, reservation)
	CheckCredits(userBefore, tc.CreditsWhenReturned)
	CheckItemAvailabilityAfterReservation(tc)
	CheckReservationAudits(reservation.ID, tc.Transition)
	tc.toString("PASSED")
}

func AdminChangeReservationStatus(actions *ChangeHistory, reservation app.Reservation) {
	actionsList := actions.GetChanges()
	for _, change := range actionsList {
		if contains(app.ADMIN_ACTIONS, change.Key) {
			log.Printf("Admin changes reservation status %v: %s", change.Key, change.Value.toString())
			ChangeReservationStatusWithTimestamp(change.Value, reservation)
		}
	}
}

func ExpectedCostAtTheEndBasedOnActions(actions *ChangeHistory, startTime time.Time, endTime time.Time, reservedItem string) int {
	reservationSince := startTime
	reservationTill := endTime
	if actions.KeyExists(app.RENTED) {
		reservationSince = actions.GetChangeByKey(app.RENTED).Timestamp
	}
	if actions.KeyExists(app.RETURNED) {
		reservationTill = actions.GetChangeByKey(app.RETURNED).Timestamp
	}
	if actions.KeyExists(app.DENIED) {
		return 0
	}
	return tests.CalculateCost(reservedItem, reservationSince, reservationTill)
}

func ReserveWithTimestamp(change Change, reservationStart time.Time, reservationEnd time.Time, itemId int) {
	env.SetContainerTime(change.Timestamp.Add(-2*time.Minute), env.TEST_APP_NAME)
	User.ReserveItem(itemId, reservationStart, reservationEnd)
	env.RevertContainerTime(env.TEST_APP_NAME)
}

func ChangeReservationStatusWithTimestamp(change Change, reservation app.Reservation) {
	env.SetContainerTime(change.Timestamp.Add(-1*time.Minute), env.TEST_APP_NAME)
	ChangeReservationStatus(change.Status, reservation)
	env.RevertContainerTime(env.TEST_APP_NAME)
}

func ChangeReservationStatus(status string, reservation app.Reservation) {
	Admin.ChangeReservationStatus(reservation, status)
	reservationLoaded, err := db.GetReservation(db.ByID(reservation.ID))
	if err != nil {
		log.Fatalf("Couldn't get reservation from the db: %v", err)
	}
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

func ShowTestRaport(t *testing.T, passedTests []string, failedTests []string) {
	if len(failedTests) > 0 {
		log.Printf("\n--- Test Summary ---\n")
		log.Printf("Passed Tests: %d\n", len(passedTests))
		for _, name := range passedTests {
			log.Printf(" - %s\n", name)
		}

		log.Printf("\nFailed Tests: %d\n", len(failedTests))
		for _, name := range failedTests {
			log.Printf(" - %s\n", name)
		}

		t.Fail()
	} else {
		log.Printf("\nAll tests passed!\n")
		for _, name := range passedTests {
			log.Printf(" - %s\n", name)
		}
	}
}
