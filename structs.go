package main

import (
	"html/template"
	"time"

	"github.com/gorilla/sessions"
	"github.com/jmoiron/sqlx"
)

type AppState struct {
	db        *sqlx.DB
	templates *template.Template
	store     *sessions.CookieStore
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
	ID    int64  `db:"u_id"`
	Name  string `db:"u_username"`
	Email string `db:"u_email"`
}

// Reservation represents a reservation in the database
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
	MAGAZYN_BYSTRZE_EMAIL = "zarzadbystrze@gmail.com"
	PWL_KEY_COOKIE_STORE  = ""
	COOKIE_VALIDITY_TIME  = 10
)
