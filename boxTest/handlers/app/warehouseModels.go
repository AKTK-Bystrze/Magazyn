package app

import (
	"time"
)

const (
	KayakB1  = "B1"
	DENIED   = "denied"
	RETURNED = "returned"
	APPROVED = "approved"
	PENDING  = "pending"
	RENTED   = "rented"
)

type Item struct {
	ID          int
	Name        string
	Description string
	Type        string
	Status      string
}

type Reservation struct {
	ID          int       `json:"id"`
	ItemID      int       `json:"item_id"`
	UserID      int       `json:"user_id"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	ChangeByUID int       `json:"change_by_uid"`
}

type ReservationAudit struct {
	ID            int       `json:"ra_id"`
	ReservationID int       `json:"ra_reservation_id"`
	UserID        int       `json:"ra_user_id"`
	Status        string    `json:"ra_status"`
	ChangeDate    time.Time `json:"ra_change_date"`
	Auditor       string
}

var ITMEMS = []string{KayakB1}

var RESERVATION_STATUSES = []string{PENDING, APPROVED, RENTED, RETURNED, DENIED}

var ADMIN_ACTIONS = []string{APPROVED, RENTED, RETURNED, DENIED}
