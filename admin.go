package main

import (
    "net/http"
		"time"
		"log"
    "strconv"
)

func adminDashboardHandler(w http.ResponseWriter, r *http.Request) {
	// Check if user is authenticated as admin
	session, _ := app.store.Get(r, SESSION_NAME)
  if session.Values["role"] != "admin" {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	// Retrieve all reservations from database
	rows, err := app.db.Query(`
	SELECT r.id, r.start_time, r.end_time, u.username, r.status, c.name
	FROM reservations r
	JOIN users u ON r.user_id = u.id
	JOIN items c ON r.item_id = c.id
	ORDER BY r.start_time ASC`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var reservations []Reservation
	for rows.Next() {
		var r Reservation
		err := rows.Scan(&r.ID, &r.StartTime, &r.EndTime, &r.Username, &r.Status, &r.Name)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		reservations = append(reservations, r)
		log.Println(r)
	}
	if err = rows.Err(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	app.templates.ExecuteTemplate(w, "admin_dashboard.html", struct {
		Reservations []Reservation
	}{
		reservations,
	})
}

// Reservation represents a reservation in the database
type Reservation struct {
		Name			string
    ID        int
    StartTime time.Time
    EndTime   time.Time
    Username  string
    Status    string
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
	result, err := app.db.Exec(`UPDATE reservations SET status = ? WHERE id = ?`, status, reservationID)
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
  rows, err := app.db.Query("SELECT id, name, description, status FROM items")
  if err != nil {
    log.Println(err)
    http.Error(w, "Error querying items", http.StatusInternalServerError)
    return
  }
  defer rows.Close()

  type Item struct {
    ID          int
    Name        string
    Description string
    Status      string
  }

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
