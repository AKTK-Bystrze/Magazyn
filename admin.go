package main

import (
    "net/http"
		"time"
		"log"
    "strconv"
)

type tmpReservation struct {
	Reservation
	Item
	User
}

type queryConfigReservation struct {
	oneUser bool
	userId int
	users	bool
	orderDesc	bool
}

func (app AppState) getReservations(conf queryConfigReservation) ([]Reservation,error) {
	// Retrieve all reservations from database
	query := "SELECT r.*, i.i_name, i.i_description "
	if conf.users {
		query += ", u.u_username, u.u_id"
	}
	query += " FROM reservations r "
	if conf.users {
		query += " JOIN users u ON r.r_user_id = u.u_id "
	}
	query += " JOIN items i ON r.r_item_id = i.i_id "
	if conf.oneUser {
		query += " WHERE r.r_user_id = ? "
	}
	query += " ORDER BY r.r_created_at "
	if conf.orderDesc {
		query += " DESC "
	} else {
		query += " ASC "
	}
	//	allow columns without match in structure
	udb := app.db.Unsafe()
	rows, err := udb.Queryx(query, conf.userId)

	if err != nil {
		return nil,err
	}
	defer rows.Close()

	var reservations []Reservation
	for rows.Next() {
		var r Reservation
		var t tmpReservation
		err := rows.StructScan(&t)
		if err != nil {
			return nil,err
		}
		//	work around sqlx to better handle embedded structures and JOINs
		r = t.Reservation
		r.Item = t.Item
		r.User = t.User
		reservations = append(reservations, r)
	}
	if err = rows.Err(); err != nil {
		return nil,err
	}
	return reservations,nil
}

func adminDashboardHandler(w http.ResponseWriter, r *http.Request) {
	// Check if user is authenticated as admin
	session, _ := app.store.Get(r, SESSION_NAME)
  if session.Values["role"] != "admin" {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

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
	// Get session
	session, _ := app.store.Get(r, SESSION_NAME)
	// Check if user is authenticated and has admin role
	if session.Values["role"] != "admin" {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

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
  session, _ := app.store.Get(r, SESSION_NAME)

  if session.Values["role"] != "admin" {
    http.Redirect(w, r, "/login", http.StatusSeeOther)
    return
  }

  // Get all items from the database
  rows, err := app.db.Query("SELECT i_id, i_name, i_description, i_status FROM items")
  if err != nil {
    log.Println(err)
    http.Error(w, "Error querying items", http.StatusInternalServerError)
    return
  }
  defer rows.Close()

  // Store items in a slice
  items := make([]Item, 0)
  for rows.Next() {
    var item Item
    if err := rows.Scan(&item.ID, &item.Name, &item.Description, &item.Status); err != nil {
      http.Error(w, "Error scanning items", http.StatusInternalServerError)
      return
    }
    items = append(items, item)
  }
  if err := rows.Err(); err != nil {
    http.Error(w, "Error iterating items", http.StatusInternalServerError)
    return
  }

  if err := app.templates.ExecuteTemplate(w, "admin_items.html", struct {Items[] Item}{Items: items}); err != nil {
    http.Error(w, "Error executing template", http.StatusInternalServerError)
    return
  }
}

func adminItemStatusHandler(w http.ResponseWriter, r *http.Request) {
  session, _ := app.store.Get(r, SESSION_NAME)

  // check if the user is logged in and is an admin
  if session.Values["role"] != "admin" {
    http.Redirect(w, r, "/", http.StatusSeeOther)
    return
  }

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
  stmt, err := app.db.Prepare("UPDATE items SET status = ? WHERE id = ?")
  if err != nil {
    http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
    return
  }

  _, err = stmt.Exec(status, itemID)
  if err != nil {
    http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
    return
  }

  // redirect to the admin items page
  http.Redirect(w, r, "/admin/items", http.StatusSeeOther)
}

func AdminShowUserHandler(w http.ResponseWriter, r *http.Request) {
	// Check if user is authenticated and an admin
	session, err := app.store.Get(r, SESSION_NAME)

	if session.Values["role"] != "admin" {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// Get user ID from query string
	userID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Query database for user reservations
	rows, err := app.db.Query(`
	SELECT r.r_id, i.i_name, r.r_start_time, r.r_end_time, r.r_status, r.r_created_at
	FROM reservations r
	INNER JOIN items i ON i.i_id = r.r_item_id
	WHERE r.r_user_id = ?
	ORDER BY r.r_start_time
	`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Group reservations into upcoming and historical
	var upcomingReservations []Reservation
	var historicalReservations []Reservation

	now := time.Now()

	for rows.Next() {
		var res Reservation
		err = rows.Scan(&res.ID, &res.Item.Name, &res.StartTime, &res.EndTime, &res.Status, &res.CreatedAt)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if res.StartTime.After(now) {
			// Reservation is upcoming
			upcomingReservations = append(upcomingReservations, res)
		} else {
			// Reservation is historical
			historicalReservations = append(historicalReservations, res)
		}
	}

	if rows.Err() != nil {
		http.Error(w, rows.Err().Error(), http.StatusInternalServerError)
		return
	}

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
