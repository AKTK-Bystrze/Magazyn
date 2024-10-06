package simple

import (
	"boxTest/common/app"
	"boxTest/common/db"
	"fmt"
	"log"
	"testing"
)

func changeReservationStatus(reservation app.Reservation, client app.UserClient) error {
	for _, newStatus := range app.RESERVATION_STATUSES {
		if newStatus != reservation.Status {
			oldStatus := reservation.Status
			log.Printf("change reservation status from %v to %v", oldStatus, newStatus)
			db.GetReservations()
			client.ChangeReservationStatus(reservation.ID, reservation.ItemID, newStatus)
			reservationChanged := db.GetReservationById(reservation.ID)
			if reservationChanged.Status != newStatus {
				return fmt.Errorf("Reservation %v status should be %v, was %v", reservationChanged, newStatus, oldStatus)
			}
		}
	}
	return nil
}

func Test_changeReservationStatusFromEachToEach(t *testing.T) {
	// reservation := app.Reservation{
	// 	StartTime:   time.Now().Truncate(time.Minute),
	// 	EndTime:     time.Now().AddDate(0, 0, 7).Truncate(time.Minute),
	// 	CreatedAt:   time.Now().Truncate(time.Minute),
	// 	ItemID:      0,
	// 	UserID:      int(consts.USERS_MAP["kursant1"].ID),
	// 	Status:      consts.PENDING,
	// 	ChangeByUID: int(consts.USERS_MAP["kursant1"].ID),
	// } //todo inserting in db doesn't work. App doesn't see it.

	//TODO test is not working :/ App doesn't see changes made by test that is why
	reservation := db.RESERVATIONS[0]
	admin := app.UserClient{
		Name:   app.AdminName1,
		Client: app.CreateHttpClient(),
	}
	admin.Login()
	admin.GoToReservations()
	for _, status := range app.RESERVATION_STATUSES {
		reservation.Status = status
		db.AddReservation(reservation)
		reservation.ID = db.GetReservationByCreateTime(reservation.CreatedAt).ID
		err := changeReservationStatus(reservation, admin)
		if err != nil {
			t.Errorf("change status reservation scenario failed for reservation %v status %v", reservation, status)
		}
	}

}
