package db

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"boxTest/common/helpers"
	"fmt"
	"log"
	"strings"
	"time"
)

func execSQLiteQueryInContainer(containerName, dbFilePath, query string) string {
	res := helpers.RunCommand(false, "docker", "exec", containerName, "sqlite3", dbFilePath, query)
	return res
}

func GetReservations() []app.Reservation {
	query := "SELECT * FROM reservations;"
	reservationsString := execSQLiteQueryInContainer(consts.TEST_APP_NAME, consts.TEST_DB_PATH, query)
	return parseReservationOutput(reservationsString)
}

func parseReservationOutput(output string) []app.Reservation {
	var reservations []app.Reservation
	lines := strings.Split(output, "\n")
	lines = lines[:len(lines)-1]
	for _, line := range lines {
		if line == "" {
			continue
		}

		fields := strings.Split(line, "|") // Adjust the delimiter based on your output format
		if len(fields) != 8 {
			log.Fatalf("unexpected output format for reservation: %s", line)
		}

		var r app.Reservation
		var err error
		if r.ID, err = parseInt(fields[0]); err != nil {
			log.Fatalf("Parsing error: %s", line)
		}
		if r.ItemID, err = parseInt(fields[1]); err != nil {
			log.Fatalf("Parsing error: %s", line)
		}
		if r.UserID, err = parseInt(fields[2]); err != nil {
			log.Fatalf("Parsing error: %s", line)
		}
		if r.StartTime, err = parseDateTime(fields[3]); err != nil {
			log.Fatalf("Parsing error: %s", line)
		}
		if r.EndTime, err = parseDateTime(fields[4]); err != nil {
			log.Fatalf("Parsing error: %s", line)
		}
		r.Status = fields[5]
		if r.CreatedAt, err = parseDateTime(fields[6]); err != nil {
			log.Fatalf("Parsing error: %s", line)
		}
		if r.ChangeByUID, err = parseInt(fields[7]); err != nil {
			log.Fatalf("Parsing error: %s", line)
		}

		reservations = append(reservations, r)
	}

	return reservations
}

func parseReservationAuditOutput(output string) ([]app.ReservationAudit, error) {
	var audits []app.ReservationAudit
	lines := strings.Split(output, "\n")
	lines = lines[:len(lines)-1]
	for _, line := range lines {
		if line == "" {
			continue
		}

		fields := strings.Split(line, "|") // Adjust the delimiter based on your output format
		if len(fields) != 5 {
			return nil, fmt.Errorf("unexpected output format for reservation audit: %s", line)
		}

		var ra app.ReservationAudit
		var err error
		if ra.ID, err = parseInt(fields[0]); err != nil {
			return nil, err
		}
		if ra.ReservationID, err = parseInt(fields[1]); err != nil {
			return nil, err
		}
		if ra.UserID, err = parseInt(fields[2]); err != nil {
			return nil, err
		}
		ra.Status = fields[3]
		if ra.ChangeDate, err = parseDateTime(fields[4]); err != nil {
			return nil, err
		}

		audits = append(audits, ra)
	}

	return audits, nil
}

func parseInt(value string) (int, error) {
	var i int
	_, err := fmt.Sscanf(value, "%d", &i)
	return i, err
}

func parseDateTime(value string) (time.Time, error) {
	return time.Parse("2006-01-02 15:04:05", value) // Adjust the format as necessary
}
