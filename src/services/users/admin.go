package users

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

func (app AppState) hasAdminPrivilege(w http.ResponseWriter, r *http.Request) bool {
	uinfo, ok := r.Context().Value("UserInfo").(tmpUser)
	if !ok || !strings.Contains(uinfo.Role, "admin") {
		app.Err("Non-admin user (%s) attempts to access admin API", If(ok, uinfo.Name, "unknown"))
		http.Redirect(w, r, "/", http.StatusFound)
		return false
	}
	return true
}

func adminDashboardHandler(w http.ResponseWriter, r *http.Request) {
	reservations, err := app.getReservations(queryConfigReservation{users: true})
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	app.renderTemplate(w, r, "admin_dashboard.html", &struct {
		Reservations []Reservation
		templateData
	}{
		Reservations: reservations,
	})
}

func setStatusHandler(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		app.Err("%v Failed to parse set status form %v", getUserName(r), err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	reservationID := r.FormValue("reservation_id")
	newStatus := r.FormValue("status")
	id, _ := strconv.Atoi(reservationID)
	reservation, err := app.getReservation(id)
	app.Debug("%v setStatusHandler reservation_id %v status %v", getUserName(r), id, newStatus)
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}
	var oldStatus = reservation.Status
	if oldStatus == DENIED {
		err = handlePreviousStatusDenied(*reservation, w)
		if err != nil {
			return
		}
	}
	if newStatus == DENIED {
		err = handleDeniedStatus(*reservation, w)
		if err != nil {
			return
		}
	}
	if newStatus == RETURNED {
		err = handleReturnedStatus(*reservation, w)
		if err != nil {
			return
		}
	}
	if reservation.EndTime.Before(reservation.StartTime) {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "Reservation end time has to be after the start time", http.StatusBadRequest)
		return
	}
	updateReservationStatus(*reservation, newStatus, w, int(getUserId(r)))
	app.Debug("%v changed status from %v to %v for reservation %v", getUserName(r), oldStatus, newStatus, id)
}

func handlePreviousStatusDenied(reservation Reservation, w http.ResponseWriter) error {
	app.Debug("Old reservation status is %v, charge user for rental cost", DENIED)
	rentalCost, err := calculateRentalCost(reservation.Item.ID, reservation.StartTime, reservation.EndTime)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Can't calculate rental cost", http.StatusBadRequest)
		return err
	}
	updatedCredits := reservation.User.Credits - rentalCost
	err = updateUserCredits(reservation, updatedCredits, w)
	return err
}

func updateReservationStatus(reservation Reservation, status string, w http.ResponseWriter, changingUserId int) {
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

func handleDeniedStatus(reservation Reservation, w http.ResponseWriter) error {
	app.Debug("handling status denied")
	rentalCost, err := calculateRentalCost(reservation.Item.ID, reservation.StartTime, reservation.EndTime)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Can't calculate rental cost", http.StatusBadRequest)
		return err
	}
	updatedCredits := reservation.User.Credits + rentalCost
	err = updateUserCredits(reservation, updatedCredits, w)
	return err
}

func updateUserCredits(reservation Reservation, newCredits int, w http.ResponseWriter) error {
	u := reservation.User
	var oldCredits = u.Credits
	result, err := app.db.Exec(`UPDATE users SET u_credits = ? WHERE u_id = ?`, newCredits, u.ID)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Cant update users credits", http.StatusBadRequest)
		return err
	}
	numRows, err := result.RowsAffected()
	if err != nil || numRows != 1 {
		if err != nil {
			app.Err(err.Error())
		} else {
			app.Err("Failed to update user credits %v", err)
		}
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return err
	}
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return err
	}
	app.Info("%v Updated user (id: %v) credits from %v to %v", u.Name, u.ID, oldCredits, newCredits)
	return nil
}

func handleReturnedStatus(reservation Reservation, w http.ResponseWriter) error {
	app.Debug("Handling status returned")
	now := time.Now()
	year, month, day := now.Date()
	today := time.Date(year, month, day, 0, 0, 0, 0, now.Location())

	year, month, day = reservation.EndTime.Date()
	reservationEndTime := time.Date(year, month, day, 0, 0, 0, 0, reservation.EndTime.Location())
	if !today.Equal(reservationEndTime) {
		app.Debug("Reservation end time %v is different than today %v. Update reservation", reservationEndTime, today)
		userCredits := reservation.User.Credits
		oldRentalCost, err := calculateRentalCost(reservation.Item.ID, reservation.StartTime, reservation.EndTime)
		if err != nil {
			app.Err(err.Error())
			http.Error(w, "Can't calculate rental cost", http.StatusInternalServerError)
			return err
		}
		newRentalCost, err := calculateRentalCost(reservation.Item.ID, reservation.StartTime, now)
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

func updateReservationEndDate(reservation Reservation, newEndTime time.Time, w http.ResponseWriter) error {
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

func adminItemsHandler(w http.ResponseWriter, r *http.Request) {
	items, err := app.getItems(queryConfigItems{withCurReservation: true})
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
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

func adminItemStatusHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		app.Err("%v Form parsing error %v", getUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	itemID, err := strconv.Atoi(r.FormValue("id"))
	if err != nil {
		app.Err("%v Can't get id from form %v", getUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	status := r.FormValue("status")

	stmt, err := app.db.Prepare("UPDATE items SET i_status = ? WHERE i_id = ?")
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	_, err = stmt.Exec(status, itemID)
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	app.Debug("%v set itemid %v status %v", getUserName(r), itemID, status)
	http.Redirect(w, r, "/admin/items", http.StatusSeeOther)
}

func pastFutureReservations(reservations []Reservation) ([]Reservation, []Reservation, []Reservation) {
	// Group reservations into current, upcoming and historical
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
			(res.StartTime.Before(now) && res.EndTime.After(now) ||
				res.Status == RENTED) {
			// Reservation is upcoming
			currentReservations = append(currentReservations, res)
		} else {
			// Reservation is historical
			historicalReservations = append(historicalReservations, res)
		}
	}
	return historicalReservations, currentReservations, upcomingReservations
}

type ReservationViewData struct {
	UpcomingReservations   *[]Reservation
	HistoricalReservations *[]Reservation
	Next24HReservations    *[]Reservation
	templateData
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
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	historicalReservations, next24HReservations, upcomingReservations := pastFutureReservations(reservations)

	uname, err := app.getUsername(userID)
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
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

type tmpReservationAudit struct {
	ReservationAudit
	User
}

func reservationHandler(w http.ResponseWriter, r *http.Request) {
	var location, err = time.LoadLocation("Europe/Warsaw")
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "Localization error", http.StatusInternalServerError)
		return
	}
	reservationID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	app.Debug("%v ReservationHandler reservationID %v", getUserName(r), reservationID)
	// Get the reservation from the database
	var t tmpReservation
	udb := app.db.Unsafe()
	err = udb.Get(&t, "SELECT * FROM reservations r JOIN users u ON r.r_user_id = u.u_id JOIN items i ON r.r_item_id = i.i_id WHERE r_id = ?", reservationID)
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	t.StartTime = t.StartTime.In(location)
	t.EndTime = t.EndTime.In(location)
	t.CreatedAt = t.CreatedAt.In(location)

	// Get the history of changes to the reservation
	var history []ReservationAudit
	rows, err := udb.Queryx("SELECT ra.*,u.u_username FROM reservation_audit ra JOIN users u ON ra.ra_user_id == u.u_id WHERE ra_reservation_id = ? ORDER BY ra_change_date", reservationID)
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	for rows.Next() {
		var audit ReservationAudit
		var t tmpReservationAudit
		err := rows.StructScan(&t)
		if err != nil {
			app.Err("%v %v", getUserName(r), err.Error())
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
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	// Execute the template
	data := struct {
		Reservation        Reservation
		ReservationHistory []ReservationAudit
		templateData
	}{
		Reservation:        t.Reservation,
		ReservationHistory: history,
	}
	data.Reservation.User = t.User
	data.Reservation.Item = t.Item

	app.renderTemplate(w, r, "admin_reservation.html", &data)
}

func AdminShowItemHandler(w http.ResponseWriter, r *http.Request) {
	// Get user ID from query string
	itemID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
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
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	historicalReservations, next24HReservations, upcomingReservations := pastFutureReservations(reservations)

	item, err := app.getItem(itemID)
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	// Render item reservations page
	app.renderTemplate(w, r, "admin_item.html", &struct {
		ReservationViewData
		Item *Item
	}{
		ReservationViewData{
			UpcomingReservations:   &upcomingReservations,
			HistoricalReservations: &historicalReservations,
			Next24HReservations:    &next24HReservations,
		},
		item,
	})
}

func dbBackupHandler(w http.ResponseWriter, r *http.Request) {
	dbPath := DATABASE_PATH
	file, err := os.Open(dbPath)
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", "attachment; filename="+time.Now().UTC().Format(OUT_TIME_FMT)+DATABASE_NAME)

	_, err = io.Copy(w, file)
	if err != nil {
		app.Err("%v Error copying file %v", getUserName(r), err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusNotFound)
		return
	}

}

func inventory(w http.ResponseWriter, r *http.Request) {
	itemsWithReservations, err := app.getItems(queryConfigItems{withCurReservation: false})
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	var items []Item
	for _, record := range itemsWithReservations {
		items = append(items, record.Item)
	}
	json, err := json.Marshal(items)
	if err != nil {
		app.Err("%v Error parsing items to json %v", getUserName(r), err)
		return
	}
	app.renderTemplate(w, r, "inventory.html", &struct {
		Json string
		templateData
	}{
		Json: string(json),
	})
}
