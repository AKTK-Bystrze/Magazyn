package models

import "time"

type TmpReservation struct {
	Reservation
	Item
	User
}

type TmpReservationAudit struct {
	ReservationAudit
	User
}

type ReservationAudit struct {
	ID         int       `db:"ra_id"`
	R_ID       int       `db:"ra_reservation_id"`
	Status     string    `db:"ra_status"`
	ChangeDate time.Time `db:"ra_change_date"`
	User       User
}

type Reservation struct {
	ID        int64     `db:"r_id"`
	StartTime time.Time `db:"r_start_time"`
	EndTime   time.Time `db:"r_end_time"`
	Status    string    `db:"r_status"`
	CreatedAt time.Time `db:"r_created_at"`
	Item      Item
	User      User
}
