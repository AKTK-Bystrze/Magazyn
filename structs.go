package main

import (
    "html/template"
    "time"

    "github.com/gorilla/sessions"
		"github.com/jmoiron/sqlx"
)

type AppState struct {
	db *sqlx.DB
	templates *template.Template
	store *sessions.CookieStore
}

type Item struct {
  ID          int       `db:"i_id"`
  Name        string    `db:"i_name"`
  Description string    `db:"i_description"`
  Status      string    `db:"i_status"`
}

type User struct {
  ID     int            `db:"u_id"`
  Name   string         `db:"u_username"`
}

// Reservation represents a reservation in the database
type Reservation struct {
    ID        int         `db:"r_id"`
    StartTime time.Time   `db:"r_start_time"`
    EndTime   time.Time   `db:"r_end_time"`
    Status    string      `db:"r_status"`
		CreatedAt time.Time   `db:"r_created_at"`
    Item      Item
    User      User
}
