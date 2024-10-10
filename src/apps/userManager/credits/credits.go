package credits

import (
	"bystrze/apps/common/models"
	"bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/users"
	"net/http"

	"errors"
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

func UpdateUserCredits(reservation models.Reservation, newCredits int, w http.ResponseWriter) error {
	u := reservation.User
	u, err := users.GetUserById(int(u.ID))
	if err != nil {
		appState.App.Err("UpdateUserCredits %v", err.Error())
		http.Error(w, "Cant get user", http.StatusBadRequest)
		return err
	}
	var oldCredits = u.Credits
	u.Credits = newCredits
	err = users.UpdateUser(u)
	if err != nil {
		appState.App.Err("UpdateUserCredits %v", err.Error())
		http.Error(w, "Cant update users credits", http.StatusBadRequest)
		return err
	}
	appState.App.Info("%v Updated user (id: %v) credits from %v to %v", u.Name, u.ID, oldCredits, newCredits)
	return nil
}

func CalculateRentalCost(item models.Item, start_time time.Time, end_time time.Time) (int, error) {
	var rentalCost int
	rentalCost, err := getItemRentalCost(item.Type)
	startDate := time.Date(start_time.Year(), start_time.Month(), start_time.Day(), 0, 0, 0, 0, start_time.Location())
	endDate := time.Date(end_time.Year(), end_time.Month(), end_time.Day(), 0, 0, 0, 0, end_time.Location())

	duration := endDate.Sub(startDate)
	days := int(duration.Hours()/24) + 1
	appState.App.Debug("Item: %v, start %v end %v days %v cost %v", item.Type, start_time, end_time, days, rentalCost*days)
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
		appState.App.Err("unknown item type", itemType)
		return 0, errors.New("unknown item type")
	}
}

func CanRent(userID int, rentalCost int) (bool, int, error) {
	userCredits, err := users.GetUserCredits(userID)
	canRentResult := (userCredits > rentalCost)
	appState.App.Debug("userCredits %v rentalCost %v canRent %v", userCredits, rentalCost, canRentResult)
	return canRentResult, userCredits, err
}
