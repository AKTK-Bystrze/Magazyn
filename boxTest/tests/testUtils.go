package tests

import (
	"boxTest/handlers/app"
	"log"
	"math/rand"
	"slices"
	"time"
)

var (
	LOCATION, _ = time.LoadLocation("Europe/Warsaw")
)

func PickRandomItem(items []app.Item) app.Item {
	randomIndex := rand.Intn(len(items))
	return items[randomIndex]
}

func IsItemAvailable(searchedItem app.Item, items []app.Item) bool {
	return slices.ContainsFunc(items, func(item app.Item) bool {
		return item.ID == searchedItem.ID
	})
}

func CreateNextDayAt(now time.Time, hour int) time.Time {
	now = now.Add(24 * time.Hour)
	return DateToHour(now)
}

func DateToHour(date time.Time) time.Time {
	return time.Date(date.Year(), date.Month(), date.Day(), date.Hour(), 0, 0, 0, date.Location())
}

func DateToFullDay(date time.Time) time.Time {
	return time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
}

func IsSameDay(date1, date2 time.Time) bool {
	return DateToFullDay(date1) == DateToFullDay(date2)
}

func CalculateCost(item string, start time.Time, end time.Time) int {
	start = DateToFullDay(start)
	end = DateToFullDay(end)

	duration := end.Sub(start)
	days := int(duration.Hours()/24 + 1)
	itemCost, ok := app.ItemCostMap[item]

	if ok {
		return itemCost * days
	} else {
		log.Fatalf("unknown item type %v", item)
		return 0
	}
}
