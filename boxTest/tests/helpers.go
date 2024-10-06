package tests

import (
	"boxTest/common/app"
	"math/rand"
	"time"
)

func PickRandomItem(items []app.Item) app.Item {
	rand.Seed(time.Now().UnixNano())
	randomIndex := rand.Intn(len(items))
	return items[randomIndex]
}
