package common

import (
	"boxTest/handlers/app"
	"boxTest/handlers/db"
	"boxTest/tests"
	"log"
	"time"
)

func CheckReservationAudits(reservationId int, expectedChangesHistory *ChangeHistory) {
	log.Print("check reservation history")
	history := db.GetReservationAudit(reservationId)
	if len(history) != len(expectedChangesHistory.changes) {
		log.Fatal("Changes history has different length than expected")
	}
	for _, audit := range history {
		expectedChange := expectedChangesHistory.GetChangeByKey(audit.Status)
		if audit.Auditor != Admin.User.Name &&
			tests.IsSameDay(audit.ChangeDate, expectedChange.Timestamp) &&
			audit.Status != expectedChange.Status {
			log.Fatalf("Reservation change should be %v but is %v", expectedChange, audit)
		}
	}
}

func CheckItemAvailabilityWhileReserved(reservationStart time.Time, reservationEnd time.Time, reservedItem app.Item, user app.UserClient) {
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

func CheckItemAvailabilityAfterReservation(tc TestCase) {
	log.Print("Check item avaiablity after the reservation")
	keys := tc.Transition.GetAllKeys()
	if contains(keys, app.DENIED) {
		items := User.GetAvailableItems(tc.StartTime, tc.EndTime)
		if !tests.IsItemAvailable(tc.Item, items) {
			log.Fatal("Reserved item should be available after reservation is done within reservation time due to denial")
		}
	}
	var endTime time.Time
	if contains(keys, app.RETURNED) {
		endTime = tc.Transition.GetChangeByKey(app.RETURNED).Timestamp
	} else {
		endTime = tc.EndTime
	}
	items := User.GetAvailableItems(endTime.AddDate(0, 0, 1), endTime.AddDate(0, 0, 1).Add(2*time.Hour))
	if !tests.IsItemAvailable(tc.Item, items) {
		log.Fatal("Reserved item should be available after reservation is is finished")
	}

}

func CheckCredits(userBefore app.User, expectedCost int) {
	log.Print("check user credits ")
	userAfter := db.GetUserById(int(userBefore.ID))
	expectedUserCreditsAfter := userBefore.Credits - expectedCost
	if userAfter.Credits != expectedUserCreditsAfter {
		calculatedCost := userAfter.Credits - userBefore.Credits
		log.Fatalf("User credits is %v, should be %v\n expected cost %v calculated cost %v",
			userAfter.Credits, expectedUserCreditsAfter, expectedCost, calculatedCost)
	}
}
