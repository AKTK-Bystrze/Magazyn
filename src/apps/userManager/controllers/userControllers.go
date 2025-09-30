package controllers

import (
	"bystrze/apps"
	"bystrze/apps/common/contextHelpers"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/auth/access"
	"bystrze/apps/userManager/credits"
	"bystrze/apps/userManager/users"
	"bystrze/apps/warehouse/rental"
	"net/http"
	"time"
	"bystrze/apps/common/timeSet"
	"strconv"
)

func UserDashboard(w http.ResponseWriter, r *http.Request) {
	// TODO: Handle case in which userInfo is not available
	userInfo, _ := contextHelpers.GetUserInfo(r.Context())
	// search for reserved items in the db
	reservations, err := rental.GetReservations(rental.QueryConfigReservation{
		OneUser:     true,
		SelectionId: int(userInfo.ID),
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
	// 1. Authorization check (must be admin/superadmin)

    if r.Method != "POST" {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    r.ParseForm()

    // 'actionType' identifies which form was submitted: 'singleCredit', 'singleRole', or 'bulkCredit'
    actionType := r.PostFormValue("actionType")

    switch actionType {
	case "singleEnabled":
        userID, _ := strconv.Atoi(r.PostFormValue("userID"))
        newEnabled, err := strconv.ParseBool(r.PostFormValue("newEnabledState"))
		if err != nil {
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			http.Error(w, "Invalid enabled state", http.StatusBadRequest)
			return
		}
        
        user, err := users.GetUserById(userID) // Fetch user
        if err != nil { 
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			http.Error(w, "DB Error", http.StatusInternalServerError)
			return
		 }

        user.Enabled = newEnabled
		err = updateUser(w, r, user)
		if err != nil {
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			http.Error(w, "DB Error", http.StatusInternalServerError)
			return
		}
		appState.App.Info("%v updated user %v enabled to %v", session.GetSessionUserName(r), user.Name, user.Enabled)

    case "singleCredit":
		userID, _ := strconv.Atoi(r.PostFormValue("userID"))
        amount, _ := strconv.Atoi(r.PostFormValue("amount"))
        action := r.PostFormValue("action")
        
        user, err := users.GetUserById(userID)
        if err != nil { 
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			http.Error(w, "DB Error", http.StatusInternalServerError)
			return
		 }
		value := 0
        switch action {
			case "add":
				user.Credits += amount
				value = amount
			case "subtract":
				user.Credits -= amount
				value = -amount
        }
			audit := models.CreditsAudit{
				U_ID:        int(user.ID),
				Author_ID:   int(session.GetSessionUserId(r)),
				Value:       value,
				Balance:     user.Credits,
				Description: "Edycja",
				ChangeDate:  time.Now().In(timeSet.LOCATION),
		}
		
			updateUserCredits(w, r, user, audit) // Save user to DB using existing function
        
    case "singleRole":
        // Logic for single user role change
        userID, _ := strconv.Atoi(r.PostFormValue("userID"))
        newRole := r.PostFormValue("newRole")
        
        user, err := users.GetUserById(userID) // Fetch user
        if err != nil { 
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			http.Error(w, "DB Error", http.StatusInternalServerError)
			return
		 }

        user.Role = newRole
		err = updateUser(w, r, user)
		if err != nil {
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			http.Error(w, "DB Error", http.StatusInternalServerError)
			return
		}
		appState.App.Info("%v updated user %v role to %v", session.GetSessionUserName(r), user.Name, user.Role)
		if user.ID == session.GetSessionUserId(r) {
		appState.App.Debug("%v user requested changes for his own role, relogin is needed", session.GetSessionUserName(r))
		Logout(w, r)
	}

    case "bulkCredit":
        // Logic for bulk credit add/subtract
        selectedIDs := r.PostForm["selectedUserIDs"] // Slice of user IDs
        amount, _ := strconv.Atoi(r.PostFormValue("amount"))
        action := r.PostFormValue("action")
        
		for _, idStr := range selectedIDs {
			userID, _ := strconv.Atoi(idStr)
			user, err := users.GetUserById(userID)
			if err != nil { 
				appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
				continue // Skip this user and continue with others
			}
			value := 0
			switch action {
				case "add":
					user.Credits += amount
					value = amount
				case "subtract":
					user.Credits -= amount
					value = -amount
			}
			audit := models.CreditsAudit{
			U_ID:        int(user.ID),
			Author_ID:   int(session.GetSessionUserId(r)),
			Value:       value,
			Balance:     user.Credits,
			Description: "Edycja",
			ChangeDate:  time.Now().In(timeSet.LOCATION),
		}
			updateUserCredits(w, r, user, audit) // Save user to DB using existing function
		}

    default:
        http.Error(w, "Invalid action type", http.StatusBadRequest)
        return
    }
    
    w.WriteHeader(http.StatusOK)
}

func updateUser(w http.ResponseWriter, r *http.Request, user models.User) error {
	appState.App.Debug("%v Requested update of user: %v", session.GetSessionUserName(r), user.Name)
	err := users.UpdateUser(user)
	if err != nil {
		return err
	}
	return nil
}

func updateUserCredits(w http.ResponseWriter, r *http.Request, user models.User, audit models.CreditsAudit) {
	appState.App.Debug("%v Requested update of user: %v", session.GetSessionUserName(r), user.Name)
	err := users.UpdateUser(user)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	} else {
		if audit != (models.CreditsAudit{}) {
			if err := credits.InsertCreditsAudit(audit); err != nil {
				appState.App.Err("Error %v encountered when inserting credit audit info into db - db might be in an inconsistent state.", err)
			}
		}
	}
	appState.App.Debug("%v updated user %v credits to %v", session.GetSessionUserName(r), user.Name, user.Credits)
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
		Roles []string
		apps.TemplateData
	}{
		Users: users,
		Roles: access.ROLES,
	})
}
