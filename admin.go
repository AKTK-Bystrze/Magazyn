package main

import (
    "net/http"
		"time"
		"log"
)

func adminDashboardHandler(w http.ResponseWriter, r *http.Request) {
	// Check if user is authenticated as admin
	session, _ := app.store.Get(r, SESSION_NAME)
  if session.Values["role"] != "admin" {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	// Retrieve all reservations from database
	rows, err := app.db.Query(`
	SELECT r.id, r.start_time, r.end_time, u.username, r.status, c.name
	FROM reservations r
	JOIN users u ON r.user_id = u.id
	JOIN chairs c ON r.chair_id = c.id
	ORDER BY r.start_time ASC`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var reservations []Reservation
	for rows.Next() {
		var r Reservation
		err := rows.Scan(&r.ID, &r.StartTime, &r.EndTime, &r.Username, &r.Status, &r.Name)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		reservations = append(reservations, r)
		log.Println(r)
	}
	if err = rows.Err(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	app.templates.ExecuteTemplate(w, "admin_dashboard.html", struct {
		Reservations []Reservation
	}{
		reservations,
	})
}

// Reservation represents a reservation in the database
type Reservation struct {
		Name			string
    ID        int
    StartTime time.Time
    EndTime   time.Time
    Username  string
    Status    string
}

func setStatusHandler(w http.ResponseWriter, r *http.Request) {
	// Get session
	session, _ := app.store.Get(r, SESSION_NAME)
	// Check if user is authenticated and has admin role
	if session.Values["role"] != "admin" {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	reservationID := r.FormValue("reservation_id")
	status := r.FormValue("status")

	// Update reservation status in database
	result, err := app.db.Exec(`UPDATE reservations SET status = ? WHERE id = ?`, status, reservationID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	numRows, err := result.RowsAffected()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if numRows != 1 {
		http.Error(w, "Failed to update reservation status", http.StatusInternalServerError)
		return
	}

	// Redirect to admin dashboard
	http.Redirect(w, r, "/admin", http.StatusSeeOther)
}
