package main

import (
  "net/http"
  "time"
  "log"
  "strconv"
)

const OUT_TIME_FMT = "2006-01-02 15:04:05"

func checkAvailability(start time.Time, end time.Time, itemID int) (bool, error) {
	// check if the requested reservation period is outside of any existing reservation
	query := `SELECT count(*) FROM reservations WHERE r_item_id=? AND r_end_time > ? AND r_start_time < ? AND r_status != 'denied'`
	row := app.db.QueryRow(query, itemID, start.Format(OUT_TIME_FMT), end.Format(OUT_TIME_FMT))
	var count int
	err := row.Scan(&count)
	if err != nil {
    log.Println(err)
		return false, err
	}
	if count > 0 {
		return false, nil
	}
	return true, nil
}

func ReserveItem(w http.ResponseWriter, r *http.Request) {
	// get session
	session, err := app.store.Get(r, SESSION_NAME)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// check if user is logged in
	if session.Values["user_id"] == nil {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}

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
	ret, err := checkAvailability(startTime, endTime, itemID)
	if err != nil || !ret {
		msg := "Przedmiot nie jest juz dostepny w tym terminie"
    SearchItems(w, r, msg)
		return
	}

	// get user ID from session
	userID := session.Values["user_id"].(int)

	stmt, err := app.db.Prepare("INSERT INTO reservations (r_item_id, r_user_id, r_start_time, r_end_time, r_status) VALUES (?, ?, ?, ?, ?)")
	if err != nil {
		log.Println(err)
		return
	}
	defer stmt.Close()

	status := "pending"
	_, err = stmt.Exec(itemID, userID, startTime.Format(OUT_TIME_FMT), endTime.Format(OUT_TIME_FMT), status)
	if err != nil {
		log.Println(err)
		return
	}

	msg := "Zarezerwowano"
  SearchItems(w, r, msg)
}

func SearchItems(w http.ResponseWriter, r *http.Request, msg string) {
    // check if the user is logged in
    session, _ := app.store.Get(r, SESSION_NAME)
    role := session.Values["role"]
    if role == nil {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
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

      // search for available items in the database
      rows, err := app.db.Query(`
          SELECT i_id, i_name, i_description FROM items
          WHERE i_id NOT IN (
              SELECT r_item_id
              FROM reservations
              WHERE r_start_time < ? AND r_end_time > ? AND r_status != 'denied'
          ) AND i_status == 'ok'
      `, timeTo.Format(OUT_TIME_FMT), timeFrom.Format(OUT_TIME_FMT))
      if err != nil {
          log.Fatal(err)
      }
      defer rows.Close()

      for rows.Next() {
          var tmp Item
          if err := rows.Scan(&tmp.ID, &tmp.Name, &tmp.Description); err != nil {
              log.Fatal(err)
          }
          availableItems = append(availableItems, tmp)
      }
      if err := rows.Err(); err != nil {
          log.Fatal(err)
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

