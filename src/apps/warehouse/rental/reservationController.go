package rental

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/userManager/credits"
	"bystrze/apps/warehouse/appState"
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

	t, err := GetReservation(reservationID)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	t.StartTime = t.StartTime.In(location)
	t.EndTime = t.EndTime.In(location)
	t.CreatedAt = t.CreatedAt.In(location)

	history, err := GetReservationHistory(reservationID)
	if err != nil {
		appState.App.Err("%v %v %v", session.GetSessionUserName(r), "Can't get reservation history", err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	// Execute the template
	data := struct {
		Reservation        models.Reservation
		ReservationHistory []models.ReservationAudit
		apps.TemplateData
	}{
		Reservation:        *t,
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
	UpdateReservationStatus(*reservation, newStatus, w, int(session.GetSessionUserId(r)))
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
		err = UpdateReservationsDate(reservation, "r_start_time", now, w)
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
		err = UpdateReservationsDate(reservation, "r_end_time", now, w)
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
