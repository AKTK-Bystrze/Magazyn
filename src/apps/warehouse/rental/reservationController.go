package rental

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/warehouse/appState"
	"bystrze/apps/userManager/credits"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

func ReservationHandler(w http.ResponseWriter, r *http.Request) {
	var location, err = time.LoadLocation("Europe/Warsaw")
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "Localization error", http.StatusInternalServerError)
		return
	}
	reservationID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	appState.App.Debug("%v ReservationHandler reservationID %v", session.GetSessionUserName(r), reservationID)
	// Get the reservation from the database
	var t models.TmpReservation
	udb := appState.App.Db.Unsafe()
	err = udb.Get(&t, "SELECT * FROM reservations r JOIN users u ON r.r_user_id = u.u_id JOIN items i ON r.r_item_id = i.i_id WHERE r_id = ?", reservationID)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	t.StartTime = t.StartTime.In(location)
	t.EndTime = t.EndTime.In(location)
	t.CreatedAt = t.CreatedAt.In(location)

	// Get the history of changes to the reservation
	var history []models.ReservationAudit
	rows, err := udb.Queryx("SELECT ra.*,u.u_username FROM reservation_audit ra JOIN users u ON ra.ra_user_id == u.u_id WHERE ra_reservation_id = ? ORDER BY ra_change_date", reservationID)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	for rows.Next() {
		var audit models.ReservationAudit
		var t models.TmpReservationAudit
		err := rows.StructScan(&t)
		if err != nil {
			appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
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
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	// Execute the template
	data := struct {
		Reservation        models.Reservation
		ReservationHistory []models.ReservationAudit
		apps.TemplateData
	}{
		Reservation:        t.Reservation,
		ReservationHistory: history,
	}
	data.Reservation.User = t.User
	data.Reservation.Item = t.Item

	appState.App.RenderTemplate(w, r, "admin_reservation.html", &data)
}

func SetStatusHandler(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		appState.App.Err("%v Failed to parse set status form %v", session.GetSessionUserName(r), err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	reservationID := r.FormValue("reservation_id")
	newStatus := r.FormValue("status")
	id, _ := strconv.Atoi(reservationID)
	reservation, err := GetReservation(id)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}
	appState.App.Debug("%v setStatusHandler reservation_id %v status %v", session.GetSessionUserName(r), id, newStatus)
	var oldStatus = reservation.Status
	if oldStatus == models.DENIED {
		err = handlePreviousStatusDenied(*reservation, w)
		if err != nil {
			return
		}
	}
	if newStatus == models.DENIED {
		err = handleDeniedStatus(*reservation, w)
		if err != nil {
			return
		}
	}
	if newStatus == models.RETURNED {
		err = handleReturnedStatus(*reservation, w)
		if err != nil {
			return
		}
	}
	if newStatus == models.RENTED {
		err = handleRentedStatus(*reservation, w)
		if err != nil {
			return
		}
	}
	if reservation.EndTime.Before(reservation.StartTime) {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "Reservation end time has to be after the start time", http.StatusBadRequest)
		return
	}
	updateReservationStatus(*reservation, newStatus, w, int(session.GetSessionUserId(r)))
	appState.App.Debug("%v changed status from %v to %v for reservation %v", session.GetSessionUserName(r), oldStatus, newStatus, id)
}

func handleRentedStatus(reservation models.Reservation, w http.ResponseWriter) error {
	appState.App.Debug("Handling status rented")
	now := time.Now()
	year, month, day := now.Date()
	today := time.Date(year, month, day, 0, 0, 0, 0, now.Location())

	year, month, day = reservation.StartTime.Date()
	reservationStartTime := time.Date(year, month, day, 0, 0, 0, 0, reservation.StartTime.Location())
	if !today.Equal(reservationStartTime) {
		appState.App.Debug("Reservation start time %v is different than today %v. Update reservation", reservationStartTime, today)
		userCredits := reservation.User.Credits
		oldRentalCost, err := credits.CalculateRentalCost(reservation.Item, reservation.StartTime, reservation.EndTime)
		if err != nil {
			appState.App.Err("handleRentedStatus %v", err.Error())
			http.Error(w, "Can't calculate rental cost", http.StatusInternalServerError)
			return err
		}
		newRentalCost, err := credits.CalculateRentalCost(reservation.Item, now, reservation.EndTime)
		if err != nil {
			appState.App.Err("handleRentedStatus %v", err.Error())
			http.Error(w, "Can't calculate rental cost", http.StatusInternalServerError)
			return err
		}
		userCredits = userCredits + oldRentalCost - newRentalCost
		err = updateReservationsDate(reservation, "r_start_time", now, w)
		if err != nil {
			return err
		}
		err = credits.UpdateUserCredits(reservation, userCredits, w)
		if err != nil {
			return err
		}
	}
	return nil
}

func handleReturnedStatus(reservation models.Reservation, w http.ResponseWriter) error {
	appState.App.Debug("Handling status returned")
	now := time.Now()
	year, month, day := now.Date()
	today := time.Date(year, month, day, 0, 0, 0, 0, now.Location())

	year, month, day = reservation.EndTime.Date()
	reservationEndTime := time.Date(year, month, day, 0, 0, 0, 0, reservation.EndTime.Location())
	if !today.Equal(reservationEndTime) {
		appState.App.Debug("Reservation end time %v is different than today %v. Update reservation", reservationEndTime, today)
		userCredits := reservation.User.Credits
		oldRentalCost, err := credits.CalculateRentalCost(reservation.Item, reservation.StartTime, reservation.EndTime)
		if err != nil {
			appState.App.Err("handleReturnedStatus %v", err.Error())
			http.Error(w, "Can't calculate rental cost", http.StatusInternalServerError)
			return err
		}
		newRentalCost, err := credits.CalculateRentalCost(reservation.Item, reservation.StartTime, now)
		if err != nil {
			appState.App.Err("handleReturnedStatus %v", err.Error())
			http.Error(w, "Can't calculate rental cost", http.StatusInternalServerError)
			return err
		}
		userCredits = userCredits + oldRentalCost - newRentalCost
		err = updateReservationsDate(reservation, "r_end_time", now, w)
		if err != nil {
			return err
		}
		err = credits.UpdateUserCredits(reservation, userCredits, w)
		if err != nil {
			return err
		}
	}
	return nil
}

func updateReservationsDate(reservation models.Reservation, field string, newTime time.Time, w http.ResponseWriter) error {
	if field != "r_end_time" && field != "r_start_time" {
		appState.App.Err("Wrong parameter used in method updateReservationsDate %v", field)
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return fmt.Errorf("wrong parameter used in method updateReservationsDate")
	}
	newTimeFormated := newTime.Format("2006-01-02 15:04:05")
	query := fmt.Sprintf(`UPDATE reservations SET %v = ?,r_changeby_uid = ? WHERE r_id = ?`, field)
	result, err := appState.App.Db.Exec(query, newTimeFormated, reservation.User.ID, reservation.ID)
	if err != nil {
		appState.App.Err("updateReservationEndDate %v", err.Error())
		http.Error(w, "Can't update reservation ", http.StatusInternalServerError)
		return err
	}
	numRows, err := result.RowsAffected()
	if err != nil || numRows != 1 {
		if err != nil {
			appState.App.Err("updateReservationEndDate %v", err.Error())
		} else {
			appState.App.Err("Failed to update reservation end time %v", err)
		}
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return err
	}
	appState.App.Debug("Successfuly updated reservation %v to %v", field, newTime)
	return nil
}

func handlePreviousStatusDenied(reservation models.Reservation, w http.ResponseWriter) error {
	appState.App.Debug("Old reservation status is %v, charge user for rental cost", models.DENIED)
	rentalCost, err := credits.CalculateRentalCost(reservation.Item, reservation.StartTime, reservation.EndTime)
	if err != nil {
		appState.App.Err("handlePreviousStatusDenied %v", err.Error())
		http.Error(w, "Can't calculate rental cost", http.StatusBadRequest)
		return err
	}
	updatedCredits := reservation.User.Credits - rentalCost
	err = credits.UpdateUserCredits(reservation, updatedCredits, w)
	return err
}

func updateReservationStatus(reservation models.Reservation, status string, w http.ResponseWriter, changingUserId int) {
	result, err := appState.App.Db.Exec(`UPDATE reservations SET r_status = ?,r_changeby_uid = ? WHERE r_id = ?`, status, changingUserId, reservation.ID)
	if err != nil {
		appState.App.Err("updateReservationStatus %v", err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	numRows, err := result.RowsAffected()
	if err != nil || numRows != 1 {
		if err != nil {
			appState.App.Err("updateReservationStatus %v", err.Error())
		} else {
			appState.App.Err("Failed to update reservation status %v", err)
		}
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	response := fmt.Sprintf("id: %d", reservation.ID)
	w.Write([]byte(response))
}

func handleDeniedStatus(reservation models.Reservation, w http.ResponseWriter) error {
	appState.App.Debug("handling status denied")
	rentalCost, err := credits.CalculateRentalCost(reservation.Item, reservation.StartTime, reservation.EndTime)
	if err != nil {
		appState.App.Err("handleDeniedStatus %v", err.Error())
		http.Error(w, "Can't calculate rental cost", http.StatusBadRequest)
		return err
	}
	updatedCredits := reservation.User.Credits + rentalCost
	err = credits.UpdateUserCredits(reservation, updatedCredits, w)
	return err
}
