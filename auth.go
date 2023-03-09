package main

import (
    "net/http"
)

func Login(w http.ResponseWriter, r *http.Request) {
    // display the login form
    if r.Method == "GET" {
        err := app.templates.ExecuteTemplate(w, "login.html", nil)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        return
    }

    // get the username and password from the request
    username := r.FormValue("username")
    password := r.FormValue("password")
    password = password

    session, _ := app.store.Get(r, SESSION_NAME)
    target := "/dashboard"

    // check the username and password
    if username == "admin" {
        // set the user role as admin
        session.Values["role"] = "admin"
        session.Values["username"] = username
				session.Values["user_id"] = 2

        target = "/admin"
    } else if username == "user" {
        // set the user role as user
        session.Values["role"] = "user"
        session.Values["username"] = username
        session.Values["user_id"] = 0
    } else if username == "user1" {
        // set the user role as user
        session.Values["role"] = "user"
        session.Values["username"] = username
        session.Values["user_id"] = 1
    } else {
      // if the username or password is invalid, display an error message
      err := app.templates.ExecuteTemplate(w, "login.html", struct {
        Msg string
      }{
        Msg: "Invalid username or password",
      })
      if err != nil {
          http.Error(w, err.Error(), http.StatusInternalServerError)
          return
      }
      return
    }

    session.Save(r, w)
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

