package main

import (
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
		Users []User
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
	userCredits, err := strconv.Atoi(r.FormValue("updatedCredits"))
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
	app.Debug("%v Requested update of user: %v credits to %v", getUserId(r), userID, userCredits)

	query := `UPDATE users SET u_credits %v WHERE u_id IN (%v)`

	_, err = app.db.Exec(query, userCredits, userID)
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}

	app.Debug("%v updated user: %v credits to %v", getUserName(r), userID, userCredits)
	w.WriteHeader(http.StatusOK)
}
