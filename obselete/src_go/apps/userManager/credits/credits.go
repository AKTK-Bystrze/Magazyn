package credits

import (
	"bystrze/apps/common/models"
	"bystrze/apps/common/timeSet"
	"bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/users"

	"database/sql"
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

type CreditsAuditTmp struct {
	ID          int
	U_ID        int
	AuthorName  string
	Value       int
	Balance     int
	Description string
	ChangeDate  time.Time
}

func UpdateUserCredits(reservation models.Reservation, creditsChange int, newCredits int, changeDescription string,
	changeAuthorID int, w http.ResponseWriter) error {
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
	audit := models.CreditsAudit{
		U_ID:        int(reservation.User.ID),
		Author_ID:   changeAuthorID,
		Value:       creditsChange,
		Balance:     newCredits,
		Description: changeDescription,
		ChangeDate:  time.Now().In(timeSet.LOCATION),
	}
	err = InsertCreditsAudit(audit)
	if err != nil {
		appState.App.Debug("Can't create credit audit %v", err.Error())
	}

	return err
}

func CalculateRentalCost(item models.Item, start_time time.Time, end_time time.Time) (int, error) {
	var rentalCost int
	rentalCost, err := getItemRentalCost(item.Type)
	startDate := time.Date(start_time.Year(), start_time.Month(), start_time.Day(), 0, 0, 0, 0, start_time.Location())
	endDate := time.Date(end_time.Year(), end_time.Month(), end_time.Day(), 0, 0, 0, 0, end_time.Location())

	duration := endDate.Sub(startDate)
	days := int(duration.Hours()/24) + 1 //todo can't calculate 1 day correctly
	appState.App.Debug("Item: %v, start %v end %v days %v cost %v", item.Type,
		start_time.Format(timeSet.OUT_TIME_FMT), end_time.Format(timeSet.OUT_TIME_FMT), days, rentalCost*days)
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

func GetUserCreditsAudits(userID int) ([]CreditsAuditTmp, error) {
	query := `
		SELECT ca_id, ca_user_id, ca_author_id, ca_value, ca_balance, ca_description, ca_change_date
		FROM credit_audit
		WHERE ca_user_id = $1
		ORDER BY ca_change_date DESC
	`

	rows, err := appState.App.Db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer func() {
		err = errors.Join(err, rows.Close())
	}()

	var audits []CreditsAuditTmp
	for rows.Next() {
		var audit CreditsAuditTmp
		var authorID sql.NullInt64

		err = rows.Scan(&audit.ID, &audit.U_ID, &authorID, &audit.Value, &audit.Balance, &audit.Description, &audit.ChangeDate)
		if err != nil {
			return nil, err
		}

		author, err := users.GetUserById(int(authorID.Int64))
		if err != nil {
			return nil, err
		}

		audit.AuthorName = author.Name
		audits = append(audits, audit)
	}

	return audits, nil
}

func InsertCreditsAudit(audit models.CreditsAudit) error {
	query := `
		INSERT INTO credit_audit 
		(ca_user_id, ca_author_id, ca_value, ca_balance, ca_description, ca_change_date)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := appState.App.Db.Exec(query, audit.U_ID, audit.Author_ID, audit.Value, audit.Balance, audit.Description, audit.ChangeDate)
	appState.App.Debug("Credits audit author %v user %v balance %v description %v ", audit.Author_ID, audit.U_ID, audit.Balance, audit.Description)
	return err
}
