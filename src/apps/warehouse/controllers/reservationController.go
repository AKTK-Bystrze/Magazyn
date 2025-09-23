package controllers

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/common/timeSet"
	"bystrze/apps/userManager/credits"
	"bystrze/apps/warehouse/appState"
	"bystrze/apps/warehouse/rental"
	"net/http"
	"strconv"
	"time"
)

func ReservationHandler(w http.ResponseWriter, r *http.Request) {
	reservationID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	appState.App.Debug("%v ReservationHandler reservationID %v", session.GetSessionUserName(r), reservationID)

	t, err := rental.GetReservation(reservationID)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	t.StartTime = t.StartTime.In(timeSet.LOCATION)
	t.EndTime = t.EndTime.In(timeSet.LOCATION)
	t.CreatedAt = t.CreatedAt.In(timeSet.LOCATION)

	history, err := rental.GetReservationHistory(reservationID)
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
	appState.App.Info("Form:", r.Form)
	reservationId := r.FormValue("reservation_id")
	newStatus := r.FormValue("status")
	id, err := strconv.Atoi(reservationId)
	if err != nil {
		appState.App.Err("Failed to convert reservation id %s to int: %v", reservationId, err)
	}
	reservation, err := rental.GetReservation(id)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}
	appState.App.Debug("%v setStatusHandler reservation_id %v status %v", session.GetSessionUserName(r), id, newStatus)
	var oldStatus = reservation.Status

	switch oldStatus {
	case rental.DENIED:
		http.Error(w, "Rezerwacja anulowana nie może być zmieniana. Możliwe zmiany: brak.", http.StatusBadRequest)
		return
	case rental.PENDING:
		switch newStatus {
		case rental.RENTED:
			err = handleRentedStatus(*reservation, w, r)
			if err != nil {
				return
			}
		case rental.DENIED:
			err = handleDeniedStatus(*reservation, w, r)
			if err != nil {
				return
			}
		default:
			http.Error(w, "Nieprawidłowa zmiana statusu rezerwacji. Możliwe zmiany: 'wypozyczony', 'anulowany'.", http.StatusBadRequest)
			return
		}
	case rental.RENTED:
		switch newStatus {
		case rental.RETURNED:
			err = handleReturnedStatus(*reservation, w, r)
			if err != nil {
				return
			}
		default:
			http.Error(w, "Nieprawidłowa zmiana statusu rezerwacji. Możliwa zmiana: 'zwrocony'.", http.StatusBadRequest)
			return
		}
	case rental.RETURNED:
		http.Error(w, "Nieprawidłowa zmiana statusu rezerwacji. Możliwe zmiany: brak.", http.StatusBadRequest)
		return
	}
	if reservation.EndTime.Before(reservation.StartTime) {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "Reservation end time has to be after the start time", http.StatusBadRequest)
		return
	}
	rental.UpdateReservationStatus(*reservation, newStatus, w, int(session.GetSessionUserId(r)))
	appState.App.Debug("%v changed status from %v to %v for reservation %v", session.GetSessionUserName(r), oldStatus, newStatus, id)
}

func handleRentedStatus(reservation models.Reservation, w http.ResponseWriter, r *http.Request) error {
	appState.App.Debug("Handling status rented")
	now := time.Now()
	year, month, day := now.Date()
	today := time.Date(year, month, day, 0, 0, 0, 0, now.Location())

	year, month, day = reservation.StartTime.Date()
	reservationStartTime := time.Date(year, month, day, 0, 0, 0, 0, reservation.StartTime.Location())
	if !today.Equal(reservationStartTime) {
		appState.App.Debug("Reservation start time %v is different than today %v. Update reservation",
			reservationStartTime.Format(timeSet.OUT_TIME_FMT), today.Format(timeSet.OUT_TIME_FMT))
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
		creditsChange := +oldRentalCost - newRentalCost
		userCredits = userCredits + creditsChange
		err = rental.UpdateReservationsDate(reservation, "r_start_time", now, w)
		if err != nil {
			return err
		}
		auditMsg := reservation.Item.Name + "\tWypozyczenie w innym terminie"
		err = credits.UpdateUserCredits(reservation, creditsChange, userCredits, auditMsg, int(session.GetSessionUserId(r)), w)
		if err != nil {
			return err
		}
	}
	return nil
}

func handleReturnedStatus(reservation models.Reservation, w http.ResponseWriter, r *http.Request) error {
	appState.App.Debug("Handling status returned")
	now := time.Now()
	year, month, day := now.Date()
	today := time.Date(year, month, day, 0, 0, 0, 0, now.Location())

	year, month, day = reservation.EndTime.Date()
	reservationEndTime := time.Date(year, month, day, 0, 0, 0, 0, reservation.EndTime.Location())
	if !today.Equal(reservationEndTime) {
		appState.App.Debug("Reservation end time %v is different than today %v. Update reservation",
			reservationEndTime.Format(timeSet.OUT_TIME_FMT), today.Format(timeSet.OUT_TIME_FMT))
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
		creditsChange := oldRentalCost - newRentalCost
		userCredits = userCredits + creditsChange
		err = rental.UpdateReservationsDate(reservation, "r_end_time", now, w)
		if err != nil {
			return err
		}
		auditMsg := reservation.Item.Name + "\tZwrot w innym terminie"
		err = credits.UpdateUserCredits(reservation, creditsChange, userCredits, auditMsg, int(session.GetSessionUserId(r)), w)
		if err != nil {
			return err
		}
	}
	return nil
}

func handleDeniedStatus(reservation models.Reservation, w http.ResponseWriter, r *http.Request) error {
	appState.App.Debug("handling status denied")
	rentalCost, err := credits.CalculateRentalCost(reservation.Item, reservation.StartTime, reservation.EndTime)
	if err != nil {
		appState.App.Err("handleDeniedStatus %v", err.Error())
		http.Error(w, "Can't calculate rental cost", http.StatusBadRequest)
		return err
	}
	updatedCredits := reservation.User.Credits + rentalCost
	auditMsg := reservation.Item.Name + "\tAnulowane"
	err = credits.UpdateUserCredits(reservation, rentalCost, updatedCredits, auditMsg, int(session.GetSessionUserId(r)), w)
	return err
}
