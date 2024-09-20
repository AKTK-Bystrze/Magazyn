package main

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

func (app AppState) hasSuperAdminPrivilege(w http.ResponseWriter, r *http.Request) bool {
	uinfo, ok := r.Context().Value("UserInfo").(tmpUser)
	if !ok || !strings.Contains(uinfo.Role, SUPERADMIN) {
		app.Err("Non-SuperAdmin user (%s) attempts to access superAdmin API", If(ok, uinfo.Name, "unknown"))
		http.Redirect(w, r, "/", http.StatusFound)
		return false
	}
	return true
}

func getUsers(w http.ResponseWriter, r *http.Request) {
	users, err := app.getUsers()
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	app.renderTemplate(w, r, "users.html", &struct {
		Users []tmpUser
		templateData
	}{
		Users: users,
	})
}

func updateUser(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		app.Err("%v Form parsing error %v", getUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	userID, err := strconv.Atoi(r.FormValue("ID"))
	if err != nil {
		app.Err("%v Form parsing error %v", getUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	user, err := app.getUser(userID)
	if err != nil {
		app.Err("%v Can't get user %v", getUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	tmpCredits := r.FormValue("credits")
	var newCredits int
	if tmpCredits != "" {
		newCredits, err = strconv.Atoi(tmpCredits)
		if err != nil {
			app.Err("%v Form parsing error %v", getUserName(r), err)
			http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
			return
		}
		user.Credits = newCredits
	}
	userRole := r.FormValue("role")
	if userRole != "" {
		if !areRolesValid(userRole) {
			app.Err("%v invalid new roles", getUserName(r))
			http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
			return
		}
		user.Role = userRole
	}

	app.Debug("%v Requested update of user: %v credits %v, role %v", getUserName(r), user.Name, user.Credits, user.Role)
	query := `UPDATE users SET u_credits = %v, u_role = '%v' WHERE u_id IN (%v)`
	queryCompleted := fmt.Sprintf(query, user.Credits, user.Role, userID)

	_, err = app.db.Exec(queryCompleted)
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}
	if user.ID == getUserId(r) {
		app.Debug("%v user requested changes for his own role, relogin is needed", getUserName(r))
		Logout(w, r)
	}
	app.Debug("%v updated user %v credits to %v and roles to %v", getUserName(r), user.Name, user.Credits, user.Role)
	w.WriteHeader(http.StatusOK)
}
