package models

import "time"

type Item struct {
	ID          int    `db:"i_id"`
	Name        string `db:"i_name"`
	Description string `db:"i_description"`
	Status      string `db:"i_status"`
	Type        string `db:"i_type"`
}

type TmpItemWithReservation struct {
	Item
	CurrentReservation struct {
		Valid bool
		Reservation
	}
}

type QueryConfigItems struct {
	Available          bool
	WithCurReservation bool
	StartTime          time.Time
	EndTime            time.Time
}
