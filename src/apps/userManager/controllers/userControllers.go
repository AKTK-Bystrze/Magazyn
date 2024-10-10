package controllers

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/auth/access"
	"bystrze/apps/userManager/users"
	"bystrze/apps/warehouse/rental"
	"fmt"
	"net/http"
	"strconv"
)

func UserDashboard(w http.ResponseWriter, r *http.Request) {
	// search for reserved items in the db
	reservations, err := rental.GetReservations(rental.QueryConfigReservation{
		OneUser:     true,
		SelectionId: int(r.Context().Value("UserInfo").(models.User).ID),
		OrderDesc:   true,
	})
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	appState.App.RenderTemplate(w, r, "user_dashboard.html", &struct {
		Reservations []models.Reservation
		apps.TemplateData
	}{
		Reservations: reservations,
	})
}

func UpdateUser(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		appState.App.Err("%v Form parsing error %v", session.GetSessionUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	userID, err := strconv.Atoi(r.FormValue("ID"))
	if err != nil {
		appState.App.Err("%v Form parsing error %v", session.GetSessionUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	user, err := users.GetUser(userID)
	if err != nil {
		appState.App.Err("%v Can't get user %v", session.GetSessionUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	tmpCredits := r.FormValue("credits")
	var newCredits int
	if tmpCredits != "" {
		newCredits, err = strconv.Atoi(tmpCredits)
		if err != nil {
			appState.App.Err("%v Form parsing error %v", session.GetSessionUserName(r), err)
			http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
			return
		}
		user.Credits = newCredits
	}
	userRole := r.FormValue("role")
	if userRole != "" {
		if !access.AreRolesValid(userRole) {
			appState.App.Err("%v invalid new roles", session.GetSessionUserName(r))
			http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
			return
		}
		user.Role = userRole
	}

	appState.App.Debug("%v Requested update of user: %v", session.GetSessionUserName(r), user.Name)
	query := `UPDATE users SET u_credits = %v, u_role = '%v' WHERE u_id IN (%v)`
	queryCompleted := fmt.Sprintf(query, user.Credits, user.Role, userID)

	_, err = appState.App.Db.Exec(queryCompleted)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}
	if user.ID == session.GetSessionUserId(r) {
		appState.App.Debug("%v user requested changes for his own role, relogin is needed", session.GetSessionUserName(r))
		Logout(w, r)
	}
	appState.App.Debug("%v updated user %v credits to %v and roles to %v", session.GetSessionUserName(r), user.Name, user.Credits, user.Role)
	w.WriteHeader(http.StatusOK)
}

func GetUsersController(w http.ResponseWriter, r *http.Request) {
	users, err := users.GetUsers()
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	appState.App.RenderTemplate(w, r, "users.html", &struct {
		Users []models.User
		apps.TemplateData
	}{
		Users: users,
	})
}
