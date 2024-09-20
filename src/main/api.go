package main

import (
	"bystrze/services/utils"
	"bystrze/services/structs"

	"net/http"
	"strconv"
	"time"
)

func ReserveItem(w http.ResponseWriter, r *http.Request) {
	var location, err = time.LoadLocation("Europe/Warsaw")

	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	// get parameters
	itemID, err := strconv.Atoi(r.FormValue("item_id"))
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	startTime, err := time.ParseInLocation("2006-01-02T15:04", r.FormValue("start_time"), location)
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	endTime, err := time.ParseInLocation("2006-01-02T15:04", r.FormValue("end_time"), location)
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	//  admins can make reservation in the past
	//  TODO: currently only for themselves
	if startTime.Before(time.Now()) &&
		r.Context().Value("UserInfo").(utils.TmpUser).Role != "admin" {
		msg := "Data wypozyczenia musi byc w przyszlosci"
		SearchItems(w, r, msg)
		return
	}

	// check if end time is after start time
	if !endTime.After(startTime) {
		msg := "Data zwrotu musi byc po dacie wypozyczenia"
		SearchItems(w, r, msg)
		return
	}

	// check if item is available for the given time period
	ret, err := app.checkAvailability(startTime, endTime, itemID)
	if err != nil || !ret {
		msg := "Przedmiot nie jest juz dostepny w tym terminie"
		SearchItems(w, r, msg)
		return
	}

	// get user ID
	userID := int(r.Context().Value("UserInfo").(utils.TmpUser).ID)
	rentalCost, err := CalculateRentalCost(itemID, startTime, endTime)
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	canRentResult, userCredits, err := CanRent(userID, rentalCost)
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	}
	if canRentResult {
		stmt, err := app.db.Prepare("INSERT INTO reservations (r_item_id, r_user_id, r_changeby_uid, r_start_time, r_end_time, r_status) VALUES (?, ?, ?, ?, ?, ?)")
		if err != nil {
			app.Err("%v %v", utils.GetUserName(r), err.Error())
			http.Error(w, "DB error", http.StatusBadRequest)
			return
		}
		defer stmt.Close()

		status := structs.PENDING
		_, err = stmt.Exec(itemID, userID, userID, startTime.UTC().Format(OUT_TIME_FMT), endTime.UTC().Format(OUT_TIME_FMT), status)
		if err != nil {
			app.Err("%v %v", utils.GetUserName(r), err.Error())
			http.Error(w, "DB error", http.StatusBadRequest)
			return
		}

		stmt_update_credits, err := app.db.Prepare(`UPDATE users SET u_credits = ? WHERE u_id = ?`)
		if err != nil {
			app.Err("%v %v", utils.GetUserName(r), err.Error())
			http.Error(w, "DB error", http.StatusBadRequest)
			return
		}
		defer stmt_update_credits.Close()
		credits_left := userCredits - rentalCost
		_, err = stmt_update_credits.Exec(credits_left, userID)
		if err != nil {
			app.Err("%v %v", utils.GetUserName(r), err.Error())
			http.Error(w, "DB error", http.StatusBadRequest)
			return
		}

		msg := "Zarezerwowano"
		http.Redirect(w, r, "/search?msg="+msg, http.StatusFound)
	} else {
		msg := "Nie możesz wypożyczyć sprzętu"
		SearchItems(w, r, msg)
		return
	}
}

func SearchItems(w http.ResponseWriter, r *http.Request, msg string) {
	var availableItems []tmpItem
	var timeFrom time.Time = time.Now()
	timeFrom = timeFrom.Add(time.Duration(15-timeFrom.Minute()%15) * time.Minute)
	var timeTo time.Time = timeFrom.Add(24 * time.Hour)
	var location, err = time.LoadLocation("Europe/Warsaw")
	app.Debug("%v search from %v to %v", utils.GetUserName(r), timeFrom.UTC(), timeTo.UTC())
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	if r.FormValue("start_time") != "" && r.FormValue("end_time") != "" {
		// parse the dates from the request
		//timeFrom, err := time.Parse("2006-01-02T00:00", r.FormValue("start_time"))
		timeFrom, err = time.ParseInLocation("2006-01-02T15:04", r.FormValue("start_time"), location)
		if err != nil {
			app.Err("%v %v", utils.GetUserName(r), err.Error())
			http.Error(w, "Invalid start_time parameter", http.StatusBadRequest)
			return
		}
		timeTo, err = time.ParseInLocation("2006-01-02T15:04", r.FormValue("end_time"), location)
		if err != nil {
			app.Err("%v %v", utils.GetUserName(r), err.Error())
			http.Error(w, "Invalid end_time parameter", http.StatusBadRequest)
			return
		}

		if timeTo.After(timeFrom) {
			availableItems, err = app.getItems(queryConfigItems{
				available: true,
				startTime: timeFrom.UTC(),
				endTime:   timeTo.UTC(),
			})

			if err != nil {
				app.Err("%v %v", utils.GetUserName(r), err.Error())
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
	app.renderTemplate(w, r, "search.html", &struct {
		AvailableItems []tmpItem
		StartTime      time.Time
		EndTime        time.Time
		Msg            string
		templateData
	}{
		AvailableItems: availableItems,
		StartTime:      timeFrom,
		EndTime:        timeTo,
		Msg:            msg,
	})
}
