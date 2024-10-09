package db

import (
	"boxTest/common/app"
	"boxTest/env"
	"fmt"
	"log"
	"strconv"
	"strings"
)

func parseToReservationAudits(auditString string) []app.ReservationAudit {
	var audits []app.ReservationAudit
	rows := strings.Split(strings.TrimSpace(auditString), "\n")

	for _, row := range rows {
		columns := strings.Split(row, "|")
		if len(columns) < 6 {
			continue
		}

		id, _ := strconv.Atoi(columns[0])
		reservationID, _ := strconv.Atoi(columns[1])
		userID, _ := strconv.Atoi(columns[2])
		changeDate := ParseDateField(columns[4], "chageTime")

		audit := app.ReservationAudit{
			ID:            id,
			ReservationID: reservationID,
			UserID:        userID,
			Status:        columns[3],
			ChangeDate:    changeDate,
			Auditor:       columns[5],
		}
		audits = append(audits, audit)
	}

	return audits
}

func GetReservationAudit(reservationId int) []app.ReservationAudit {
	query := fmt.Sprintf("SELECT ra.*,u.u_username FROM reservation_audit ra JOIN users u ON ra.ra_user_id == u.u_id WHERE ra_reservation_id = %v ORDER BY ra_change_date",
		reservationId)
	reservationsAuditString := execSQLiteQueryInContainer(env.TEST_APP_NAME, env.TEST_DB_PATH, query)
	return parseToReservationAudits(reservationsAuditString)
}

func RemoveAudits() {
	log.Printf("Removing all reservations audits")
	execSQLiteQueryInContainer(env.TEST_APP_NAME, env.TEST_DB_PATH, "DELETE FROM reservation_audit;")
}
