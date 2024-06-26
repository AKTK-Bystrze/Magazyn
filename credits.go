package main

import (
	"errors"
	"net/http"
)

const (
	kayakItemType = "kayak"
	kayakItemCost = 4
)

func calculateRentalCost(item Item) (int, error) {
	err := app.db.Get(&user, "SELECT u_username, u_id, u_role FROM users WHERE u_id = ?", userID)
	rentalCost, err = getItemRentalCost(item.Type)
	return rentalCost, err
}

func getItemRentalCost(itemType string) (int, error) {
	switch itemType {
	case kayakItemType:
		return kayakItemCost, nil
	default:
		return 0, errors.New("unknown item type")
	}
}

func canRent(userID int, rentalCost int) (bool, error) {
	var user User
	err := app.db.Get(&user, "SELECT u_username, u_id, u_role FROM users WHERE u_id = ?", userID)
	canRentResult := (user.Credits > rentalCost)
	return canRentResult, err
}
