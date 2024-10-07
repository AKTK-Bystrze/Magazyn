package db

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"fmt"
	"log"
	"strings"
	"time"
)

func ParseDateToDBFormat(time time.Time) string {
	return strings.ReplaceAll(time.Format(consts.TIME_FORMAT), "T", " ")
}

var RESERVATIONS = []app.Reservation{
	{
		ID:          0,
		StartTime:   time.Date(2023, 4, 1, 10, 0, 0, 0, time.UTC),
		EndTime:     time.Date(2023, 4, 5, 10, 0, 0, 0, time.UTC),
		ItemID:      1,
		UserID:      0,
		ChangeByUID: 0,
		Status:      "pending",
		CreatedAt:   time.Date(2023, 3, 2, 16, 5, 0, 0, time.UTC),
	},
	{
		ID:          1,
		StartTime:   time.Date(2023, 4, 1, 12, 0, 0, 0, time.UTC),
		EndTime:     time.Date(2023, 4, 3, 18, 0, 0, 0, time.UTC),
		ItemID:      2,
		UserID:      1,
		ChangeByUID: 1,
		Status:      "pending",
		CreatedAt:   time.Date(2023, 3, 4, 20, 13, 0, 0, time.UTC),
	},
	{
		ID:          2,
		StartTime:   time.Date(2023, 4, 3, 16, 0, 0, 0, time.UTC),
		EndTime:     time.Date(2023, 4, 5, 18, 0, 0, 0, time.UTC),
		ItemID:      3,
		UserID:      1,
		ChangeByUID: 1,
		Status:      "pending",
		CreatedAt:   time.Date(2023, 3, 7, 21, 37, 0, 0, time.UTC),
	},
	{
		ID:          3,
		StartTime:   time.Date(2023, 4, 4, 8, 0, 0, 0, time.UTC),
		EndTime:     time.Date(2023, 4, 7, 12, 0, 0, 0, time.UTC),
		ItemID:      2,
		UserID:      0,
		ChangeByUID: 0,
		Status:      "pending",
		CreatedAt:   time.Date(2023, 3, 8, 9, 14, 0, 0, time.UTC),
	},
	{
		ID:          4,
		StartTime:   time.Date(2023, 4, 5, 10, 0, 0, 0, time.UTC),
		EndTime:     time.Date(2023, 4, 5, 18, 0, 0, 0, time.UTC),
		ItemID:      1,
		UserID:      1,
		ChangeByUID: 1,
		Status:      "pending",
		CreatedAt:   time.Date(2023, 3, 9, 10, 23, 0, 0, time.UTC),
	},
	{
		ID:          5,
		StartTime:   time.Date(2023, 4, 7, 10, 0, 0, 0, time.UTC),
		EndTime:     time.Date(2023, 4, 9, 12, 0, 0, 0, time.UTC),
		ItemID:      1,
		UserID:      0,
		ChangeByUID: 0,
		Status:      "pending",
		CreatedAt:   time.Date(2023, 3, 9, 21, 37, 0, 0, time.UTC),
	},
}

func GetReservations() []app.Reservation {
	query := "SELECT * FROM reservations;"
	reservationsString := execSQLiteQueryInContainer(consts.TEST_APP_NAME, consts.TEST_DB_PATH, query)
	return parseToReservationsList(reservationsString)
}

// ConditionFunc type that defines the condition for flexible filtering
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

// Example conditions that can be passed to FindReservations
func ByItemID(itemID int) ConditionFunc {
	return func(res app.Reservation) bool {
		return res.ItemID == itemID
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
		return res.StartTime.Equal(start)
	}
}

func ByEndTime(end time.Time) ConditionFunc {
	return func(res app.Reservation) bool {
		return res.EndTime.Equal(end)
	}
}

func GetReservationById(reservationID int) app.Reservation {
	query := fmt.Sprintf("SELECT * FROM reservations WHERE r_id = %d;", reservationID)
	reservationsString := execSQLiteQueryInContainer(consts.TEST_APP_NAME, consts.TEST_DB_PATH, query)
	return parseToReservation(reservationsString)
}

func GetReservationByCreateTime(createTime time.Time) app.Reservation {
	reservations := GetReservations()
	for _, reservation := range reservations {
		resTime := reservation.CreatedAt
		searchedTime := createTime.Truncate(time.Minute)
		if searchedTime.Format(consts.TIME_FORMAT) == resTime.Format(consts.TIME_FORMAT) {
			return reservation
		}
	}
	log.Fatalf("Can't find reservation with createdTime %v", createTime)
	return app.Reservation{}
}

func AddReservation(reservation app.Reservation) {
	query := fmt.Sprintf(`INSERT INTO reservations ( r_start_time, r_end_time, r_item_id, r_user_id, r_changeby_uid, r_status, r_created_at) 
						  VALUES ( datetime('%s', 'utc'), datetime('%s', 'utc'), %d, %d, %d, '%s', datetime('%s', 'utc'))`,
		reservation.StartTime.Format(consts.DB_TIME_FORMAT),
		reservation.EndTime.Format(consts.DB_TIME_FORMAT),
		reservation.ItemID,
		reservation.UserID,
		reservation.ChangeByUID,
		reservation.Status,
		reservation.CreatedAt.Format(consts.TIME_FORMAT))
	result := execSQLiteQueryInContainer(consts.TEST_APP_NAME, consts.TEST_DB_PATH, query)
	if result != "" {
		log.Fatalf("failed to add reservation %v %v", reservation, result)
	}
}

func parseToReservation(line string) app.Reservation {
	location, _ := time.LoadLocation("Europe/Berlin")
	fields := strings.Split(line, "|")
	if len(fields) != 8 {
		log.Fatalf("unexpected output format for reservation: %s", line)
	}
	var r app.Reservation
	var err error
	if r.ID, err = parseInt(fields[0]); err != nil {
		log.Fatalf("r_ID arsing error: %s", line)
	}
	if r.ItemID, err = parseInt(fields[1]); err != nil {
		log.Fatalf("I_ID Parsing error: %s", line)
	}
	if r.UserID, err = parseInt(fields[2]); err != nil {
		log.Fatalf("U_ID Parsing error: %s", line)
	}
	if r.StartTime, err = time.Parse(consts.DB_TIME_FORMAT, fields[3]); err != nil {
		log.Fatalf("Start time parsing error: %s", line)
	}
	r.StartTime = r.StartTime.In(location)
	if r.EndTime, err = time.Parse(consts.DB_TIME_FORMAT, fields[4]); err != nil {
		log.Fatalf("End Time parsing error: %s", line)
	}
	r.EndTime = r.EndTime.In(location)
	r.Status = fields[5]
	if r.CreatedAt, err = time.Parse(consts.DB_TIME_FORMAT, fields[6]); err != nil {
		log.Fatalf("Status parsing error: %s", line)
	}
	r.CreatedAt = r.CreatedAt.In(location)
	if r.ChangeByUID, err = parseInt(fields[7]); err != nil {
		log.Fatalf("changedByUID parsing error: %s", line)
	}
	return r
}

func parseToReservationsList(output string) []app.Reservation { //todo verify after changes
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

func parseReservationAuditOutput(output string) ([]app.ReservationAudit, error) {
	var audits []app.ReservationAudit
	lines := strings.Split(output, "\n")
	lines = lines[:len(lines)-1]
	for _, line := range lines {
		if line == "" {
			continue
		}

		fields := strings.Split(line, "|")
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
	return time.Parse(consts.TIME_FORMAT, value) // Adjust the format as necessary
}
