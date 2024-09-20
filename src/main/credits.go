package main

import (
	"errors"
	"math"
	"time"
)

const (
	kayakItemType      = "kayak"
	kayakItemCost      = 4
	paddleItemType     = "paddle"
	paddleItemCost     = 2
	lifeJacketItemType = "life_jacket"
	lifeJacketItemCost = 1
	helmetItemType     = "helmet"
	helmetItemCost     = 1
	jacketItemType     = "jacket"
	jacketItemCost     = 1
	spraySkirtItemType = "spray_skirt"
	spraySkirtItemCost = 1
	ropeItemType       = "rope"
	ropeItemCost       = 1
	wetsuitItemType    = "wetsuit"
	wetsuitItemCost    = 1
)

func CalculateRentalCost(itemID int, start_time time.Time, end_time time.Time) (int, error) {
	item, err := app.getItem(itemID)
	if err != nil {
		return 0, err
	}
	var rentalCost int
	duration := end_time.Sub(start_time)
	rentalCost, err = getItemRentalCost(item.Type)
	days := int(math.Max(duration.Hours()/24, 1))
	app.Debug("Item: %v, start %v end %v days %v cost %v", item.Type, start_time, end_time, days, rentalCost*days)
	return rentalCost * days, err
}

func getItemRentalCost(itemType string) (int, error) {
	switch itemType {
	case kayakItemType:
		return kayakItemCost, nil
	case paddleItemType:
		return paddleItemCost, nil
	case lifeJacketItemType:
		return lifeJacketItemCost, nil
	case helmetItemType:
		return helmetItemCost, nil
	case jacketItemType:
		return jacketItemCost, nil
	case spraySkirtItemType:
		return spraySkirtItemCost, nil
	case ropeItemType:
		return ropeItemCost, nil
	case wetsuitItemType:
		return wetsuitItemCost, nil
	default:
		app.Err("unknown item type", itemType)
		return 0, errors.New("unknown item type")
	}
}

func CanRent(userID int, rentalCost int) (bool, int, error) {
	userCredits, err := app.getUserCredits(userID)
	canRentResult := (userCredits > rentalCost)
	app.Debug("userCredits %v rentalCost %v canRent %v", userCredits, rentalCost, canRentResult)
	return canRentResult, userCredits, err
}
