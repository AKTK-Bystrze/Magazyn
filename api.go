package main

import (
  "net/http"
  "time"
  "log"
  "strconv"
)

const OUT_TIME_FMT = "2006-01-02 15:04:05"

func checkAvailability(start time.Time, end time.Time, chairID int) (bool, error) {
	// check if the requested reservation period is outside of any existing reservation
	query := `SELECT count(*) FROM reservations WHERE chair_id=? AND end_time > ? AND start_time < ? AND status != 'denied'`
	row := app.db.QueryRow(query, chairID, start.Format(OUT_TIME_FMT), end.Format(OUT_TIME_FMT))
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

func ReserveChair(w http.ResponseWriter, r *http.Request) {
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
	chairID, err := strconv.Atoi(r.FormValue("chair_id"))
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
		msg := "Start time must be in future"
    SearchChairs(w, r, msg)
    return
	}

	// check if end time is after start time
	if endTime.Before(startTime) {
		msg := "End time must be after start time"
    SearchChairs(w, r, msg)
		return
	}

	// check if chair is available for the given time period
	ret, err := checkAvailability(startTime, endTime, chairID)
	if err != nil || !ret {
		msg := "Chair is not available for the selected time period"
    SearchChairs(w, r, msg)
		return
	}

	// get user ID from session
	userID := session.Values["user_id"].(int)

	stmt, err := app.db.Prepare("INSERT INTO reservations (chair_id, user_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)")
	if err != nil {
		log.Println(err)
		return
	}
	defer stmt.Close()

	status := "pending"
	_, err = stmt.Exec(chairID, userID, startTime.Format(OUT_TIME_FMT), endTime.Format(OUT_TIME_FMT), status)
	if err != nil {
		log.Println(err)
		return
	}

	msg := "Reservation successful!"
  SearchChairs(w, r, msg)
}

func SearchChairs(w http.ResponseWriter, r *http.Request, msg string) {
    // check if the user is logged in
    session, _ := app.store.Get(r, SESSION_NAME)
    role := session.Values["role"]
    if role == nil {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    // create a list of available chairs
    type item struct {
      Id int
      Name string
      Desc string
    }
    var availableChairs []item
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

      // search for available chairs in the database
      rows, err := app.db.Query(`
          SELECT id, name, description FROM chairs
          WHERE id NOT IN (
              SELECT chair_id
              FROM reservations
              WHERE start_time < ? AND end_time > ? AND status != 'denied'
          )
      `, timeTo.Format(OUT_TIME_FMT), timeFrom.Format(OUT_TIME_FMT))
      if err != nil {
          log.Fatal(err)
      }
      defer rows.Close()

      for rows.Next() {
          var tmp item
          if err := rows.Scan(&tmp.Id, &tmp.Name, &tmp.Desc); err != nil {
              log.Fatal(err)
          }
          availableChairs = append(availableChairs, tmp)
      }
      if err := rows.Err(); err != nil {
          log.Fatal(err)
      }

    }

    // render the search results template with the available chairs list
    err = app.templates.ExecuteTemplate(w, "search.html", struct {
        AvailableChairs []item
        StartTime time.Time
        EndTime time.Time
				Msg string
    }{
        AvailableChairs: availableChairs,
        StartTime: timeFrom,
        EndTime: timeTo,
				Msg: msg,
    })
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
}

