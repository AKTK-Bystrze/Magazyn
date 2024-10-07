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

func baseScenario(reservationStart time.Time, reservationEnd time.Time) {
	//user search for a item
	items := user.GetAvaiableItems(reservationStart, reservationEnd)
	reservedItem := tests.PickRandomItem(items)
	//user reserve item for today
	user.ReserveItem(reservedItem.ID, reservationStart, reservationEnd)
	reservations := db.GetReservations()
	//find by user, item, status, time start, time end
	reservationsFound := db.FindReservations(
		reservations,
		db.ByItemID(reservedItem.ID),
		db.ByStatus(app.PENDING),
		db.ByUserID(int(user.User.ID)),
		db.ByStartTime(reservationStart),
		db.ByEndTime(reservationEnd),
	) //todo found 0 time formatting?
	if len(reservationsFound) != 1 {
		log.Fatalf("Only one reservation this type should exists %v", reservationsFound)
	}
	reservation := reservationsFound[0]
	// - check db reservation status
	// - check db user's credits
	// - check item availability
	//admin approves item the same day
	admin.ChangeReservationStatus(reservation.ID, reservedItem.ID, app.APPROVED)
	// - chek db reservation status
	//admin gives item the same day
	admin.ChangeReservationStatus(reservation.ID, reservedItem.ID, app.RENTED)
	// - check db reservation status
	//user return item the selected day
	env.SetContainerTimeForWhile(reservationEnd.Add(-time.Hour), consts.TEST_APP_NAME)
	// - check db user's credits
	// - check db reservation status
	//addmin approves item return
	admin.ChangeReservationStatus(reservedItem.ID, reservation.ID, app.RETURNED)
	// - check db user's credits
	// - check db reservation status
	// - check item
}

func Test_reservationScenario(t *testing.T) {
	testSetUp()
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
