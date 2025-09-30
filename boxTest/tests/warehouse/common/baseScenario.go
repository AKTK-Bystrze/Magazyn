package common

import (
	"boxTest/env"
	"boxTest/handlers/app"
	"boxTest/handlers/db"
	"boxTest/tests"
	"log"
	"net/http"
	"strings"
	"testing"
	"time"

	"golang.org/x/exp/slices"
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

	if err := User.Login(); err != nil {
		log.Fatalf("Unable to login as user: %v", err)
	}

	Admin = app.UserClient{
		User:   db.USERS_MAP[app.AdminName1],
		Client: app.CreateHttpClient(),
	}

	if err := Admin.Login(); err != nil {
		log.Fatalf("Unable to login as admin: %v", err)
	}

	db.RemoveAudits()
	db.RemoveReservations()
	env.RevertContainerTime(env.TEST_APP_NAME)
	log.Print("\n\tSETTED")
	env.MarkNewTestInLogs("SettedUp")
}

func TestTearDown(testName string) {
	env.MarkNewTestInLogs("TearDown_After_" + strings.ReplaceAll(testName, " ", "-"))
	log.Print("\n\tCLEAN UP...")

	if err := User.LogOut(); err != nil {
		log.Fatalf("Unable to log out from user account: %v", err)
	}

	if err := Admin.LogOut(); err != nil {
		log.Fatalf("Unable to log out from admin account: %v", err)
	}

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
		db.ByStartTime(tc.StartTime.UTC()),
		db.ByEndTime(tc.EndTime.UTC()),
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
	ChangeReservationStatus(change, reservation)
	env.RevertContainerTime(env.TEST_APP_NAME)
}

func ChangeReservationStatus(change Change, reservation app.Reservation) *http.Response {
	startTime := reservation.StartTime
	endTime := reservation.EndTime
	switch change.Status {
		case app.PENDING:
			log.Print("ChangeReservationStatus: status PENDING - no action taken")
		case app.RENTED:
			startTime = change.Timestamp
		case app.RETURNED:
			endTime = change.Timestamp
		case app.DENIED:
			log.Print("ChangeReservationStatus: status DENIED - no time change")
		default:
			log.Fatalf("ChangeReservationStatus: unknown status %v", change.Status)
	}
	resp := Admin.ChangeReservationStatus(reservation, change.Status, startTime, endTime )
	reservationLoaded, err := db.GetReservation(db.ByID(reservation.ID))
	if err != nil {
		log.Fatalf("Couldn't get reservation from the db: %v", err)
	}
	if reservationLoaded.Status != change.Status {
		log.Printf("status didn't change. Want %v have %v", change.Status, reservation.Status)
	}
	return resp
}

func contains(list []string, key string) bool {
	return slices.Contains(list, key)
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

func TestForbiddenStatusChange(tc TestCase) {
	tc.toString("")
	userBefore := db.GetUserById(int(User.User.ID))
	log.Printf("User details: %v", userBefore)
	ReserveWithTimestamp(tc.Transition.GetChangeByKey(app.PENDING), tc.StartTime, tc.EndTime, tc.Item.ID)
	reservation, err := db.GetReservation(
		db.ByItemID(tc.Item.ID),
		db.ByStatus(app.PENDING),
		db.ByUserID(int(User.User.ID)),
		db.ByStartTime(tc.StartTime.UTC()),
		db.ByEndTime(tc.EndTime.UTC()),
	)
	log.Print("Time range according to TEST", tc.StartTime, tc.EndTime)
	log.Print("Fetched reservation:", reservation)

	if err != nil {
		log.Fatalf("Failed to get reservation from db: %v", err)
	}

	resp := AdminChangeReservationToForbiddenStatus(tc.Transition, reservation)
	forbiddenTransition := tc.Transition.GetChanges()[len(tc.Transition.GetChanges())-1].Key
	if resp.StatusCode != 400 {
		log.Fatalf("Expected status 400 for forbidden status change %s, got %d", forbiddenTransition, resp.StatusCode)
	}
	tc.toString("PASSED")
}

func AdminChangeReservationToForbiddenStatus(actions *ChangeHistory, reservation app.Reservation) *http.Response {
	actionsList := actions.GetChanges()
	var resp *http.Response
	for _, change := range actionsList {
		if contains(app.ADMIN_ACTIONS, change.Key) {
			log.Printf("Admin changes reservation status %v: %s", change.Key, change.Value.toString())
			resp = ChangeReservationStatus(change.Value, reservation)
		}
	}
	return resp
}