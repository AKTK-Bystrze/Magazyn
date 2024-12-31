package db

import (
	"boxTest/env"
	"boxTest/handlers/app"
	"log"
)

// GetReservationAudit retrieves the audit history for a given reservation ID.
func GetReservationAudit(reservationId int) []app.ReservationAudit {
	var audits []app.ReservationAudit

	// Define the query to get the reservation audit
	query := `
SELECT ra_id, ra_reservation_id, ra_user_id, ra_status, ra_change_date
     FROM reservation_audit
     WHERE ra_reservation_id = $1
     ORDER BY ra_change_date DESC;
    `

	// Execute the query
	rows, err := env.DB.Query(query, reservationId)
	if err != nil {
		log.Fatalf("unable to execute query: %v", err)
	}
	defer rows.Close()

	// Loop through the results and scan each row into a ReservationAudit struct
	for rows.Next() {
		var audit app.ReservationAudit
		if err := rows.Scan(&audit.ID, &audit.ReservationID, &audit.UserID, &audit.Status, &audit.ChangeDate); err != nil {
			log.Fatalf("unable to scan row: %v", err)
		}
		audits = append(audits, audit)
	}

	// Check for errors after looping through rows
	if err := rows.Err(); err != nil {
		log.Fatalf("error occurred during iteration: %v", err)
	}

	return audits
}

// RemoveAudits deletes all reservation audits.
func RemoveAudits() {
	log.Printf("Removing all reservation audits")
	_, err := env.DB.Exec("DELETE FROM reservation_audit;")
	if err != nil {
		log.Fatalf("unable to remove audits: %v", err)
	}
}
