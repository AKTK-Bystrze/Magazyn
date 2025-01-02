package controllers

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/users"
	"bystrze/apps/warehouse/items"
	"bystrze/apps/warehouse/rental"
	"net/http"
	"strconv"
)

func AdminDashboardHandler(w http.ResponseWriter, r *http.Request) {
	reservations, err := rental.GetReservations(rental.QueryConfigReservation{Users: true})
	if err != nil {
		appState.App.ErrSession(r, err)
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	appState.App.RenderTemplate(w, r, "admin_dashboard.html", &struct {
		Reservations []models.Reservation
		apps.TemplateData
	}{
		Reservations: reservations,
	})
}

func AdminItemsHandler(w http.ResponseWriter, r *http.Request) {
	items, err := items.GetItems(models.QueryConfigItems{WithCurReservation: true})
	if err != nil {
		appState.App.ErrSession(r, err)
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	appState.App.RenderTemplate(w, r, "admin_items.html", &struct {
		Items []models.TmpItemWithReservation
		apps.TemplateData
	}{
		Items: items,
	})
}

func AdminItemStatusEdit(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		appState.App.Err("%v Form parsing error %v", session.GetSessionUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	itemID, err := strconv.Atoi(r.FormValue("id"))
	if err != nil {
		appState.App.Err("%v Can't get id from form %v", session.GetSessionUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	description := r.FormValue("description")
	err = items.UpdateItemDescription(itemID, description)
	if err != nil {
		appState.App.ErrSession(r, err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	appState.App.Debug("%v set itemid %v description to %v", session.GetSessionUserName(r), itemID, description)
	http.Redirect(w, r, "/warehouse/admin/item/show?id="+r.FormValue("id"), http.StatusSeeOther)
}

func AdminItemStatusHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		appState.App.Err("%v Form parsing error %v", session.GetSessionUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	itemID, err := strconv.Atoi(r.FormValue("id"))
	if err != nil {
		appState.App.Err("%v Can't get id from form %v", session.GetSessionUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	status := r.FormValue("status")
	err = items.UpdateItemStatus(itemID, status)
	if err != nil {
		appState.App.ErrSession(r, err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	appState.App.Debug("%v set itemid %v status to %v", session.GetSessionUserName(r), itemID, status)
	http.Redirect(w, r, "/warehouse/admin/items", http.StatusSeeOther)
}

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

func AdminShowItemHandler(w http.ResponseWriter, r *http.Request) {
	itemID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil {
		appState.App.ErrSession(r, err)
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	reservations, err := rental.GetReservations(rental.QueryConfigReservation{
		OneItem:      true,
		SelectionId:  itemID,
		OrderByStart: true,
		Users:        true,
	})
	if err != nil {
		appState.App.ErrSession(r, err)
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	historicalReservations, next24HReservations, upcomingReservations := rental.GetPastFutureReservations(reservations)

	item, err := items.GetItem(itemID)
	if err != nil {
		appState.App.ErrSession(r, err)
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	appState.App.RenderTemplate(w, r, "admin_item.html", &struct {
		rental.ReservationViewData
		Item *models.Item
	}{
		rental.ReservationViewData{
			UpcomingReservations:   &upcomingReservations,
			HistoricalReservations: &historicalReservations,
			Next24HReservations:    &next24HReservations,
		},
		item,
	})
}
