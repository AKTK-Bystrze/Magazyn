package main

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"boxTest/common/db"
	"errors"
	"math/rand"
	"testing"
	"time"
)

func reserveItemScenario(user app.User) error {
	client := app.UserClient{
		Name:   user.Name,
		Client: app.CreateHttpClient(),
	}
	client.Login()
	client.GetRequest(consts.Localhost + app.URL_search)
	now := time.Now().Add(10 * time.Minute)
	nextWeek := now.AddDate(0, 0, 7)
	items := client.GetAvaiableItems(now, nextWeek)
	reservedItem := pickRandomItem(items)
	client.ReserveItem(reservedItem.ID, now, nextWeek)
	client.Dashboard()
	reservations := db.GetReservations()
	if !app.ReservationExists(reservations, now, nextWeek, reservedItem.ID, user) { //todo redo -> getReservationBYProvidingAlldata except id
		return errors.New("Missing reservation in db for" + user.Name)
	}
	//TODO check users credits in db and
	return nil
}

func pickRandomItem(items []app.Item) app.Item {
	rand.Seed(time.Now().UnixNano())
	randomIndex := rand.Intn(len(items))
	return items[randomIndex]
}

func Test_reserveItem(t *testing.T) {
	for _, user := range db.USERS {
		err := reserveItemScenario(user)
		if err != nil {
			t.Errorf("reserve item scenario for %v failed %v", user.Name, err)
		}
	}
}
