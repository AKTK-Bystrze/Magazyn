package controllers

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/common/timeSet"
	"bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/auth/access"
	"bystrze/apps/userManager/credits"
	"bystrze/apps/userManager/users"
	"bystrze/apps/warehouse/rental"
	"net/http"
	"strconv"
	"time"
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
	user, err := users.GetUserById(userID)
	if err != nil {
		appState.App.Err("%v Can't get user %v", session.GetSessionUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	tmpCredits := r.FormValue("credits")
	var audit models.CreditsAudit
	var newCredits int
	if tmpCredits != "" {
		newCredits, err = strconv.Atoi(tmpCredits)
		if err != nil {
			appState.App.Err("%v Form parsing error %v", session.GetSessionUserName(r), err)
			http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
			return
		}
		audit = models.CreditsAudit{
			U_ID:        int(user.ID),
			Author_ID:   int(session.GetSessionUserId(r)),
			Value:       newCredits - user.Credits,
			Balance:     newCredits,
			Description: "Edycja",
			ChangeDate:  time.Now().In(timeSet.LOCATION),
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
	userEnabled := r.FormValue("enabled")
	if userEnabled == "on" {
		user.Enabled = true
	} else if userEnabled == "" {
		user.Enabled = false
	} else {
		appState.App.Err("%v invalid enbaled value", session.GetSessionUserName(r))
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	appState.App.Debug("%v Requested update of user: %v", session.GetSessionUserName(r), user.Name)
	err = users.UpdateUser(user)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	} else {
		if audit != (models.CreditsAudit{}) {
			credits.InsertCreditsAudit(audit)
		}
	}
	if user.ID == session.GetSessionUserId(r) {
		appState.App.Debug("%v user requested changes for his own role, relogin is needed", session.GetSessionUserName(r))
		Logout(w, r)
	}
	appState.App.Debug("%v updated user %v credits to %v roles to %v enabled to %v", session.GetSessionUserName(r), user.Name, user.Credits, user.Role, user.Enabled)
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
