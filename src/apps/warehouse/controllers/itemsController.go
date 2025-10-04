package controllers

import (
	"bystrze/apps"
	"bystrze/apps/common/contextHelpers"
	"bystrze/apps/common/httpResponse"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/common/timeSet"
	"bystrze/apps/email/service"
	"bystrze/apps/userManager/auth/access"
	"bystrze/apps/userManager/credits"
	"bystrze/apps/userManager/users"
	"bystrze/apps/warehouse/appState"
	"bystrze/apps/warehouse/items"
	"bystrze/apps/warehouse/rental"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

func SearchHandler(w http.ResponseWriter, r *http.Request) {
	SearchItems(w, r, "")
}

func ReserveItem(w http.ResponseWriter, r *http.Request) {
	// 1. Parse item ID, start time, and end time
	itemID, err := strconv.Atoi(r.FormValue("item_id"))
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	startTime, err := time.ParseInLocation(timeSet.IN_TIME_FMT, r.FormValue("start_time"), timeSet.LOCATION)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	endTime, err := time.ParseInLocation(timeSet.IN_TIME_FMT, r.FormValue("end_time"), timeSet.LOCATION)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	appState.App.Debug("%v search for %v since %v till %v", session.GetSessionUserName(r), itemID,
		startTime.Format(timeSet.OUT_TIME_FMT), endTime.Format(timeSet.OUT_TIME_FMT))

	// Get logged-in user information
	userInfo, ok := contextHelpers.GetUserInfo(r.Context())
	if !ok {
		appState.App.Err("User info not found in context for reservation attempt")
		http.Error(w, "User authentication required", http.StatusUnauthorized)
		return
	}

	// 2. Determine the target user for the reservation
	var targetUserID int
	targetUserParam := r.URL.Query().Get("user")
	isCurrentUserAdmin := userInfo.Role == access.ROLE_ADMIN

	// Default to current logged-in user
	targetUserID = int(userInfo.ID)
	targetUsername := session.GetSessionUserName(r) // Default username for logging

	if targetUserParam != "" && isCurrentUserAdmin {
		// Attempt to parse the parameter as an ID first (preferred method)
		if id, err := strconv.Atoi(targetUserParam); err == nil {
			// Success: Parameter is a valid ID
			targetUser, err := users.GetUserById(id)
			if err == nil {
				targetUserID = id
				targetUsername = targetUser.Name
				appState.App.Debug("%v reserving for user ID %d (%s) ", session.GetSessionUserName(r), targetUserID, targetUsername)
			} else {
				appState.App.Err("%v Admin (%s) failed to find target user with ID %d: %v", session.GetSessionUserName(r), userInfo.Role, id, err.Error())
				http.Error(w, "Target user not found (by ID)", http.StatusBadRequest)
				return
			}
		}
	} else {
		// Standard user reserving for themselves, or non-admin using the 'user' parameter (ignored).
		appState.App.Debug("%v reserving for self (user ID %d)", session.GetSessionUserName(r), targetUserID)
	}

	// 3. Check for reservation date in the past (only admins can reserve in the past)
	if startTime.Before(time.Now()) && !isCurrentUserAdmin {
		msg := "Data wypozyczenia musi byc w przyszlosci"
		appState.App.Debug("%v reservation date %v must be in the future %v", session.GetSessionUserName(r), startTime, time.Now())
		httpResponse.ResponseErrorMsg(w, r, msg)
		return
	}

	// check if end time is after start time
	if !endTime.After(startTime) {
		msg := "Data zwrotu musi byc po dacie wypozyczenia"
		appState.App.Debug("%v return %v date must be later then pickUp date %v ", session.GetSessionUserName(r), endTime, startTime)
		httpResponse.ResponseErrorMsg(w, r, msg)
		return
	}

	// check if item is available for the given time period
	ret, err := items.CheckAvailability(startTime, endTime, itemID)
	if err != nil || !ret {
		msg := "Przedmiot nie jest juz dostepny w tym terminie"
		appState.App.Debug("%v item unavailable in this date", session.GetSessionUserName(r))
		httpResponse.ResponseErrorMsg(w, r, msg)
		return
	}
	item, err := items.GetItem(itemID)
	if err != nil {
		appState.App.Err("%v Can't get item %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	rentalCost, err := credits.CalculateRentalCost(*item, startTime, endTime)
	if err != nil {
		appState.App.Err("%v Can't caluculate renatl cost %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	// Check if the target user can afford the rental cost
	canRentResult, userCredits, err := credits.CanRent(targetUserID, rentalCost)
	if err != nil {
		appState.App.Err("%v Can't evaluate if can rent for user %d: %v", session.GetSessionUserName(r), targetUserID, err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	if canRentResult {
		// Fetch the full user object for the reservation struct
		user, err := users.GetUserById(targetUserID)
		if err != nil {
			appState.App.Err("%v Can't get user %d: %v", session.GetSessionUserName(r), targetUserID, err.Error())
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}

		status := rental.PENDING

		item, err := items.GetItem(itemID)
		if err != nil {
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			http.Error(w, "DB error", http.StatusBadRequest)
			return
		}

		reservation := models.Reservation{
			StartTime: startTime,
			EndTime:   endTime,
			Status:    status,
			Item:      *item,
			User:      user,
		}
		err = rental.AddReservation(reservation)
		if err != nil {
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			http.Error(w, "DB error", http.StatusBadRequest)
			return
		}

		credits_left := userCredits - rentalCost
		auditMsg := reservation.Item.Name + "\tRezerwacja/wypozyczenie"
		err = credits.UpdateUserCredits(reservation, -rentalCost, credits_left, auditMsg, int(session.GetSessionUserId(r)), w)
		if err != nil {
			msg := "DB error"
			http.Redirect(w, r, "/warehouse/user/search?msg="+msg, http.StatusInternalServerError)
			return
		}

		appState.App.Debug("%v reserved item %v for user %s (ID %d) since %v till %v", session.GetSessionUserName(r),
			itemID, targetUsername, targetUserID, startTime.Format(timeSet.OUT_TIME_FMT), endTime.Format(timeSet.OUT_TIME_FMT))

		msg := "Zarezerwowano"
		NotifyAdminsOnReservation(reservation)
		http.Redirect(w, r, "/warehouse/user/search?msg="+msg, http.StatusFound)
	} else {
		msg := "Nie możesz wypożyczyć sprzętu"
		appState.App.Debug("%v can't reserve item %v for user ID %d since %v till %v (Insufficient credits or other reason)", session.GetSessionUserName(r), itemID, targetUserID,
			startTime.Format(timeSet.OUT_TIME_FMT), endTime.Format(timeSet.OUT_TIME_FMT))
		httpResponse.ResponseErrorMsg(w, r, msg)
		return
	}
}


func SearchItems(w http.ResponseWriter, r *http.Request, msg string) {
	var availableItems []models.TmpItemWithReservation
	var timeFrom time.Time
	var timeTo time.Time
	var err error

	if r.FormValue("start_time") != "" && r.FormValue("end_time") != "" {
		timeFrom, err = time.ParseInLocation(timeSet.IN_TIME_FMT, r.FormValue("start_time"), timeSet.LOCATION)
		if err != nil {
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			msg = "Invalid start_time parameter"
			httpResponse.ResponseErrorMsg(w, r, msg)
			return
		}
		timeTo, err = time.ParseInLocation(timeSet.IN_TIME_FMT, r.FormValue("end_time"), timeSet.LOCATION)
		if err != nil {
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			msg = "Invalid end_time parameter"
			httpResponse.ResponseErrorMsg(w, r, msg)
			return
		}

		if timeTo.After(timeFrom) {
			availableItems, err = items.GetItems(models.QueryConfigItems{
				Available: true,
				StartTime: timeFrom.UTC(),
				EndTime:   timeTo.UTC(),
			})

			if err != nil {
				appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
				http.Error(w, "DB Error", http.StatusInternalServerError)
				return
			}
		} else {
			msg = "Data zwrotu musi byc po dacie wypozyczenia"
		}

	} else {
		timeFrom = time.Now()
		timeFrom = timeFrom.Add(15 * time.Minute)
		timeTo = timeFrom.Add(24 * time.Hour)
	}

	//  TODO: check for injection
	if msg == "" {
		msg = r.FormValue("msg")
	}
	appState.App.Debug("%v search from %v to %v", session.GetSessionUserName(r),
		timeFrom.UTC(), timeTo.UTC())

	usersList, err := users.GetUsers()
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	var usersIdName []models.UserNameAndId
	for _, u := range usersList {
		usersIdName = append(usersIdName, models.UserNameAndId{
			ID:   u.ID,
			Name: u.Name,
		})
	}
	appState.App.RenderTemplate(w, r, "search.html", &struct {
		AvailableItems []models.TmpItemWithReservation
		StartTime      time.Time
		EndTime        time.Time
		Msg            string
		Users 	[]models.UserNameAndId
		apps.TemplateData
	}{
		AvailableItems: availableItems,
		StartTime:      timeFrom,
		EndTime:        timeTo,
		Msg:            msg,
		Users: usersIdName,
	})
}

func  NotifyAdminsOnReservation(reservation models.Reservation) {
    if !service.CanSendAdminNotification() {
        appState.App.Info("Not notifying admins about new reservation - too many emails sent recently")
        return
    }

    admins, err := users.GetAdminUsers() 
    if err != nil {
        appState.App.Err("Failed to fetch admin users: %v", err)
        return
    }

    var adminEmails []string
    for _, admin := range admins {
        if admin.Email != "" {
            adminEmails = append(adminEmails, admin.Email)
        }
    }
    
    if len(adminEmails) == 0 {
        appState.App.Debug("No admin users found with valid emails to notify.")
        return
    }

    subject := "Dodano nowe rezerwacje"
    timeFormat := timeSet.LOCATION.String()
    body := fmt.Sprintf("Nowe rezerwacje zostały dodane.\n\nSzczegóły najnowszej rezerwacji:\n"+
        "Użytkownik: %s\nSprzęt: %s\nStart: %s\nKoniec: %s",
        reservation.User.Name, 
        reservation.Item.Name, 
        reservation.StartTime.Format(timeFormat),
        reservation.EndTime.Format(timeFormat))

    recipients := service.EmailRecipientList{
        To:  []string{},
        Cc:  []string{},
        Bcc: adminEmails,
    }

    service.SendEmailAsync(recipients, subject, body)
}

