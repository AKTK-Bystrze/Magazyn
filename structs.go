package main

import (
	"github.com/gorilla/sessions"

	"time"
)

type AppState struct {
	db        Database
	templates Templates
	store     sessions.Store
	server    string
}

type Item struct {
	ID          int    `db:"i_id"`
	Name        string `db:"i_name"`
	Description string `db:"i_description"`
	Status      string `db:"i_status"`
	Type        string `db:"i_type"`
}

type User struct {
	ID      int64  `db:"u_id"`
	Name    string `db:"u_username"`
	Email   string `db:"u_email"`
	Credits int    `db:"u_credits"`
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

type ReservationAudit struct {
	ID         int       `db:"ra_id"`
	R_ID       int       `db:"ra_reservation_id"`
	Status     string    `db:"ra_status"`
	ChangeDate time.Time `db:"ra_change_date"`
	User       User
}

const (
	COOKIE_VALIDITY_TIME_HOURS = 6
	SEND_COOKIE_TO_STDOUT      = false
	TOKEN_LENGTH               = 10
	COOKIE_KEY_LENGTH          = 16

	APP_NAME      = "E-magazyn Bystrze"
	SESSION_NAME  = "magazynBystrze"
	DATABASE_NAME = "magazyn.db"
	DATABASE_PATH = "./magazyn.db"
)
