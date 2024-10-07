package tests

import (
	"boxTest/common/app"
	"log"
	"math/rand"
	"time"
)

func PickRandomItem(items []app.Item) app.Item {
	rand.Seed(time.Now().UnixNano())
	randomIndex := rand.Intn(len(items))
	return items[randomIndex]
}

func CalculateCost(item string, duration time.Duration) int {
	days := int(duration.Hours() / 24)
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
