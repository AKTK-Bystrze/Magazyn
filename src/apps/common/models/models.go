package models

import (
	"time"
)

// // todo should tmpUser and User be both in use insted of one?
// type TmpUser struct {
// 	ID      int64  `db:"u_id"`
// 	Name    string `db:"u_username"`
// 	Role    string `db:"u_role"`
// 	Credits int    `db:"u_credits"`
// }

type User struct {
	ID      int64  `db:"u_id"`
	Name    string `db:"u_username"`
	Email   string `db:"u_email"`
	Role    string `db:"u_role"`
	Credits int    `db:"u_credits"`
}

type QueryConfigItems struct {
	Available          bool
	WithCurReservation bool
	StartTime          time.Time
	EndTime            time.Time
}

type Item struct {
	ID          int    `db:"i_id"`
	Name        string `db:"i_name"`
	Description string `db:"i_description"`
	Status      string `db:"i_status"`
	Type        string `db:"i_type"`
}

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

const (
	DENIED   = "denied"
	RETURNED = "returned"
	APPROVED = "approved"
	PENDING  = "pending"
	RENTED   = "rented"
)

type TmpItem struct {
	Item
	CurrentReservation struct {
		Valid bool
		Reservation
	}
}
