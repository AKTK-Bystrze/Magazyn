package main

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"boxTest/common/db"
	"boxTest/common/httpClient"
	"fmt"
	"log"
	"testing"
)

func changeReservationStatus(reservation app.Reservation) error {
	for _, newStatus := range consts.RESERVATION_STATUSES {
		if newStatus != reservation.Status {
			oldStatus := reservation.Status
			log.Printf("change reservation status from %v to %v", oldStatus, newStatus)
			db.GetReservations()
			app.ChangeReservationStatus(reservation.ID, reservation.ItemID, newStatus)
			reservationChanged := db.GetReservationById(reservation.ID)
			if reservationChanged.Status != newStatus {
				return fmt.Errorf("Reservation %v status should be %v, was %v", reservationChanged, newStatus, oldStatus)
			}
		}
	}
	return nil
}

func Test_changeReservationStatusFromEachToEach(t *testing.T) {
	httpClient.RestartDefaultClient()
	// reservation := app.Reservation{
	// 	StartTime:   time.Now().Truncate(time.Minute),
	// 	EndTime:     time.Now().AddDate(0, 0, 7).Truncate(time.Minute),
	// 	CreatedAt:   time.Now().Truncate(time.Minute),
	// 	ItemID:      0,
	// 	UserID:      int(consts.USERS_MAP["kursant1"].ID),
	// 	Status:      consts.PENDING,
	// 	ChangeByUID: int(consts.USERS_MAP["kursant1"].ID),
	// } //todo inserting in db doesn't work. App doesn't see it.
	reservation := db.RESERVATIONS[0]
	app.LoginAs(consts.AdminName1)
	app.Reservations()
	for _, status := range consts.RESERVATION_STATUSES {
		reservation.Status = status
		db.AddReservation(reservation)
		reservation.ID = db.GetReservationByCreateTime(reservation.CreatedAt).ID
		err := changeReservationStatus(reservation)
		if err != nil {
			t.Errorf("change status reservation scenario failed for reservation %v status %v", reservation, status)
		}
	}

}
