package users

import (
	"bystrze/apps/common/models"
	"bystrze/apps/userManager/appState"
)

// // todo should TmpUser and User be both in use insted of one?
// type TmpUser struct {
// 	ID      int64  `db:"u_id"`
// 	Name    string `db:"u_username"`
// 	Role    string `db:"u_role"`
// 	Credits int    `db:"u_credits"`
// }

func GetUser(userId int) (models.User, error) {
	var u models.User
	err := appState.App.Db.Get(&u, "SELECT u_username, u_id, u_role, u_credits FROM users WHERE u_id = ?", userId) //TODO it parses to tmpUser !!!
	return u, err
}

func GetUsers() ([]models.User, error) {
	query := `SELECT u_id, u_username, u_role, u_credits FROM users`

	rows, err := appState.App.Db.Queryx(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []models.User

	for rows.Next() {
		var user models.User

		err := rows.Scan(&user.ID, &user.Name, &user.Role, &user.Credits)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

func GetUserName(id int) (string, error) {
	query := `SELECT u_username FROM users WHERE u_id = ?`
	row := appState.App.Db.QueryRow(query, id)
	var uname string
	err := row.Scan(&uname)
	if err != nil {
		appState.App.Err(err.Error())
		return "", err
	}
	return uname, nil
}

func patchUser(user models.User) (models.User, error) {
	return models.User{}, nil
}
