package scenarios

import (
	"boxTest/common/app"
	"boxTest/tests"
	"time"
)

var (
	user = app.UserClient{
		Name:   app.UserName1,
		Client: app.CreateHttpClient(),
	}
	admin = app.UserClient{
		Name:   app.AdminName1,
		Client: app.CreateHttpClient(),
	}
)

func testSetUp() {
	user = app.UserClient{
		Name:   app.UserName1,
		Client: app.CreateHttpClient(),
	}
	user.Login()
	admin = app.UserClient{
		Name:   app.AdminName1,
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
	//TODO
	// - check db reservation status
	// - check db user's credits
	// - check item availability
	//admin approves item the same day
	// - chek db reservation status
	//admin gives item the same day
	// - check db reservation status
	//user return item the selected day
	// - check db user's credits
	// - check db reservation status
	//addmin approves item return
	// - check db user's credits
	// - check db reservation status
	// - check item
}

//cases:
//1 day reservation
//2 weekend reservation
//1 wekk reservation
//reservation is in the future
//reservation is ended quicker
