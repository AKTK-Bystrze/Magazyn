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
	correctCost := tests.CalculateCost(reservedItem.Type, reservationEnd.Sub(reservationStart))
	correctUserCredits := userBefore.Credits - correctCost

	user.ReserveItem(reservedItem.ID, reservationStart, reservationEnd)

	userAfter := db.GetUserById(int(user.User.ID))
	if userAfter.Credits != correctUserCredits {
		log.Fatalf("User cost is %v, should be %v", userAfter.Credits, correctUserCredits)
	}
	reservations := db.GetReservations()
	reservationsFound := db.FindReservations(
		reservations,
		db.ByItemID(reservedItem.ID),
		db.ByStatus(app.PENDING),
		db.ByUserID(int(user.User.ID)),
		db.ByStartTime(reservationStart),
		db.ByEndTime(reservationEnd),
	)
	if len(reservationsFound) != 1 {
		log.Fatalf("Only one reservation this type should exists %v", reservationsFound)
	}
	reservation := reservationsFound[0]

	items = user.GetAvailableItems(reservationStart, reservationEnd)
	if tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item shouldn't be available when reserved")
	}
	admin.ChangeReservationStatus(reservation.ID, reservedItem.ID, app.APPROVED)
	// - chek db reservation status TODO

	admin.ChangeReservationStatus(reservation.ID, reservedItem.ID, app.RENTED)
	// - check db reservation status TODO

	env.SetContainerTimeForWhile(reservationEnd.Add(-time.Hour), consts.TEST_APP_NAME)
	// - check db reservation status TODO

	admin.ChangeReservationStatus(reservation.ID, reservedItem.ID, app.RETURNED)

	userAfter = db.GetUserById(int(user.User.ID))
	if userAfter.Credits != correctUserCredits {
		log.Fatalf("User cost is %v, should be %v", userAfter.Credits, correctUserCredits)
	}
	// - check db reservation status
	items = user.GetAvailableItems(reservationStart, reservationEnd)
	if tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item should be available after closed reservation")
	}
}

func Test_reservationScenario(t *testing.T) {
	testTearDown()
	testSetUp()
	defer testTearDown()
	reservationStart := time.Now().Add(30 * time.Minute)
	reservationEnd := time.Now().AddDate(0, 0, 7)
	baseScenario(reservationStart, reservationEnd)
}

//cases:
//1 day reservation
//2 weekend reservation
//1 wekk reservation
//reservation is in the future
//reservation is ended quicker
