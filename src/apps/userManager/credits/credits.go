package credits

import (
	"bystrze/apps/common/models"
	"bystrze/apps/userManager/appState"
	"net/http"

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

func UpdateUserCredits(reservation models.Reservation, newCredits int, w http.ResponseWriter) error {
	u := reservation.User
	var oldCredits = u.Credits
	result, err := appState.App.Db.Exec(`UPDATE users SET u_credits = ? WHERE u_id = ?`, newCredits, u.ID)
	if err != nil {
		appState.App.Err(err.Error())
		http.Error(w, "Cant update users credits", http.StatusBadRequest)
		return err
	}
	numRows, err := result.RowsAffected()
	if err != nil || numRows != 1 {
		if err != nil {
			appState.App.Err(err.Error())
		} else {
			appState.App.Err("Failed to update user credits %v", err)
		}
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return err
	}
	if err != nil {
		appState.App.Err(err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return err
	}
	appState.App.Info("%v Updated user (id: %v) credits from %v to %v", u.Name, u.ID, oldCredits, newCredits)
	return nil
}

func getUserCredits(id int) (int, error) {
	query := `SELECT u_credits FROM users WHERE u_id = ?`
	row := appState.App.Db.QueryRow(query, id)
	var credits int
	err := row.Scan(&credits)
	if err != nil {
		appState.App.Err(err.Error())
		return 0, err
	}
	return credits, nil
}

func CalculateRentalCost(item models.Item, start_time time.Time, end_time time.Time) (int, error) {
	var rentalCost int
	duration := end_time.Sub(start_time)
	rentalCost, err := getItemRentalCost(item.Type)
	days := int(math.Max(duration.Hours()/24, 1))
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
	userCredits, err := GetUserCredits(userID)
	canRentResult := (userCredits > rentalCost)
	appState.App.Debug("userCredits %v rentalCost %v canRent %v", userCredits, rentalCost, canRentResult)
	return canRentResult, userCredits, err
}

func GetUserCredits(userID int) (int, error) {
	return retriveUserCredits(userID)
}

func retriveUserCredits(userId int) (int, error) {
	query := `SELECT u_credits FROM users WHERE u_id = ?`
	row := appState.App.Db.QueryRow(query, userId)
	var credits int
	err := row.Scan(&credits)
	if err != nil {
		appState.App.Err(err.Error())
		return 0, err
	}
	return credits, nil
}
