package main

import (
    "net/http"
		"time"
    "strconv"
)

func (app AppState) adminCheck(w http.ResponseWriter, r *http.Request) (bool) {
	// Check if user is authenticated as admin
	session, _ := app.store.Get(r, SESSION_NAME)
  if session.Values["role"] == "admin" {
    return true
  }
  http.Redirect(w, r, "/", http.StatusFound)
  return false
}

func adminDashboardHandler(w http.ResponseWriter, r *http.Request) {
	reservations, err := app.getReservations(queryConfigReservation{users:true})
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	err = app.templates.ExecuteTemplate(w, "admin_dashboard.html", struct {
		Reservations []Reservation
	}{
		reservations,
	})
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Template error", http.StatusInternalServerError)
	}
}

func setStatusHandler(w http.ResponseWriter, r *http.Request) {
	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	reservationID := r.FormValue("reservation_id")
	status := r.FormValue("status")
	
	
	//	TODO: check if reservation date is in the future !!!
	session, _ := app.store.Get(r, SESSION_NAME)

	// Update reservation status in database
	result, err := app.db.Exec(`UPDATE reservations SET r_status = ?,r_changeby_uid = ? WHERE r_id = ?`, status, session.Values["user_id"], reservationID)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	numRows, err := result.RowsAffected()
	if err != nil || numRows != 1 {
		if err != nil {
			app.Err(err.Error())
		} else {
			app.Err("Failed to update reservation status")
		}
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	// Redirect to admin dashboard
	http.Redirect(w, r, "/admin/reservations", http.StatusSeeOther)
}

func adminItemsHandler(w http.ResponseWriter, r *http.Request) {
  items,err := app.getItems(queryConfigItems{withCurReservation: true})
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

  if err := app.templates.ExecuteTemplate(w, "admin_items.html", struct {Items[] tmpItem}{Items: items}); err != nil {
		app.Err(err.Error())
    http.Error(w, "Error executing template", http.StatusInternalServerError)
    return
  }
}

func adminItemStatusHandler(w http.ResponseWriter, r *http.Request) {
  // check if it's a POST request
  if r.Method != http.MethodPost {
    http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
    return
  }

  // parse form values
  err := r.ParseForm()
  if err != nil {
    http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
    return
  }

  // get the item ID and status from form values
  itemID, err := strconv.Atoi(r.FormValue("id"))
  if err != nil {
    http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
    return
  }

  status := r.FormValue("status")

  // update item status in the database
  stmt, err := app.db.Prepare("UPDATE items SET i_status = ? WHERE i_id = ?")
  if err != nil {
		app.Err(err.Error())
    http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
    return
  }

  _, err = stmt.Exec(status, itemID)
  if err != nil {
		app.Err(err.Error())
    http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
    return
  }

  // redirect to the admin items page
  http.Redirect(w, r, "/admin/items", http.StatusSeeOther)
}

func pastFutureReservations(reservations []Reservation) ([]Reservation,[]Reservation,[]Reservation) {
	// Group reservations into upcoming and historical
	var upcomingReservations []Reservation
	var historicalReservations []Reservation
	var currentReservations []Reservation

	now := time.Now()
	now24hlater := time.Now().Add(24 * time.Hour)
	now12hearlier := time.Now().Add(-12 * time.Hour)

  for _, res := range reservations {
		if res.StartTime.After(now24hlater) {
			// Reservation is upcoming
			upcomingReservations = append(upcomingReservations, res)
		} else if res.StartTime.After(now) || 
							res.StartTime.After(now12hearlier) || 
							(res.StartTime.Before(now) && res.EndTime.After(now)) {
			// Reservation is upcoming
			currentReservations = append(currentReservations, res)
		} else {
			// Reservation is historical
			historicalReservations = append(historicalReservations, res)
		}
	}
  return historicalReservations,currentReservations,upcomingReservations
}

func AdminShowUserHandler(w http.ResponseWriter, r *http.Request) {
	// Get user ID from query string
	userID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	reservations,err := app.getReservations(queryConfigReservation{
    oneUser:true,
    selectionId:userID,
    orderByStart:true,
  })
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

  historicalReservations, next24HReservations, upcomingReservations := pastFutureReservations(reservations)

	uname,err := app.getUsername(userID)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	// Render user reservations page
	err = app.templates.ExecuteTemplate(w, "admin_user.html", map[string]interface{}{
		"UpcomingReservations": upcomingReservations,
		"HistoricalReservations":  historicalReservations,
		"Next24HReservations": next24HReservations,
		"Username": uname,
	})
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Template Error", http.StatusInternalServerError)
		return
	}
}

type tmpReservationAudit struct {
	ReservationAudit
	User
}

func reservationHandler(w http.ResponseWriter, r *http.Request) {
	reservationID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		app.Err(err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	// Get the reservation from the database
	var t tmpReservation
	udb := app.db.Unsafe()
	err = udb.Get(&t, "SELECT * FROM reservations r JOIN users u ON r.r_user_id = u.u_id JOIN items i ON r.r_item_id = i.i_id WHERE r_id = ?", reservationID)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	// Get the history of changes to the reservation
	var history []ReservationAudit
	rows, err := udb.Queryx("SELECT ra.*,u.u_username FROM reservation_audit ra JOIN users u ON ra.ra_user_id == u.u_id WHERE ra_reservation_id = ? ORDER BY ra_change_date", reservationID)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	for rows.Next() {
		var r ReservationAudit
		var t tmpReservationAudit
		err := rows.StructScan(&t)
		if err != nil {
			app.Err(err.Error())
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
		//	work around sqlx to better handle embedded structures and JOINs
		r = t.ReservationAudit
		r.User = t.User
		history = append(history, r)
	}
	if err = rows.Err(); err != nil {
		app.Err(err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	// Execute the template
	data := struct {
		Reservation      Reservation
		ReservationHistory []ReservationAudit
	}{
		Reservation:      t.Reservation,
		ReservationHistory: history,
	}
	data.Reservation.User = t.User
	data.Reservation.Item = t.Item
	err = app.templates.ExecuteTemplate(w, "admin_reservation.html", data)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
}

func AdminShowItemHandler(w http.ResponseWriter, r *http.Request) {
	// Get user ID from query string
	itemID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	reservations,err := app.getReservations(queryConfigReservation{
    oneItem:true,
    selectionId:itemID,
    orderByStart:true,
		users:true,
  })
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

  historicalReservations, next24HReservations, upcomingReservations := pastFutureReservations(reservations)

	item,err := app.getItem(itemID)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	// Render item reservations page
	err = app.templates.ExecuteTemplate(w, "admin_item.html", map[string]interface{}{
		"UpcomingReservations": upcomingReservations,
		"HistoricalReservations":  historicalReservations,
		"Next24HReservations": next24HReservations,
		"Item": item,
	})
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Template Error", http.StatusInternalServerError)
		return
	}
}

