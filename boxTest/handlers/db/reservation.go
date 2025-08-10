package db

import (
	"boxTest/env"
	"boxTest/handlers/app"
	"database/sql"
	"log"
	"time"

	"fmt"
)

type ConditionFunc func(res app.Reservation) bool

// getReservationsFromDB is the shared function that retrieves reservations from the database
// based on the conditions provided and returns a list of filtered reservations.
func getReservationsFromDB(conditions ...ConditionFunc) ([]app.Reservation, error) {
	// Get the global DB connection
	db := env.DB

	// Base query to select all reservations
	query := "SELECT r_id, r_item_id, r_user_id, r_start_time, r_end_time, r_status, r_created_at, r_changeby_uid FROM reservations"
	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %v", err)
	}
	defer rows.Close()

	// Initialize a slice to store filtered reservations
	var reservations []app.Reservation

	// Iterate over the rows and scan into Reservation struct
	for rows.Next() {
		var res app.Reservation
		err := rows.Scan(&res.ID, &res.ItemID, &res.UserID, &res.StartTime, &res.EndTime, &res.Status, &res.CreatedAt, &res.ChangeByUID)
		if err != nil {
			return nil, fmt.Errorf("failed to scan row: %v", err)
		}

		// Apply the conditions to filter the results
		match := true
		for _, condition := range conditions {
			if !condition(res) {
				match = false
				break
			}
		}

		// If the reservation matches all conditions, append it to the result
		if match {
			reservations = append(reservations, res)
		}
	}

	// Check for any iteration errors
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error during row iteration: %v", err)
	}

	return reservations, nil
}

// GetReservations retrieves all reservations from the database based on conditions
func GetReservations(conditions ...ConditionFunc) ([]app.Reservation, error) {
	// Simply call the shared function to get filtered reservations
	return getReservationsFromDB(conditions...)
}

// GetReservation retrieves a single reservation from the database based on conditions
// It returns an error if more than one or no reservation matches the conditions
func GetReservation(conditions ...ConditionFunc) (app.Reservation, error) {
	reservations, err := getReservationsFromDB(conditions...)
	if err != nil {
		return app.Reservation{}, err
	}

	// If exactly one reservation is found, return it
	if len(reservations) == 1 {
		return reservations[0], nil
	}

	// If no reservations or more than one reservation is found, return an error
	return app.Reservation{}, fmt.Errorf("expected one reservation, but found %d", len(reservations))
}

// Example condition function to filter by ID
func ByID(reservationID int) ConditionFunc {
	return func(res app.Reservation) bool {
		return res.ID == reservationID
	}
}

// Example condition function to filter by status
func ByStatus(status string) ConditionFunc {
	return func(res app.Reservation) bool {
		return res.Status == status
	}
}

// Example condition function to filter by user ID
func ByUserID(userID int) ConditionFunc {
	return func(res app.Reservation) bool {
		return res.UserID == userID
	}
}

// Example condition function to filter by start time
func ByStartTime(start time.Time) ConditionFunc {
	return func(res app.Reservation) bool {
		loc, _ := time.LoadLocation("Europe/Warsaw")
		formattedTime := start.In(loc).Truncate(time.Minute)
		return res.StartTime.Equal(formattedTime)
	}
}

// Example condition function to filter by end time
func ByEndTime(end time.Time) ConditionFunc {
	return func(res app.Reservation) bool {
		loc := time.UTC
		formattedTime := end.In(loc).Truncate(time.Minute)
		return res.EndTime.Equal(formattedTime)
	}
}

func ByItemID(itemID int) ConditionFunc {
	return func(res app.Reservation) bool {
		return res.ItemID == itemID
	}
}

// GetReservationByID retrieves a reservation by its ID.
func GetReservationByID(reservationID int) (app.Reservation, error) {
	db := env.DB
	query := "SELECT r_id, r_start_time, r_end_time, r_item_id, r_user_id, r_changeby_uid, r_status, r_created_at FROM reservations WHERE r_id = $1"
	row := db.QueryRow(query, reservationID)

	var r app.Reservation
	err := row.Scan(&r.ID, &r.StartTime, &r.EndTime, &r.ItemID, &r.UserID, &r.ChangeByUID, &r.Status, &r.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return app.Reservation{}, fmt.Errorf("no reservation found with ID %d", reservationID)
		}
		return app.Reservation{}, fmt.Errorf("error scanning row: %v", err)
	}

	return r, nil
}

// AddReservation adds a new reservation to the database.
func AddReservation(reservation app.Reservation) error {
	log.Printf("Adding reservation: %+v", reservation)
	db := env.DB
	query := `INSERT INTO reservations (r_start_time, r_end_time, r_item_id, r_user_id, r_changeby_uid, r_status, r_created_at) 
		VALUES ($1, $2, $3, $4, $5, $6, $7)`
	_, err := db.Exec(query,
		reservation.StartTime,
		reservation.EndTime,
		reservation.ItemID,
		reservation.UserID,
		reservation.ChangeByUID,
		reservation.Status,
		reservation.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert reservation: %v", err)
	}
	return nil
}

// RemoveReservations removes all reservations from the database.
func RemoveReservations() error {
	log.Printf("Removing all reservations")
	db := env.DB
	query := "DELETE FROM reservations"
	_, err := db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to remove reservations: %v", err)
	}
	return nil
}
