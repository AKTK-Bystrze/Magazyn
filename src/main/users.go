package main

import (
	"bystrze/services/utils"
	"fmt"
	"net/http"
	"strconv"
)

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
