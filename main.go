package main

import (
    "database/sql"
    "html/template"
    "log"
    "net/http"
    "time"

    "github.com/gorilla/mux"
    "github.com/gorilla/sessions"
    _ "github.com/mattn/go-sqlite3"
)

const SESSION_NAME = "session-name"

func UserDashboard(w http.ResponseWriter, r *http.Request) {
    // check if the user is logged in
    session, _ := app.store.Get(r, SESSION_NAME)
    role := session.Values["role"]
    if role == nil || role.(string) != "user" {
        http.Redirect(w, r, "/", http.StatusSeeOther)
        return
    }
    // search for reserved chairs in the db
    db, err := sql.Open("sqlite3", "chairs.db")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()
    rows, err := db.Query(`
        SELECT r.*,c.name,c.description from reservations r
        JOIN chairs c ON r.chair_id = c.id
        WHERE user_id = ?
    `, session.Values["user_id"]);
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    // create a list of available chairs
    type reservationInfo struct {
      Id int
      Chair_id int
      User_id int
      Start_time time.Time
      End_time time.Time
      Name string
      Desc string
			Status string
    }
    var reservedChairs []reservationInfo
    for rows.Next() {
        var item reservationInfo
        if err := rows.Scan(&item.Id, &item.Chair_id,
         &item.User_id,
         &item.Start_time,
         &item.End_time,
         &item.Name,
         &item.Desc,
				 &item.Status); err != nil {
            log.Fatal(err)
        }
        reservedChairs = append(reservedChairs, item)
    }
    if err := rows.Err(); err != nil {
        log.Fatal(err)
    }

    err = app.templates.ExecuteTemplate(w, "user_dashboard.html", struct {
        Username       string
        Reservations []reservationInfo
    }{
        Username:       session.Values["username"].(string),
        Reservations:   reservedChairs,
    })
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
}

func SearchHandler(w http.ResponseWriter, r *http.Request) {	
	SearchChairs(w, r, "")
}

func ReserveHandler(w http.ResponseWriter, r *http.Request) {

}

func renderTemplate(w http.ResponseWriter, tmpl string, data interface{}) {
	err := app.templates.ExecuteTemplate(w, tmpl, data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

type AppState struct {
	db *sql.DB
	templates *template.Template
	store *sessions.CookieStore
}

var app AppState

func main() {
    router := mux.NewRouter()

		db, err := sql.Open("sqlite3", "chairs.db")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()
		app.db = db
		app.templates = template.Must(template.ParseGlob("templates/*.html"))
		app.store = sessions.NewCookieStore([]byte("secret-key"))

    log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

    router.HandleFunc("/", Login).Methods("GET", "POST")
    router.HandleFunc("/login", Login).Methods("GET", "POST")
    router.HandleFunc("/dashboard", UserDashboard).Methods("GET", "POST")
    router.HandleFunc("/search", SearchHandler).Methods("GET")
    router.HandleFunc("/logout", Logout).Methods("GET")
    router.HandleFunc("/reserve", ReserveChair).Methods("POST")
    router.HandleFunc("/admin", adminDashboardHandler).Methods("GET")
    router.HandleFunc("/setStatus", setStatusHandler).Methods("POST")
    log.Fatal(http.ListenAndServe(":8080", router))
}
