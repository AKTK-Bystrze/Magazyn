package main

import (
	"errors"
	"math"
	"time"
)

const (
	kayakItemType = "kayak"
	kayakItemCost = 4
)

func calculateRentalCost(itemID int, userID int, start_time time.Time, end_time time.Time) (int, error) {
	var user User
	item, err := app.getItem(itemID)
	if err != nil {
		return 0, err
	}
	err = app.db.Get(&user, "SELECT u_username, u_id, u_role FROM users WHERE u_id = ?", userID)
	var rentalCost int
	duration := end_time.Sub(start_time)
	rentalCost, err = getItemRentalCost(item.Type)
	days := int(math.Max(duration.Hours()/24, 1))
	return rentalCost * days, err
}

func getItemRentalCost(itemType string) (int, error) {
	switch itemType {
	case kayakItemType:
		return kayakItemCost, nil
	default:
		return 0, errors.New("unknown item type")
	}
}

func canRent(userID int, rentalCost int) (bool, int, error) {
	userCredits, err := app.getUserCredits(userID)
	canRentResult := (userCredits > rentalCost)
	return canRentResult, userCredits, err
}
