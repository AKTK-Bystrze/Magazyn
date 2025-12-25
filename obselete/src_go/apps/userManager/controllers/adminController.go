package controllers

import (
	"bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/users"
	"bystrze/apps/warehouse/rental"
	"net/http"
	"strconv"
)

func AdminShowUserHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	reservations, err := rental.GetReservations(rental.QueryConfigReservation{
		OneUser:      true,
		SelectionId:  userID,
		OrderByStart: true,
	})
	if err != nil {
		appState.App.ErrSession(r, err)
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	historicalReservations, next24HReservations, upcomingReservations := rental.GetPastFutureReservations(reservations)

	uname, err := users.GetUserName(userID)
	if err != nil {
		appState.App.ErrSession(r, err)
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	appState.App.RenderTemplate(w, r, "admin_user.html", &struct {
		rental.ReservationViewData
		Username string
	}{
		rental.ReservationViewData{
			UpcomingReservations:   &upcomingReservations,
			HistoricalReservations: &historicalReservations,
			Next24HReservations:    &next24HReservations,
		},
		uname,
	})
}
