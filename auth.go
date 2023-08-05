package main

import (
	"net/http"
)

type tmpUser struct {
	ID   int64  `db:"u_id"`
	Name string `db:"u_username"`
	Role string `db:"u_role"`
}

func Login(w http.ResponseWriter, r *http.Request) {
	session, _ := app.store.Get(r, SESSION_NAME)
	target := "/dashboard"
	var u tmpUser

	// check if user is logged in
	if isSignedIn(session) {
		err := app.db.Get(&u, "SELECT u_username, u_id, u_role FROM users WHERE u_id = ?", session.Values["UserInfo"])
		if err != nil {
			app.Err(err.Error())
			http.Error(w, "Template error", http.StatusInternalServerError)
			return
		}
	} else {
		// display the login form
		if r.Method == "GET" {
			app.renderTemplateNoData(w, "login.html")
			return
		}
		// get the username and password from the request
		username := r.FormValue("username")

		err := app.db.Get(&u, "SELECT u_username, u_id, u_role FROM users WHERE u_username = ?", username)
		if err != nil {
			app.Err(err.Error())
			// if the username or password is invalid, display an error message
			err := app.templates.ExecuteTemplate(w, "login.html", struct {
				Msg string
			}{
				Msg: "Invalid username or password",
			})
			if err != nil {
				app.Err(err.Error())
				http.Error(w, "Template error", http.StatusInternalServerError)
				return
			}
			return
		}

		session.Values["UserInfo"] = int(u.ID)
	}

	if u.Role == "admin" {
		target = "/admin/reservations"
	}

	err := session.Save(r, w)
	if err != nil {
		app.Err(err.Error())
	}
	// redirect to the user dashboard
	http.Redirect(w, r, target, http.StatusSeeOther)
	return
}

func Logout(w http.ResponseWriter, r *http.Request) {
	session, _ := app.store.Get(r, SESSION_NAME)
	for key := range session.Values {
		delete(session.Values, key)
	}
	session.Save(r, w)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
