package main

import (
  "net/http"
  "time"
  "log"
  "strconv"
)

func ReserveItem(w http.ResponseWriter, r *http.Request) {
	session, _ := app.store.Get(r, SESSION_NAME)
	// get parameters
	itemID, err := strconv.Atoi(r.FormValue("item_id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	startTime, err := time.Parse("2006-01-02T15:04", r.FormValue("start_time"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	endTime, err := time.Parse("2006-01-02T15:04", r.FormValue("end_time"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

  //  admins can make reservation in the past
  //  TODO: currently only for themselves
	if startTime.Before(time.Now()) && session.Values["role"] != "admin" {
		msg := "Data wypozyczenia musi byc w przyszlosci"
    SearchItems(w, r, msg)
    return
	}

	// check if end time is after start time
	if ! endTime.After(startTime) {
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

	// get user ID from session
	userID := session.Values["user_id"].(int)

	stmt, err := app.db.Prepare("INSERT INTO reservations (r_item_id, r_user_id, r_changeby_uid, r_start_time, r_end_time, r_status) VALUES (?, ?, ?, ?, ?, ?)")
	if err != nil {
		log.Println(err)
		return
	}
	defer stmt.Close()

	status := "pending"
	_, err = stmt.Exec(itemID, userID, userID, startTime.Format(OUT_TIME_FMT), endTime.Format(OUT_TIME_FMT), status)
	if err != nil {
		log.Println(err)
		return
	}

	msg := "Zarezerwowano"
  SearchItems(w, r, msg)
}

func SearchItems(w http.ResponseWriter, r *http.Request, msg string) {
    var availableItems []Item
    var timeFrom time.Time = time.Now()
    var timeTo time.Time = time.Now()
    var err error

    if r.FormValue("start_time") != "" && r.FormValue("end_time") != "" {
      // parse the dates from the request
      //timeFrom, err := time.Parse("2006-01-02T00:00", r.FormValue("start_time"))
      timeFrom, err = time.Parse("2006-01-02T15:04", r.FormValue("start_time"))
      if err != nil {
          http.Error(w, "Invalid start_time parameter", http.StatusBadRequest)
          return
      }
      timeTo, err = time.Parse("2006-01-02T15:04", r.FormValue("end_time"))
      if err != nil {
          http.Error(w, "Invalid end_time parameter", http.StatusBadRequest)
          return
      }

      availableItems,err = app.getItems(queryConfigItems{
        available:true,
        startTime:timeFrom,
        endTime:timeTo,
      })

      if err != nil {
        log.Println(err.Error())
        http.Error(w, "DB Error", http.StatusInternalServerError)
        return
      }
    }

    // render the search results template with the available items list
    err = app.templates.ExecuteTemplate(w, "search.html", struct {
        AvailableItems []Item
        StartTime time.Time
        EndTime time.Time
				Msg string
    }{
        AvailableItems: availableItems,
        StartTime: timeFrom,
        EndTime: timeTo,
				Msg: msg,
    })
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
}

