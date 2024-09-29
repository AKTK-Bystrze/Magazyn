package main

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"boxTest/common/httpClient"
	"testing"
	"time"
)

func reserveItemScenario(username string) error {
	httpClient.RestartDefaultClient()
	app.LoginAs(username)
	//get items list
	httpClient.GetRequest(consts.Localhost + app.URL_search)
	now := time.Now()
	nextWeek := now.Add(7 * 24 * time.Hour)
	items := app.GetAvaiableItems(now, nextWeek)

	// print(data)
	//get item id from list
	//reserve item
	// app.ReserveItem(consts.UserName1)
	//find reservation in reservations view
	//verify reservation in db
	//verify item satus in db
	return nil
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
