package main

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"boxTest/common/db"
	"boxTest/common/httpClient"
	"math/rand"
	"testing"
	"time"
)

func reserveItemScenario(username string) error {
	httpClient.RestartDefaultClient()
	app.LoginAs(username)
	httpClient.GetRequest(consts.Localhost + app.URL_search)
	now := time.Now().Add(10 * time.Minute)
	nextWeek := now.Add(7 * 24 * time.Hour)
	items := app.GetAvaiableItems(now, nextWeek)
	reservedItem := pickRandomItem(items)
	app.ReserveItem(reservedItem.ID, now, nextWeek)
	app.Dashboard() //TODO //find reservation in reservations view
	//verify reservation in db
	reservation := db.GetReservations()
	print(reservation)

	//verify item satus in db
	return nil
}

func pickRandomItem(items []app.Item) app.Item {
	rand.Seed(time.Now().UnixNano())
	randomIndex := rand.Intn(len(items))
	return items[randomIndex]
}

func Test_reserveItem(t *testing.T) {
	reserveItemScenario(consts.UserName1)
	// for _, userName := range consts.USERS {
	// 	err := reserveItemScenario(userName)
	// 	if err != nil {
	// 		t.Errorf("reserve item scenario for %v failed %v", userName, err)
	// 	}
	// }
}
