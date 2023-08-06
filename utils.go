package main

import "time"

func isDateinPast(date time.Time) bool {
	return date.Before(time.Now())
}
