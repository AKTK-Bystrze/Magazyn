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
	ID            int       `json:"id"`
	ReservationID int       `json:"reservation_id"`
	UserID        int       `json:"user_id"`
	Status        string    `json:"status"`
	ChangeDate    time.Time `json:"change_date"`
	Auditor       string    `json:"auditor"`
}

var ITMEMS = []string{KayakB1}

var RESERVATION_STATUSES = []string{PENDING, RENTED, RETURNED, DENIED}

var ADMIN_ACTIONS = []string{RENTED, RETURNED, DENIED}
