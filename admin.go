package main

import (
    "net/http"
		"time"
		"log"
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
		log.Println(err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	app.templates.ExecuteTemplate(w, "admin_dashboard.html", struct {
		Reservations []Reservation
	}{
		reservations,
	})
}

func setStatusHandler(w http.ResponseWriter, r *http.Request) {
	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	reservationID := r.FormValue("reservation_id")
	status := r.FormValue("status")

	// Update reservation status in database
	result, err := app.db.Exec(`UPDATE reservations SET r_status = ? WHERE r_id = ?`, status, reservationID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	numRows, err := result.RowsAffected()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if numRows != 1 {
		http.Error(w, "Failed to update reservation status", http.StatusInternalServerError)
		return
	}

	// Redirect to admin dashboard
	http.Redirect(w, r, "/admin/reservations", http.StatusSeeOther)
}

func adminItemsHandler(w http.ResponseWriter, r *http.Request) {
  items,err := app.getItems(queryConfigItems{})
	if err != nil {
		log.Println(err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

  if err := app.templates.ExecuteTemplate(w, "admin_items.html", struct {Items[] Item}{Items: items}); err != nil {
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
		log.Println(err.Error())
    http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
    return
  }

  _, err = stmt.Exec(status, itemID)
  if err != nil {
		log.Println(err.Error())
    http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
    return
  }

  // redirect to the admin items page
  http.Redirect(w, r, "/admin/items", http.StatusSeeOther)
}

func pastFutureReservations(reservations []Reservation) ([]Reservation,[]Reservation) {
	// Group reservations into upcoming and historical
	var upcomingReservations []Reservation
	var historicalReservations []Reservation

	now := time.Now()

  for _, res := range reservations {
		if res.StartTime.After(now) {
			// Reservation is upcoming
			upcomingReservations = append(upcomingReservations, res)
		} else {
			// Reservation is historical
			historicalReservations = append(historicalReservations, res)
		}
	}
  return upcomingReservations,historicalReservations
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
    userId:userID,
    orderByStart:true,
  })
	if err != nil {
		log.Println(err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

  upcomingReservations, historicalReservations := pastFutureReservations(reservations)

	// Render user reservations page
	err = app.templates.ExecuteTemplate(w, "admin_user.html", map[string]interface{}{
		"UpcomingReservations": upcomingReservations,
		"HistoricalReservations":  historicalReservations,
		"Highlight24h": time.Now().Add(24 * time.Hour),
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
