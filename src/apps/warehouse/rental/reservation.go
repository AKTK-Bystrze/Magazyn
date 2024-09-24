package rental

type ReservationViewData struct {
	UpcomingReservations   *[]structs.Reservation
	HistoricalReservations *[]structs.Reservation
	Next24HReservations    *[]structs.Reservation
	templateData
}

func (app AppState) getReservation(id int) (*structs.Reservation, error) {
	query := `SELECT 
		r.r_id, r.r_start_time, r.r_end_time, r.r_status, r.r_created_at,
		i.i_id, i.i_name, i.i_description, i.i_status, i.i_type,
		u.u_id, u.u_username, u.u_email, u.u_credits
	FROM 
		reservations r
	JOIN 
		items i ON r.r_item_id = i.i_id
	JOIN 
		users u ON r.r_user_id = u.u_id
	WHERE 
		r.r_id = ?`
	var location, err = time.LoadLocation("Europe/Warsaw")
	if err != nil {
		return nil, err
	}
	row := app.db.QueryRowx(query, id)
	var r structs.Reservation
	var t tmpReservation
	err = row.StructScan(&t)
	if err != nil {
		app.Err("Can't get reservation id for id %v %v", id, err)
		return nil, err
	}
	//	work around sqlx to better handle embedded structures and JOINs
	r = t.Reservation
	r.Item = t.Item
	r.User = t.User
	//  TODO: update time to localtime (CEST)
	r.StartTime = r.StartTime.In(location)
	r.EndTime = r.EndTime.In(location)
	r.CreatedAt = r.CreatedAt.In(location)
	return &r, nil
}

func (app AppState) getReservations(conf queryConfigReservation) ([]structs.Reservation, error) {
	var location, err = time.LoadLocation("Europe/Warsaw")
	if err != nil {
		app.Err(err.Error())
		return []structs.Reservation{}, err
	}
	// Retrieve all reservations from database
	query := "SELECT r.*, i.i_id, i.i_name, i.i_description "
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
	} else if conf.oneItem {
		query += " WHERE i.i_id = ? "
	}
	if conf.orderByStart {
		query += " ORDER BY r.r_start_time "
	} else {
		query += " ORDER BY r.r_created_at "
	}
	if conf.orderDesc {
		query += " DESC "
	} else {
		query += " ASC "
	}
	//	allow columns without match in structure
	udb := app.db.Unsafe()
	rows, err := udb.Queryx(query, conf.selectionId)

	if err != nil {
		app.Err(err.Error())
		return nil, err
	}
	defer rows.Close()

	var reservations []structs.Reservation
	for rows.Next() {
		var r structs.Reservation
		var t tmpReservation
		err := rows.StructScan(&t)
		if err != nil {
			app.Err(err.Error())
			return nil, err
		}
		//	work around sqlx to better handle embedded structures and JOINs
		r = t.Reservation
		r.Item = t.Item
		r.User = t.User
		//  TODO: update time to localtime (CEST)
		r.StartTime = r.StartTime.In(location)
		r.EndTime = r.EndTime.In(location)
		r.CreatedAt = r.CreatedAt.In(location)
		reservations = append(reservations, r)
	}
	if err = rows.Err(); err != nil {
		app.Err(err.Error())
		return nil, err
	}
	return reservations, nil
}

type queryConfigReservation struct {
	oneUser      bool
	oneItem      bool
	selectionId  int
	users        bool
	orderByStart bool
	orderDesc    bool
}

const (
	DENIED   = "denied"
	RETURNED = "returned"
	APPROVED = "approved"
	PENDING  = "pending"
	RENTED   = "rented"
)

type tmpReservation struct {
	structs.Reservation
	structs.Item
	structs.User
}

type ReservationAudit struct {
	ID         int       `db:"ra_id"`
	R_ID       int       `db:"ra_reservation_id"`
	Status     string    `db:"ra_status"`
	ChangeDate time.Time `db:"ra_change_date"`
	User       User
}

type Reservation struct {
	ID        int64     `db:"r_id"`
	StartTime time.Time `db:"r_start_time"`
	EndTime   time.Time `db:"r_end_time"`
	Status    string    `db:"r_status"`
	CreatedAt time.Time `db:"r_created_at"`
	Item      Item
	User      User
}

func handleReturnedStatus(reservation structs.Reservation, w http.ResponseWriter) error {
	app.Debug("Handling status returned")
	now := time.Now()
	year, month, day := now.Date()
	today := time.Date(year, month, day, 0, 0, 0, 0, now.Location())

	year, month, day = reservation.EndTime.Date()
	reservationEndTime := time.Date(year, month, day, 0, 0, 0, 0, reservation.EndTime.Location())
	if !today.Equal(reservationEndTime) {
		app.Debug("Reservation end time %v is different than today %v. Update reservation", reservationEndTime, today)
		userCredits := reservation.User.Credits
		oldRentalCost, err := CalculateRentalCost(reservation.Item.ID, reservation.StartTime, reservation.EndTime)
		if err != nil {
			app.Err(err.Error())
			http.Error(w, "Can't calculate rental cost", http.StatusInternalServerError)
			return err
		}
		newRentalCost, err := CalculateRentalCost(reservation.Item.ID, reservation.StartTime, now)
		if err != nil {
			app.Err(err.Error())
			http.Error(w, "Can't calculate rental cost", http.StatusInternalServerError)
			return err
		}
		userCredits = userCredits + oldRentalCost - newRentalCost
		err = updateReservationEndDate(reservation, now, w)
		if err != nil {
			return err
		}
		err = updateUserCredits(reservation, userCredits, w)
		if err != nil {
			return err
		}
	}
	return nil
}

type tmpReservationAudit struct {
	structs.ReservationAudit
	structs.User
}

func ReservationHandler(w http.ResponseWriter, r *http.Request) {
	var location, err = time.LoadLocation("Europe/Warsaw")
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "Localization error", http.StatusInternalServerError)
		return
	}
	reservationID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	app.Debug("%v ReservationHandler reservationID %v", utils.GetUserName(r), reservationID)
	// Get the reservation from the database
	var t tmpReservation
	udb := app.db.Unsafe()
	err = udb.Get(&t, "SELECT * FROM reservations r JOIN users u ON r.r_user_id = u.u_id JOIN items i ON r.r_item_id = i.i_id WHERE r_id = ?", reservationID)
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	t.StartTime = t.StartTime.In(location)
	t.EndTime = t.EndTime.In(location)
	t.CreatedAt = t.CreatedAt.In(location)

	// Get the history of changes to the reservation
	var history []structs.ReservationAudit
	rows, err := udb.Queryx("SELECT ra.*,u.u_username FROM reservation_audit ra JOIN users u ON ra.ra_user_id == u.u_id WHERE ra_reservation_id = ? ORDER BY ra_change_date", reservationID)
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	for rows.Next() {
		var audit structs.ReservationAudit
		var t tmpReservationAudit
		err := rows.StructScan(&t)
		if err != nil {
			app.Err("%v %v", utils.GetUserName(r), err.Error())
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
		//	work around sqlx to better handle embedded structures and JOINs
		audit = t.ReservationAudit
		audit.User = t.User
		//  TODO: update timestamps to localtime
		audit.ChangeDate = audit.ChangeDate.In(location)
		history = append(history, audit)
	}
	if err = rows.Err(); err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	// Execute the template
	data := struct {
		Reservation        structs.Reservation
		ReservationHistory []structs.ReservationAudit
		templateData
	}{
		Reservation:        t.Reservation,
		ReservationHistory: history,
	}
	data.Reservation.User = t.User
	data.Reservation.Item = t.Item

	app.renderTemplate(w, r, "admin_reservation.html", &data)
}

func pastFutureReservations(reservations []structs.Reservation) ([]structs.Reservation, []structs.Reservation, []structs.Reservation) {
	// Group reservations into current, upcoming and historical
	var upcomingReservations []structs.Reservation
	var historicalReservations []structs.Reservation
	var currentReservations []structs.Reservation

	now := time.Now()
	now24hlater := time.Now().Add(24 * time.Hour)
	now12hearlier := time.Now().Add(-12 * time.Hour)

	for _, res := range reservations {
		if res.StartTime.After(now24hlater) {
			// Reservation is upcoming
			upcomingReservations = append(upcomingReservations, res)
		} else if res.StartTime.After(now) ||
			res.StartTime.After(now12hearlier) ||
			(res.StartTime.Before(now) && res.EndTime.After(now) ||
				res.Status == structs.RENTED) {
			// Reservation is upcoming
			currentReservations = append(currentReservations, res)
		} else {
			// Reservation is historical
			historicalReservations = append(historicalReservations, res)
		}
	}
	return historicalReservations, currentReservations, upcomingReservations
}

func updateReservationEndDate(reservation structs.Reservation, newEndTime time.Time, w http.ResponseWriter) error {
	result, err := app.db.Exec(`UPDATE reservations SET r_end_time = ?,r_changeby_uid = ? WHERE r_id = ?`, newEndTime.UTC(), reservation.User.ID, reservation.ID)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Can't update reservation ", http.StatusInternalServerError)
		return err
	}
	numRows, err := result.RowsAffected()
	if err != nil || numRows != 1 {
		if err != nil {
			app.Err(err.Error())
		} else {
			app.Err("Failed to update reservation end time %v", err)
		}
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return err
	}
	app.Debug("Successfuly updated reservation end time to %v", newEndTime)
	return nil
}

func SetStatusHandler(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		app.Err("%v Failed to parse set status form %v", utils.GetUserName(r), err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	reservationID := r.FormValue("reservation_id")
	newStatus := r.FormValue("status")
	id, _ := strconv.Atoi(reservationID)
	reservation, err := app.getReservation(id)
	app.Debug("%v setStatusHandler reservation_id %v status %v", utils.GetUserName(r), id, newStatus)
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}
	var oldStatus = reservation.Status
	if oldStatus == structs.DENIED {
		err = handlePreviousStatusDenied(*reservation, w)
		if err != nil {
			return
		}
	}
	if newStatus == structs.DENIED {
		err = handleDeniedStatus(*reservation, w)
		if err != nil {
			return
		}
	}
	if newStatus == structs.RETURNED {
		err = handleReturnedStatus(*reservation, w)
		if err != nil {
			return
		}
	}
	if reservation.EndTime.Before(reservation.StartTime) {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "Reservation end time has to be after the start time", http.StatusBadRequest)
		return
	}
	updateReservationStatus(*reservation, newStatus, w, int(utils.GetUserId(r)))
	app.Debug("%v changed status from %v to %v for reservation %v", utils.GetUserName(r), oldStatus, newStatus, id)
}

func handlePreviousStatusDenied(reservation structs.Reservation, w http.ResponseWriter) error {
	app.Debug("Old reservation status is %v, charge user for rental cost", structs.DENIED)
	rentalCost, err := CalculateRentalCost(reservation.Item.ID, reservation.StartTime, reservation.EndTime)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Can't calculate rental cost", http.StatusBadRequest)
		return err
	}
	updatedCredits := reservation.User.Credits - rentalCost
	err = updateUserCredits(reservation, updatedCredits, w)
	return err
}

func updateReservationStatus(reservation structs.Reservation, status string, w http.ResponseWriter, changingUserId int) {
	result, err := app.db.Exec(`UPDATE reservations SET r_status = ?,r_changeby_uid = ? WHERE r_id = ?`, status, changingUserId, reservation.ID)
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
			app.Err("Failed to update reservation status %v", err)
		}
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	response := fmt.Sprintf("id: %d", reservation.ID)
	w.Write([]byte(response))
}

func handleDeniedStatus(reservation structs.Reservation, w http.ResponseWriter) error {
	app.Debug("handling status denied")
	rentalCost, err := CalculateRentalCost(reservation.Item.ID, reservation.StartTime, reservation.EndTime)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Can't calculate rental cost", http.StatusBadRequest)
		return err
	}
	updatedCredits := reservation.User.Credits + rentalCost
	err = updateUserCredits(reservation, updatedCredits, w)
	return err
}
