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
	log.Print("test clean up, logOut user1 and admin1...")
	user.LogOut()
	admin.LogOut()
}

func baseScenario(reservationStart time.Time, reservationEnd time.Time) {
	userBefore := db.GetUserById(int(user.User.ID))
	items := user.GetAvailableItems(reservationStart, reservationEnd)
	reservedItem := tests.PickRandomItem(items)
	expectedCost := tests.CalculateCost(reservedItem.Type, reservationEnd.Sub(reservationStart))
	expectedUserCredits := userBefore.Credits - expectedCost
	log.Printf("Expected reservation cost %v, user credits before %v, user credits after %v",
		expectedCost, userBefore.Credits, expectedUserCredits)

	user.ReserveItem(reservedItem.ID, reservationStart, reservationEnd)

	userAfter := db.GetUserById(int(user.User.ID))
	if userAfter.Credits != expectedUserCredits {
		log.Fatalf("User cost is %v, should be %v", userAfter.Credits, expectedUserCredits)
	}
	reservation := db.GetReservation(
		db.ByItemID(reservedItem.ID),
		db.ByStatus(app.PENDING),
		db.ByUserID(int(user.User.ID)),
		db.ByStartTime(reservationStart),
		db.ByEndTime(reservationEnd),
	)
	items = user.GetAvailableItems(reservationStart, reservationEnd)
	if tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item shouldn't be available when reserved")
	}
	items = user.GetAvailableItems(reservationStart, reservationEnd.AddDate(0, 0, 1))
	if tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item shouldn't be available in overlapping durations")
	}
	admin.ChangeReservationStatus(reservation.ID, reservedItem.ID, app.APPROVED)
	reservation = db.GetReservation(db.ByID(reservation.ID))
	if reservation.Status != app.APPROVED {
		log.Fatalf("status didn't change in db")
	}
	admin.ChangeReservationStatus(reservation.ID, reservedItem.ID, app.RENTED)
	reservation = db.GetReservation(db.ByID(reservation.ID))
	if reservation.Status != app.RENTED {
		log.Fatalf("status didn't change in db")
	}

	env.SetContainerTimeForWhile(reservationEnd, consts.TEST_APP_NAME)
	admin.ChangeReservationStatus(reservation.ID, reservedItem.ID, app.RETURNED)
	reservation = db.GetReservation(db.ByID(reservation.ID))
	if reservation.Status != app.RETURNED {
		log.Fatalf("status didn't change in db")
	}
	userAfter = db.GetUserById(int(user.User.ID))
	if userAfter.Credits != expectedUserCredits {
		log.Fatalf("User cost is %v, should be %v", userAfter.Credits, expectedUserCredits)
	}
	items = user.GetAvailableItems(reservationStart, reservationEnd)
	if tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item should be available after closed reservation")
	}
	//todo check reservation dates for statuses (transitions dates)
}

func Test_reservationScenario(t *testing.T) {
	testCases := []struct {
		name      string
		startTime time.Time
		endTime   time.Time
	}{
		{"1 week reservation", time.Now().Add(30 * time.Minute), time.Now().AddDate(0, 0, 7)},
		{"1 day reservation", tests.CreateNextDayAt(8), tests.CreateNextDayAt(16)},
		{"2 day reservation", tests.CreateNextDayAt(8), time.Now().AddDate(0, 0, 7)},
	}
	for _, tc := range testCases {
		testSetUp()
		defer testTearDown()
		log.Printf("TEST reservation case:\n\t %v since %v till %v", tc.name, tc.startTime, tc.endTime)
		baseScenario(tc.startTime, tc.endTime)
		log.Printf("TEST reservation case %v PASSED", tc.name)
	}

}

func Test_reservationInFuture(t *testing.T) {
	testSetUp()
	defer testTearDown()
	reservationStart := time.Now().AddDate(0, 0, 7)
	reservationEnd := reservationStart.AddDate(0, 0, 4)

	reservationRentedTime := reservationStart
	reservationReturnedTime := reservationEnd
	changes := []struct {
		status string
		date   time.Time
	}{
		{app.PENDING, time.Now()},
		{app.APPROVED, time.Now()},
		{app.RENTED, reservationRentedTime},
		{app.RETURNED, reservationReturnedTime},
	}
	log.Printf("Test reservation in future since %v till %v", reservationStart, reservationEnd)
	userBefore := db.GetUserById(int(user.User.ID))
	items := user.GetAvailableItems(reservationStart, reservationEnd)
	reservedItem := tests.PickRandomItem(items)
	expectedCost := tests.CalculateCost(reservedItem.Type, reservationEnd.Sub(reservationStart))
	expectedUserCredits := userBefore.Credits - expectedCost
	log.Printf("Expected reservation cost %v, user credits before %v, user credits after %v",
		expectedCost, userBefore.Credits, expectedUserCredits)

	user.ReserveItem(reservedItem.ID, reservationStart, reservationEnd)

	userAfter := db.GetUserById(int(user.User.ID))
	if userAfter.Credits != expectedUserCredits {
		log.Fatalf("User cost is %v, should be %v", userAfter.Credits, expectedUserCredits)
	}
	reservation := db.GetReservation(
		db.ByItemID(reservedItem.ID),
		db.ByStatus(app.PENDING),
		db.ByUserID(int(user.User.ID)),
		db.ByStartTime(reservationStart),
		db.ByEndTime(reservationEnd),
	)
	items = user.GetAvailableItems(reservationStart, reservationEnd)
	if tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item shouldn't be available when reserved")
	}
	items = user.GetAvailableItems(time.Now(), reservationStart.AddDate(0, 0, -1))
	if !tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item should be available before reservation")
	}
	items = user.GetAvailableItems(reservationEnd.AddDate(0, 0, 1), reservationEnd.AddDate(0, 0, 2))
	if !tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item should be available after reservation")
	}
	admin.ChangeReservationStatus(reservation.ID, reservedItem.ID, app.APPROVED)
	reservation = db.GetReservation(db.ByID(reservation.ID))
	if reservation.Status != app.APPROVED {
		log.Fatalf("status didn't change in db")
	}
	env.SetContainerTimeForWhile(reservationRentedTime, consts.TEST_APP_NAME)
	admin.ChangeReservationStatus(reservation.ID, reservedItem.ID, app.RENTED)
	reservation = db.GetReservation(db.ByID(reservation.ID))
	if reservation.Status != app.RENTED {
		log.Fatalf("status didn't change in db")
	}

	env.SetContainerTimeForWhile(reservationReturnedTime, consts.TEST_APP_NAME)
	admin.ChangeReservationStatus(reservation.ID, reservedItem.ID, app.RETURNED)
	reservation = db.GetReservation(db.ByID(reservation.ID))
	if reservation.Status != app.RETURNED {
		log.Fatalf("status didn't change in db")
	}
	userAfter = db.GetUserById(int(user.User.ID))
	if userAfter.Credits != expectedUserCredits {
		log.Fatalf("User cost is %v, should be %v", userAfter.Credits, expectedUserCredits)
	}
	items = user.GetAvailableItems(reservationStart, reservationEnd)
	if tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item should be available after closed reservation")
	}
	checkReservationStatuses(reservation.ID, changes)
}

func checkReservationStatuses(reservationId int, changes []struct {
	status string
	date   time.Time
}) {
	history := db.GetReservationAudit(reservationId)
	for i, audit := range history {
		if audit.Auditor != admin.User.Name &&
			tests.IsSameDay(audit.ChangeDate, changes[i].date) &&
			audit.Status != changes[i].status {
			log.Fatalf("Reservation change should be %v but is %v", changes[i], audit)
		}
	}
}

//TODO
//reuse base scenario and divide it into methods
//reservation in future started ealier - IT IS NOT HANDLED IN THE APP
//reservation is ended quicker, item should be available quicker and cost should be updated
//reservation where admin does nothing for future and now
