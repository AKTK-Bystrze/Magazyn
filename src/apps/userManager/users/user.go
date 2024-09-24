package users

import (
	"bystrze/apps/userManager/appState"
)

type User struct {
	ID      int64  `db:"u_id"`
	Name    string `db:"u_username"`
	Email   string `db:"u_email"`
	Role    string `db:"u_role"`
	Credits int    `db:"u_credits"`
}

// // todo should TmpUser and User be both in use insted of one?
// type TmpUser struct {
// 	ID      int64  `db:"u_id"`
// 	Name    string `db:"u_username"`
// 	Role    string `db:"u_role"`
// 	Credits int    `db:"u_credits"`
// }

func GetUser(userId int) (User, error) {
	var u User
	err := appState.App.Db.Get(&u, "SELECT u_username, u_id, u_role, u_credits FROM users WHERE u_id = ?", userId) //TODO it parses to tmpUser !!!
	return u, err
}

func GetUsers(w http.ResponseWriter, r *http.Request) {
	users, err := app.GetUsers()
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	app.renderTemplate(w, r, "users.html", &struct {
		Users []utils.TmpUser
		templateData
	}{
		Users: users,
	})
}

func UpdateUser(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		app.Err("%v Form parsing error %v", utils.GetUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	userID, err := strconv.Atoi(r.FormValue("ID"))
	if err != nil {
		app.Err("%v Form parsing error %v", utils.GetUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	user, err := app.GetUser(userID)
	if err != nil {
		app.Err("%v Can't get user %v", utils.GetUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	tmpCredits := r.FormValue("credits")
	var newCredits int
	if tmpCredits != "" {
		newCredits, err = strconv.Atoi(tmpCredits)
		if err != nil {
			app.Err("%v Form parsing error %v", utils.GetUserName(r), err)
			http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
			return
		}
		user.Credits = newCredits
	}
	userRole := r.FormValue("role")
	if userRole != "" {
		if !areRolesValid(userRole) {
			app.Err("%v invalid new roles", utils.GetUserName(r))
			http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
			return
		}
		user.Role = userRole
	}

	app.Debug("%v Requested update of user: %v credits %v, role %v", utils.GetUserName(r), user.Name, user.Credits, user.Role)
	query := `UPDATE users SET u_credits = %v, u_role = '%v' WHERE u_id IN (%v)`
	queryCompleted := fmt.Sprintf(query, user.Credits, user.Role, userID)

	_, err = app.db.Exec(queryCompleted)
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}
	if user.ID == utils.GetUserId(r) {
		app.Debug("%v user requested changes for his own role, relogin is needed", utils.GetUserName(r))
		Logout(w, r)
	}
	app.Debug("%v updated user %v credits to %v and roles to %v", utils.GetUserName(r), user.Name, user.Credits, user.Role)
	w.WriteHeader(http.StatusOK)
}

func (app AppState) GetUser(userId int) (utils.TmpUser, error) {
	var u utils.TmpUser
	err := app.db.Get(&u, "SELECT u_username, u_id, u_role, u_credits FROM users WHERE u_id = ?", userId)
	return u, err
}

func GetUserName(r *http.Request) string {
	uinfo, ok := r.Context().Value("UserInfo").(TmpUser)
	return If(ok, uinfo.Name, "unknown")
}

func GetUserId(r *http.Request) int64 {
	uinfo, ok := r.Context().Value("UserInfo").(TmpUser)
	return If(ok, uinfo.ID, -1)
}

func GetEmailUsername(email string) string {
	usernameAndDomain := strings.Split(email, "@")
	return usernameAndDomain[0]
}

func (app AppState) GetUsers() ([]utils.TmpUser, error) {
	query := `SELECT u_id, u_username, u_role, u_credits FROM users`

	rows, err := app.db.Queryx(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []utils.TmpUser

	for rows.Next() {
		var user utils.TmpUser

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

func (app AppState) GetUserName(id int) (string, error) {
	query := `SELECT u_username FROM users WHERE u_id = ?`
	row := app.db.QueryRow(query, id)
	var uname string
	err := row.Scan(&uname)
	if err != nil {
		app.Err(err.Error())
		return "", err
	}
	return uname, nil
}
