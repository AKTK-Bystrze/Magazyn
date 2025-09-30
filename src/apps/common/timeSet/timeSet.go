package timeSet

import "time"

var (
	LOCATION     *time.Location
	OUT_TIME_FMT = "2006-01-02 15:04:05"
	IN_TIME_FMT  = "2006-01-02T15:04"
)

func IsTheSameDay(t1, t2 time.Time) bool {
	return t1.Year() == t2.Year() && t1.Month() == t2.Month() && t1.Day() == t2.Day()
}