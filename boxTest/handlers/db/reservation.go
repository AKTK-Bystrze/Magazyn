package db

import (
	"boxTest/env"
	"boxTest/handlers/app"
	"boxTest/tests"
	"fmt"
	"log"
	"strings"
	"time"
)

func GetReservations() []app.Reservation {
	query := "SELECT * FROM reservations;"
	reservationsString := execSQLiteQueryInContainer(env.TEST_APP_NAME, env.DB_PATH_IN_CONTAINER, query)
	return parseToReservationsList(reservationsString)
}

func GetReservation(conditions ...ConditionFunc) app.Reservation {
	reservations := GetReservations()
	reservationsFound := FindReservations(reservations, conditions...)
	if len(reservationsFound) != 1 {
		log.Fatalf("Didn't find reservation for this criteria. Reservations found: %v", reservationsFound)
	}
	return reservationsFound[0]
}

type ConditionFunc func(res app.Reservation) bool

func FindReservations(reservations []app.Reservation, conditions ...ConditionFunc) []app.Reservation {
	var result []app.Reservation
	for _, res := range reservations {
		match := true
		for _, condition := range conditions {
			if !condition(res) {
				match = false
				break
			}
		}
		if match {
			result = append(result, res)
		}
	}
	return result
}

func ByItemID(itemID int) ConditionFunc {
	return func(res app.Reservation) bool {
		return res.ItemID == itemID
	}
}

func ByID(reservationID int) ConditionFunc {
	return func(res app.Reservation) bool {
		return res.ID == reservationID
	}
}

func ByUserID(userID int) ConditionFunc {
	return func(res app.Reservation) bool {
		return res.UserID == userID
	}
}

func ByStatus(status string) ConditionFunc {
	return func(res app.Reservation) bool {
		return res.Status == status
	}
}

func ByStartTime(start time.Time) ConditionFunc {
	return func(res app.Reservation) bool {
		loc, _ := time.LoadLocation("Europe/Warsaw")
		formatedTime := start.In(loc)
		formatedTime = formatedTime.Truncate(time.Minute)
		return res.StartTime.Equal(formatedTime)
	}
}

func ByEndTime(end time.Time) ConditionFunc {
	return func(res app.Reservation) bool {
		loc := time.UTC
		formatedTime := end.In(loc)
		formatedTime = formatedTime.Truncate(time.Minute)
		return res.EndTime.Equal(formatedTime)
	}
}

func GetReservationById(reservationID int) app.Reservation {
	query := fmt.Sprintf("SELECT * FROM reservations WHERE r_id = %d;", reservationID)
	reservationsString := execSQLiteQueryInContainer(env.TEST_APP_NAME, env.DB_PATH_IN_CONTAINER, query)
	return parseToReservation(reservationsString)
}

func RemoveReservations() {
	log.Printf("Removing all reservations")
	execSQLiteQueryInContainer(env.TEST_APP_NAME, env.DB_PATH_IN_CONTAINER, "DELETE FROM reservations;")
}

func AddReservation(reservation app.Reservation) {
	query := fmt.Sprintf(`INSERT INTO reservations ( r_start_time, r_end_time, r_item_id, r_user_id, r_changeby_uid, r_status, r_created_at) 
						  VALUES ( datetime('%s', 'utc'), datetime('%s', 'utc'), %d, %d, %d, '%s', datetime('%s', 'utc'))`,
		reservation.StartTime.Format(env.DB_TIME_FORMAT),
		reservation.EndTime.Format(env.DB_TIME_FORMAT),
		reservation.ItemID,
		reservation.UserID,
		reservation.ChangeByUID,
		reservation.Status,
		reservation.CreatedAt.Format(env.TIME_FORMAT))
	result := execSQLiteQueryInContainer(env.TEST_APP_NAME, env.DB_PATH_IN_CONTAINER, query)
	if result != "" {
		log.Fatalf("failed to add reservation %v %v", reservation, result)
	}
}

func parseToReservation(line string) app.Reservation {
	fields := strings.Split(line, "|")
	if len(fields) != 8 {
		log.Fatalf("unexpected output format for reservation: %s", line)
	}

	var r app.Reservation

	parseIntField := func(value string, fieldName string) int {
		v, err := parseInt(value)
		if err != nil {
			log.Fatalf("Reservation %s parsing error: %s", fieldName, line)
		}
		return v
	}

	parseTimeField := ParseDateField

	r.ID = parseIntField(fields[0], "ID")
	r.ItemID = parseIntField(fields[1], "ItemID")
	r.UserID = parseIntField(fields[2], "UserID")
	r.StartTime = parseTimeField(fields[3], "StartTime")
	r.EndTime = parseTimeField(fields[4], "EndTime")
	r.Status = fields[5]
	r.CreatedAt = parseTimeField(fields[6], "CreatedAt")
	r.ChangeByUID = parseIntField(fields[7], "ChangeByUID")

	return r
}

func ParseDateField(value string, fieldName string) time.Time {
	t, err := time.Parse(env.DB_TIME_FORMAT, value)
	if err != nil {
		log.Fatalf("%s parsing error: %s value %v", fieldName, err, value)
	}
	return t.In(tests.LOCATION)
}

func parseToReservationsList(output string) []app.Reservation {
	var reservations []app.Reservation
	lines := strings.Split(output, "\n")
	lines = lines[:len(lines)-1]
	for _, line := range lines {
		if line == "" {
			continue
		}
		r := parseToReservation(line)
		reservations = append(reservations, r)
	}
	return reservations
}

func parseInt(value string) (int, error) {
	var i int
	_, err := fmt.Sscanf(value, "%d", &i)
	return i, err
}
