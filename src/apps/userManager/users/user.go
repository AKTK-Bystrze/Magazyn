package users

import (
	"bystrze/apps/common/models"
	"bystrze/apps/userManager/appState"
	"fmt"
)

const (
	SELECT_USER_WHERE = "SELECT u_username, u_id, u_role, u_credits, u_enabled FROM users WHERE"
)

func GetUserById(userId int) (models.User, error) {
	var u models.User
	err := appState.App.Db.Get(&u, SELECT_USER_WHERE+" u_id = $1", userId)
	if err != nil {
		appState.App.Debug("Can't get user by id %v", userId)
	}
	return u, err
}

func GetUserByEmail(email string) (models.User, error) {
	var u models.User
	err := appState.App.Db.Get(&u, SELECT_USER_WHERE+" u_email = $1", email)
	if err != nil {
		appState.App.Debug("Can't get user by email %v %v", email, err.Error())
	}
	return u, err
}

func GetByUserName(name string) (models.User, error) {
	var u models.User
	err := appState.App.Db.Get(&u, SELECT_USER_WHERE+" u_username = $1", name)
	if err != nil {
		appState.App.Debug("Can't get user by name %v %v", name, err.Error())
	}
	return u, err
}

func GetUsers() ([]models.User, error) {
	query := `SELECT u_id, u_username, u_role, u_credits FROM users`

	rows, err := appState.App.Db.Queryx(query)
	if err != nil {
		appState.App.Debug("Can't get users %v", err.Error())
		return nil, err
	}
	defer rows.Close()
	var users []models.User

	for rows.Next() {
		var user models.User

		err := rows.Scan(&user.ID, &user.Name, &user.Role, &user.Credits)
		if err != nil {
			appState.App.Debug("Can't get users %v", err.Error())
			return nil, err
		}
		users = append(users, user)
	}
	if err = rows.Err(); err != nil {
		appState.App.Debug("Can't get users %v", err.Error())
		return nil, err
	}
	return users, nil
}

func UpdateUser(user models.User) error {
	query := `UPDATE users SET u_credits = %v, u_role = '%v' WHERE u_id IN (%v)`
	queryCompleted := fmt.Sprintf(query, user.Credits, user.Role, user.ID)
	_, err := appState.App.Db.Exec(queryCompleted)
	if err != nil {
		appState.App.Debug("UpdateUser %v %v", user.Name, err.Error())
	}
	return err
}

func GetUserName(id int) (string, error) {
	query := `SELECT u_username FROM users WHERE u_id = $1`
	row := appState.App.Db.QueryRow(query, id)
	var uname string
	err := row.Scan(&uname)
	if err != nil {
		appState.App.Err("GetUserName %v %v", id, err.Error())
		return "", err
	}
	return uname, nil
}

func GetUserCredits(userID int) (int, error) {
	return retriveUserCredits(userID)
}

func retriveUserCredits(userId int) (int, error) {
	query := `SELECT u_credits FROM users WHERE u_id = $1`
	row := appState.App.Db.QueryRow(query, userId)
	var credits int
	err := row.Scan(&credits)
	if err != nil {
		appState.App.Err("retriveUserCredits %v %v", userId, err.Error())
		return 0, err
	}
	return credits, nil
}
