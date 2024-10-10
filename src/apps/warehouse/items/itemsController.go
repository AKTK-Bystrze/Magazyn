package items

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/userManager/credits"
	"bystrze/apps/userManager/users"
	"bystrze/apps/warehouse/appState"
	"bystrze/apps/warehouse/rental"
	"net/http"
	"strconv"
	"time"
)

func SearchHandler(w http.ResponseWriter, r *http.Request) {
	SearchItems(w, r, "")
}

func ReserveItem(w http.ResponseWriter, r *http.Request) {
	var location, err = time.LoadLocation("Europe/Warsaw")

	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	// get parameters
	itemID, err := strconv.Atoi(r.FormValue("item_id"))
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	startTime, err := time.ParseInLocation("2006-01-02T15:04", r.FormValue("start_time"), location)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	endTime, err := time.ParseInLocation("2006-01-02T15:04", r.FormValue("end_time"), location)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	appState.App.Debug("%v search for %v since %v till %v", session.GetSessionUserName(r), itemID, startTime, endTime)
	//  admins can make reservation in the past
	//  TODO: currently only for themselves
	if startTime.Before(time.Now()) &&
		r.Context().Value("UserInfo").(models.User).Role != "admin" {
		msg := "Data wypozyczenia musi byc w przyszlosci"
		appState.App.Debug("%v reservation date %v must be in the future %v", session.GetSessionUserName(r), startTime, time.Now())
		SearchItems(w, r, msg)
		return
	}

	// check if end time is after start time
	if !endTime.After(startTime) {
		msg := "Data zwrotu musi byc po dacie wypozyczenia"
		appState.App.Debug("%v return %v date must be later then pickUp date %v ", session.GetSessionUserName(r), endTime, startTime)
		SearchItems(w, r, msg)
		return
	}

	// check if item is available for the given time period
	ret, err := CheckAvailability(startTime, endTime, itemID)
	if err != nil || !ret {
		msg := "Przedmiot nie jest juz dostepny w tym terminie"
		appState.App.Debug("%v item unavailable in this date", session.GetSessionUserName(r))
		SearchItems(w, r, msg)
		return
	}

	// get user ID
	userID := int(r.Context().Value("UserInfo").(models.User).ID)
	item, err := GetItem(itemID)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	}
	rentalCost, err := credits.CalculateRentalCost(*item, startTime, endTime)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	canRentResult, userCredits, err := credits.CanRent(userID, rentalCost)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	}
	if canRentResult {
		user, err := users.GetUserById(userID)
		status := models.PENDING

		item, err := GetItem(itemID)
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
		appState.App.Debug("%v reserved item %v since %v till %v", session.GetSessionUserName(r), itemID, startTime, endTime)
		msg := "Zarezerwowano"
		http.Redirect(w, r, "/warehouse/user/search?msg="+msg, http.StatusFound)
	} else {
		msg := "Nie możesz wypożyczyć sprzętu"
		appState.App.Debug("%v can't reserve item %v since %v till %v", session.GetSessionUserName(r), itemID, startTime, endTime)
		SearchItems(w, r, msg)
		return
	}
}

func SearchItems(w http.ResponseWriter, r *http.Request, msg string) {
	var availableItems []models.TmpItem
	var timeFrom time.Time = time.Now()
	timeFrom = timeFrom.Add(time.Duration(15-timeFrom.Minute()%15) * time.Minute)
	var timeTo time.Time = timeFrom.Add(24 * time.Hour)
	var location, err = time.LoadLocation("Europe/Warsaw")
	appState.App.Debug("%v search from %v to %v", session.GetSessionUserName(r), timeFrom.UTC(), timeTo.UTC())
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	if r.FormValue("start_time") != "" && r.FormValue("end_time") != "" {
		// parse the dates from the request
		//timeFrom, err := time.Parse("2006-01-02T00:00", r.FormValue("start_time"))
		timeFrom, err = time.ParseInLocation("2006-01-02T15:04", r.FormValue("start_time"), location)
		if err != nil {
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			http.Error(w, "Invalid start_time parameter", http.StatusBadRequest)
			return
		}
		timeTo, err = time.ParseInLocation("2006-01-02T15:04", r.FormValue("end_time"), location)
		if err != nil {
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
			http.Error(w, "Invalid end_time parameter", http.StatusBadRequest)
			return
		}

		if timeTo.After(timeFrom) {
			availableItems, err = GetItems(models.QueryConfigItems{
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
		AvailableItems []models.TmpItem
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
