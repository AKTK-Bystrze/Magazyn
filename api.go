package main

import (
	"net/http"
	"strconv"
	"time"
)

func ReserveItem(w http.ResponseWriter, r *http.Request) {
	var location, err = time.LoadLocation("Europe/Warsaw")

	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Application problem", http.StatusInternalServerError)
		return
	}
	// get parameters
	itemID, err := strconv.Atoi(r.FormValue("item_id"))
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	startTime, err := time.ParseInLocation("2006-01-02T15:04", r.FormValue("start_time"), location)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	endTime, err := time.ParseInLocation("2006-01-02T15:04", r.FormValue("end_time"), location)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	//  admins can make reservation in the past
	//  TODO: currently only for themselves
	if startTime.Before(time.Now()) &&
		r.Context().Value("UserInfo").(tmpUser).Role != "admin" {
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
	userID := int(r.Context().Value("UserInfo").(tmpUser).ID)

	stmt, err := app.db.Prepare("INSERT INTO reservations (r_item_id, r_user_id, r_changeby_uid, r_start_time, r_end_time, r_status) VALUES (?, ?, ?, ?, ?, ?)")
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}
	defer stmt.Close()

	status := "pending"
	_, err = stmt.Exec(itemID, userID, userID, startTime.UTC().Format(OUT_TIME_FMT), endTime.UTC().Format(OUT_TIME_FMT), status)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}

	msg := "Zarezerwowano"
	http.Redirect(w, r, "/search?msg="+msg, http.StatusFound)
}

func SearchItems(w http.ResponseWriter, r *http.Request, msg string) {
	var availableItems []tmpItem
	var timeFrom time.Time = time.Now()
	timeFrom = timeFrom.Add(time.Duration(15-timeFrom.Minute()%15) * time.Minute)
	var timeTo time.Time = timeFrom.Add(24 * time.Hour)
	var location, err = time.LoadLocation("Europe/Warsaw")

	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Application problem", http.StatusInternalServerError)
		return
	}

	if r.FormValue("start_time") != "" && r.FormValue("end_time") != "" {
		// parse the dates from the request
		//timeFrom, err := time.Parse("2006-01-02T00:00", r.FormValue("start_time"))
		timeFrom, err = time.ParseInLocation("2006-01-02T15:04", r.FormValue("start_time"), location)
		if err != nil {
			http.Error(w, "Invalid start_time parameter", http.StatusBadRequest)
			return
		}
		timeTo, err = time.ParseInLocation("2006-01-02T15:04", r.FormValue("end_time"), location)
		if err != nil {
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
				app.Err(err.Error())
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
