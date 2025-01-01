package controllers

import (
	"bystrze/apps"
	"bystrze/apps/common/httpResponse"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/common/timeSet"
	"bystrze/apps/userManager/credits"
	"bystrze/apps/userManager/users"
	"bystrze/apps/warehouse/appState"
	"bystrze/apps/warehouse/items"
	"bystrze/apps/warehouse/rental"
	"net/http"
	"strconv"
	"time"
)

func SearchHandler(w http.ResponseWriter, r *http.Request) {
	SearchItems(w, r, "")
}

func ReserveItem(w http.ResponseWriter, r *http.Request) {
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
	//  admins can make reservation in the past
	//  TODO: currently only for themselves
	if startTime.Before(time.Now()) &&
		r.Context().Value("UserInfo").(models.User).Role != "admin" {
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

	// get user ID
	userID := int(r.Context().Value("UserInfo").(models.User).ID)
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
	canRentResult, userCredits, err := credits.CanRent(userID, rentalCost)
	if err != nil {
		appState.App.Err("%v Can't evaluate if can rent %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	if canRentResult {
		user, err := users.GetUserById(userID)
		if err != nil {
			appState.App.Err("%v Can't get user %v", session.GetSessionUserName(r), err.Error())
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
		user.Credits = credits_left
		users.UpdateUser(user)
		appState.App.Debug("%v reserved item %v since %v till %v", session.GetSessionUserName(r),
			itemID, startTime.Format(timeSet.OUT_TIME_FMT), endTime.Format(timeSet.OUT_TIME_FMT))
		msg := "Zarezerwowano"
		http.Redirect(w, r, "/warehouse/user/search?msg="+msg, http.StatusFound)
	} else {
		msg := "Nie możesz wypożyczyć sprzętu"
		appState.App.Debug("%v can't reserve item %v since %v till %v", session.GetSessionUserName(r), itemID,
			startTime.Format(timeSet.OUT_TIME_FMT), endTime.Format(timeSet.OUT_TIME_FMT))
		httpResponse.ResponseErrorMsg(w, r, msg)
		return
	}
}

func SearchItems(w http.ResponseWriter, r *http.Request, msg string) {
	var availableItems []models.TmpItemWithReservation
	var timeFrom time.Time = time.Now()
	timeFrom = timeFrom.Add(time.Duration(15-timeFrom.Minute()%15) * time.Minute)
	var timeTo time.Time = timeFrom.Add(24 * time.Hour)
	appState.App.Debug("%v search from %v to %v", session.GetSessionUserName(r),
		timeFrom.UTC().Format(timeSet.OUT_TIME_FMT), timeTo.UTC().Format(timeSet.OUT_TIME_FMT))

	if r.FormValue("start_time") != "" && r.FormValue("end_time") != "" {
		timeFrom, err := time.ParseInLocation("2006-01-02T15:04", r.FormValue("start_time"), timeSet.LOCATION)
		if err != nil {
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			msg = "Invalid start_time parameter"
			httpResponse.ResponseErrorMsg(w, r, msg)
			return
		}
		timeTo, err = time.ParseInLocation("2006-01-02T15:04", r.FormValue("end_time"), timeSet.LOCATION)
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

	}

	//  TODO: check for injection
	if msg == "" {
		msg = r.FormValue("msg")
	}

	// render the search results template with the available items list
	appState.App.RenderTemplate(w, r, "search.html", &struct {
		AvailableItems []models.TmpItemWithReservation
		StartTime      time.Time
		EndTime        time.Time
		Msg            string
		apps.TemplateData
	}{
		AvailableItems: availableItems,
		StartTime:      timeFrom,
		EndTime:        timeTo,
		Msg:            msg,
	})
}
