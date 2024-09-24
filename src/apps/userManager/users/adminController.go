package users

func AdminDashboardHandler(w http.ResponseWriter, r *http.Request) {
	reservations, err := app.getReservations(queryConfigReservation{users: true})
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	app.renderTemplate(w, r, "admin_dashboard.html", &struct {
		Reservations []structs.Reservation
		templateData
	}{
		Reservations: reservations,
	})
}

func AdminItemsHandler(w http.ResponseWriter, r *http.Request) {
	items, err := app.getItems(queryConfigItems{withCurReservation: true})
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	app.renderTemplate(w, r, "admin_items.html", &struct {
		Items []tmpItem
		templateData
	}{
		Items: items,
	})
}

func AdminItemStatusHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		app.Err("%v Form parsing error %v", utils.GetUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	itemID, err := strconv.Atoi(r.FormValue("id"))
	if err != nil {
		app.Err("%v Can't get id from form %v", utils.GetUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	status := r.FormValue("status")

	stmt, err := app.db.Prepare("UPDATE items SET i_status = ? WHERE i_id = ?")
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	_, err = stmt.Exec(status, itemID)
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	app.Debug("%v set itemid %v status %v", utils.GetUserName(r), itemID, status)
	http.Redirect(w, r, "/admin/items", http.StatusSeeOther)
}

func AdminShowUserHandler(w http.ResponseWriter, r *http.Request) {
	// Get user ID from query string
	userID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	reservations, err := app.getReservations(queryConfigReservation{
		oneUser:      true,
		selectionId:  userID,
		orderByStart: true,
	})
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	historicalReservations, next24HReservations, upcomingReservations := pastFutureReservations(reservations)

	uname, err := app.GetUserName(userID)
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	// Render user reservations page
	app.renderTemplate(w, r, "admin_user.html", &struct {
		ReservationViewData
		Username string
	}{
		ReservationViewData{
			UpcomingReservations:   &upcomingReservations,
			HistoricalReservations: &historicalReservations,
			Next24HReservations:    &next24HReservations,
		},
		uname,
	})
}

func AdminShowItemHandler(w http.ResponseWriter, r *http.Request) {
	// Get user ID from query string
	itemID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	reservations, err := app.getReservations(queryConfigReservation{
		oneItem:      true,
		selectionId:  itemID,
		orderByStart: true,
		users:        true,
	})
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	historicalReservations, next24HReservations, upcomingReservations := pastFutureReservations(reservations)

	item, err := app.getItem(itemID)
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	// Render item reservations page
	app.renderTemplate(w, r, "admin_item.html", &struct {
		ReservationViewData
		Item *structs.Item
	}{
		ReservationViewData{
			UpcomingReservations:   &upcomingReservations,
			HistoricalReservations: &historicalReservations,
			Next24HReservations:    &next24HReservations,
		},
		item,
	})
}
