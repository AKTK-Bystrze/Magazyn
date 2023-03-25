package main

import (
  "net/http"
  "log"
)

func UserDashboard(w http.ResponseWriter, r *http.Request) {
    session, _ := app.store.Get(r, SESSION_NAME)
    // search for reserved items in the db
    reservations, err := app.getReservations(queryConfigReservation{
      oneUser:true,
      selectionId:int(session.Values["user_id"].(int64)),
      orderDesc:true,
      })
    if err != nil {
        log.Println(err)
        http.Error(w, "DB Error", http.StatusInternalServerError)
        return
    }

    err = app.templates.ExecuteTemplate(w, "user_dashboard.html", struct {
        Username       string
        Reservations []Reservation
    }{
        Username:       session.Values["username"].(string),
        Reservations:   reservations,
    })
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
}

