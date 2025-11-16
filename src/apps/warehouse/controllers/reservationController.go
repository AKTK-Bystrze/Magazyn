package controllers

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/common/timeSet"
	"bystrze/apps/userManager/auth/access"
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
	newStartTimeStr := r.FormValue("startTime")
	newEndTimeStr := r.FormValue("endTime")

	id, err := strconv.Atoi(reservationId)
	if err != nil {
		appState.App.Err("Failed to convert reservation id %s to int: %v", reservationId, err)
	}

	// Parse start and end dates
	var newStartTime, newEndTime time.Time
	if newStartTimeStr != "" {
		newStartTime, err = time.Parse(timeSet.IN_TIME_FMT, newStartTimeStr)
		if err != nil {
			appState.App.Err("Failed to parse start date %s: %v", newStartTimeStr, err)
			http.Error(w, "Invalid start date format", http.StatusBadRequest)
			return
		}
	}
	if newEndTimeStr != "" {
		newEndTime, err = time.Parse(timeSet.IN_TIME_FMT, newEndTimeStr)
		if err != nil {
			appState.App.Err("Failed to parse end date %s: %v", newEndTimeStr, err)
			http.Error(w, "Invalid end date format", http.StatusBadRequest)
			return
		}
	}

	reservation, err := rental.GetReservation(id)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}
	// if this user is not admin
	// then user can change reservation status only if he is owner of this reservation and status is pending
	if !access.HasAdminPrivilege(w, r) {
		if int(reservation.User.ID) != int(session.GetSessionUserId(r)) {
			appState.App.Err("%v tried to change reservation %v status but is not owner", session.GetSessionUserName(r), id)
			http.Error(w, "You are not allowed to change status of this reservation", http.StatusForbidden)
			return
		}
		if reservation.Status != rental.PENDING {
			appState.App.Err("%v tried to change reservation %v status but status is not pending", session.GetSessionUserName(r), id)
			http.Error(w, "You are not allowed to change status of this reservation", http.StatusForbidden)
			return
		}
		appState.App.Debug("%v is owner of reservation %v and status is pending, can change status", session.GetSessionUserName(r), id)
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
			err = handleNewStatus(*reservation, newStartTime, newEndTime, newStatus, w, r)
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
			err = handleNewStatus(*reservation, newStartTime, newEndTime, newStatus, w, r)
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

func handleNewStatus(reservation models.Reservation, newStartTime time.Time, newEndTime time.Time, newStatus string, w http.ResponseWriter, r *http.Request) error {
	appState.App.Debug("Handling status change from %v to %v", reservation.Status, newStatus)
	if timeSet.IsTheSameDay(reservation.StartTime, newStartTime) && timeSet.IsTheSameDay(reservation.EndTime, newEndTime) {
		appState.App.Info("Status changed to %v but dates are unchanged, changed just reservation status", newStatus)
		return nil
	}
	appState.App.Info("Reservation dates have changed. Update reservation")
	appState.App.Info("Old reservation dates: start %v end %v", reservation.StartTime.Format(timeSet.OUT_TIME_FMT), reservation.EndTime.Format(timeSet.OUT_TIME_FMT))
	appState.App.Info("New reservation dates: start %v end %v", newStartTime.Format(timeSet.OUT_TIME_FMT), newEndTime.Format(timeSet.OUT_TIME_FMT))

	userCredits := reservation.User.Credits
	oldRentalCost, err := credits.CalculateRentalCost(reservation.Item, reservation.StartTime, reservation.EndTime)
	if err != nil {
		appState.App.Err("handleReturnedStatus %v", err.Error())
		http.Error(w, "Can't calculate rental cost", http.StatusInternalServerError)
		return err
	}
	newRentalCost, err := credits.CalculateRentalCost(reservation.Item, newStartTime, newEndTime)
	if err != nil {
		appState.App.Err("handleReturnedStatus %v", err.Error())
		http.Error(w, "Can't calculate rental cost", http.StatusInternalServerError)
		return err
	}
	creditsChange := oldRentalCost - newRentalCost
	userCredits = userCredits + creditsChange
	switch newStatus {
	case rental.RETURNED:
		auditMsg := reservation.Item.Name + "\tZwrot ze zmianą terminu"
		err = credits.UpdateUserCredits(reservation, creditsChange, userCredits, auditMsg, int(session.GetSessionUserId(r)), w)
		if err != nil {
			return err
		}
	case rental.RENTED:
		auditMsg := reservation.Item.Name + "\tWypozyczenie ze zmianą terminu"
		err = credits.UpdateUserCredits(reservation, creditsChange, userCredits, auditMsg, int(session.GetSessionUserId(r)), w)
		if err != nil {
			return err
		}
	}

	err = rental.UpdateReservationsDuration(reservation, newStartTime, newEndTime, w)
	if err != nil {
		return err
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

func AllReservationsHandler(w http.ResponseWriter, r *http.Request) {
	reservations, err := rental.GetAllReservations()
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	// Execute the template
	data := struct {
		Reservations []models.Reservation
		apps.TemplateData
	}{
		Reservations: reservations,
	}

	appState.App.RenderTemplate(w, r, "admin_all_reservations.html", &data)
}

func UserReservationsHandler(w http.ResponseWriter, r *http.Request) {
	reservations, err := rental.GetAllReservations()
	if err != nil {
		appState.App.Err("Failed to fetch reservations: %v", err)
		http.Error(w, "Failed to fetch reservations", http.StatusInternalServerError)
		return
	}

	data := struct {
		Reservations []models.Reservation
		apps.TemplateData
	}{
		Reservations: reservations,
	}

	appState.App.RenderTemplate(w, r, "all_reservations.html", &data)
}
