package tests

import (
	"boxTest/common/app"
	"log"
	"math/rand"
	"time"
)

var (
	LOCATION, _ = time.LoadLocation("Europe/Warsaw")
)

func PickRandomItem(items []app.Item) app.Item {
	rand.Seed(time.Now().UnixNano())
	randomIndex := rand.Intn(len(items))
	return items[randomIndex]
}

func IsItemAvailable(searchedItem app.Item, items []app.Item) bool {
	wasFound := false
	for _, item := range items {
		if item.ID == searchedItem.ID {
			wasFound = true
		}
	}
	return wasFound
}

func CreateNextDayAt(hour int) time.Time {
	now := time.Now().Add(24 * time.Hour)
	year, month, day := now.Date()
	location := now.Location()

	return time.Date(year, month, day, hour, 0, 0, 0, location)
}

func IsSameDay(date1, date2 time.Time) bool {
	return date1.Year() == date2.Year() &&
		date1.Month() == date2.Month() &&
		date1.Day() == date2.Day()
}

func CalculateCost(item string, start time.Time, end time.Time) int {
	startDate := time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, start.Location())
	endDate := time.Date(end.Year(), end.Month(), end.Day(), 0, 0, 0, 0, end.Location())

	duration := endDate.Sub(startDate)
	days := int(duration.Hours()/24) + 1
	if days/days == -1 {
		log.Printf("Wrong subtraction")
		days = days * -1
	}
	log.Printf("calculate cost for item %v for %v days", item, days)
	switch item {
	case app.KAYAK:
		return int(days) * app.COST_KAYAK
	case app.PADDLE:
		return int(days) * app.COST_PADDLE
	case app.LIFE_JACKET:
		return int(days) * app.COST_LIFE_JACKET
	case app.HELMET:
		return int(days) * app.COST_HELMET
	case app.JACKET:
		return int(days) * app.COST_JACKET
	case app.SPRAY_SKIRT:
		return int(days) * app.COST_SPRAY_SKIRT
	case app.ROPE:
		return int(days) * app.COST_ROPE
	case app.WETSUIT:
		return int(days) * app.COST_WETSUIT
	default:
		log.Fatalf("unknown item type %v", item)
		return 0
	}
}
