package scenarios

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"boxTest/common/db"
	"boxTest/env"
	"boxTest/tests"
	"log"
	"testing"
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

func testSetUp() {
	log.Print("TestSetUp, logIn user1 and admin1...")
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
}

func testTearDown() {
	log.Print("test clean up, reverts time, logOut user1 and admin1...")
	user.LogOut()
	admin.LogOut()
	env.RevertContainerTime(consts.TEST_APP_NAME)
}

func baseScenario(reservationStart time.Time, reservationEnd time.Time, reservationTransitions changeHistory) {
	userBefore := db.GetUserById(int(user.User.ID))
	items := user.GetAvailableItems(reservationStart, reservationEnd)
	reservedItem := tests.PickRandomItem(items)
	expectedCost := tests.CalculateCost(reservedItem.Type, reservationEnd.Sub(reservationStart))
	expectedUserCredits := userBefore.Credits - expectedCost
	log.Printf("Expected reservation cost %v, user credits before %v, user credits after %v",
		expectedCost, userBefore.Credits, expectedUserCredits)

	reserveWithTimestamp(reservationTransitions[app.PENDING], reservationStart, reservationEnd, reservedItem.ID)
	checkCredits(int(user.User.ID), expectedUserCredits)
	reservation := db.GetReservation(
		db.ByItemID(reservedItem.ID),
		db.ByStatus(app.PENDING),
		db.ByUserID(int(user.User.ID)),
		db.ByStartTime(reservationStart),
		db.ByEndTime(reservationEnd),
	)
	//verify Item availablity
	checkItemAvailability(reservationStart, reservationEnd, reservedItem, user)
	//approve
	changeReservationStatusWithTimestamp(reservationTransitions[app.APPROVED], reservation)
	//rent
	changeReservationStatusWithTimestamp(reservationTransitions[app.RENTED], reservation)
	//return
	changeReservationStatusWithTimestamp(reservationTransitions[app.RETURNED], reservation)
	//final check
	checkCredits(int(user.User.ID), expectedUserCredits)
	items = user.GetAvailableItems(reservationStart, reservationEnd)
	if tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item should be available after closed reservation")
	}
	checkReservationAudits(reservation.ID, reservationTransitions)
}

func Test_reservationMadeAndStartedSameTime(t *testing.T) {
	testCases := []struct {
		name      string
		startTime time.Time
		endTime   time.Time
	}{
		{"Reservation take today return next week", time.Now(), time.Now().AddDate(0, 0, 7)},
		{"Reservation take today return tomorrow", time.Now(), tests.CreateNextDayAt(23)},
		{"Reservation take today return today", time.Now(), time.Now().Add(time.Hour)},
		{"Reservation take today return day after tomorrow", time.Now(), time.Now().AddDate(0, 0, 2)},
	}
	for _, tc := range testCases {
		testSetUp()
		defer testTearDown()
		log.Printf("TEST reservation case:\n\t %v since %v till %v", tc.name, tc.startTime, tc.endTime)
		changesHistory := changeHistory{
			app.PENDING:  {status: app.PENDING, timestamp: tc.startTime},
			app.APPROVED: {status: app.APPROVED, timestamp: tc.startTime},
			app.RENTED:   {status: app.RENTED, timestamp: tc.startTime},
			app.RETURNED: {status: app.RETURNED, timestamp: tc.endTime},
		}

		baseScenario(tc.startTime, tc.endTime, changesHistory)
		testTearDown()
		log.Printf("TEST reservation case %v PASSED", tc.name)
	}

}

func Test_reservationMadeInFuture(t *testing.T) {
	testCases := []struct {
		name      string
		startTime time.Time
		endTime   time.Time
	}{
		{"Reservation take tomorrow return next week", time.Now().AddDate(0, 0, 1), time.Now().AddDate(0, 0, 7)},
		{"Reservation take next week return after week", time.Now().AddDate(0, 0, 7), time.Now().AddDate(0, 0, 14)},
		{"Reservation take next week return same day", time.Now().AddDate(0, 0, 7), time.Now().AddDate(0, 0, 7).Add(time.Hour)},
	}
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

		baseScenario(tc.startTime, tc.endTime, changesHistory)
		testTearDown()
		log.Printf("TEST reservation case %v PASSED", tc.name)
	}
}

//TODO
//reservation started ealier - IT IS NOT HANDLED IN THE APP

func Test_reservationNotAsPlanned(t *testing.T) {

	testCases := []struct {
		name      string
		startTime time.Time
		endTime   time.Time
	}{
		{"Reservation started earlier than planned, returned on time", time.Now().AddDate(0, 0, 7), time.Now().AddDate(0, 0, 14)},
		{"Reservation started later than planned, returned on time", time.Now().AddDate(0, 0, 7), time.Now().AddDate(0, 0, 7).Add(time.Hour)},
		{"Reservation started on time, returned earlier than planned", time.Now().AddDate(0, 0, 7), time.Now().AddDate(0, 0, 7).Add(time.Hour)},
		{"Reservation started on time, returned later than planned", time.Now().AddDate(0, 0, 7), time.Now().AddDate(0, 0, 7).Add(time.Hour)},
	}
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

		baseScenario(tc.startTime, tc.endTime, changesHistory)
		testTearDown()
		log.Printf("TEST reservation case %v PASSED", tc.name)
	}
}

func Test_reservationAdminDoesNoting(t *testing.T) {
	// reservation where admin does nothing
}

func checkCredits(userId int, correctValue int) {
	userAfter := db.GetUserById(userId)
	if userAfter.Credits != correctValue {
		log.Fatalf("User cost is %v, should be %v", userAfter.Credits, correctValue)
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

func checkReservationAudits(reservationId int, expectedChangesHistory changeHistory) {
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
