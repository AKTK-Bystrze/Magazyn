package users

func UserDashboard(w http.ResponseWriter, r *http.Request) {
	// search for reserved items in the db
	reservations, err := app.getReservations(queryConfigReservation{
		oneUser:     true,
		selectionId: int(r.Context().Value("UserInfo").(utils.TmpUser).ID),
		orderDesc:   true,
	})
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	app.renderTemplate(w, r, "user_dashboard.html", &struct {
		Reservations []structs.Reservation
		templateData
	}{
		Reservations: reservations,
	})
}