package main

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"boxTest/common/db"
	"fmt"
	"testing"
	"time"
)

func changeReservationStatusScenario(reservation app.Reservation) error {
	for _, newStatus := range consts.RESERVATION_STATUSES {
		if newStatus != reservation.Status {
			oldStatus := reservation.Status
			app.ChangeReservationStatus(reservation.ID, reservation.ItemID, newStatus)
			reservationChanged := db.GetReservationById(reservation.ID)
			if reservationChanged.Status != newStatus {
				return fmt.Errorf("Reservation %v status should be %v, was %v", reservationChanged, newStatus, oldStatus)
			}
		}
		//in case of denied, check user credits
	}
	return nil
}

func Test_changeReservationStatus(t *testing.T) {
	reservation := db.RESERVATIONS[0]
	reservation.StartTime = time.Now()
	reservation.EndTime = time.Now().AddDate(0, 0, 7)
	app.LoginAs(consts.AdminName1)
	app.Reservations()
	for _, status := range consts.RESERVATION_STATUSES {
		reservation.Status = status
		db.AddReservation(reservation)
		err := changeReservationStatusScenario(reservation)
		if err != nil {
			t.Errorf("change status reservation scenario failed for reservation %v status %v", reservation, status)
		}
	}

}
