package main

import (
	"log"
	"net/http"

	"github.com/johnsto/go-passwordless/v2"
)

// signinHandler prompts the user to choose a method by which to send them
// a token.
func signinHandler(w http.ResponseWriter, r *http.Request) {
	if session, err := getSession(w, r); err == nil {
		if isSignedIn(session) {
			session.AddFlash("already_signed_in")
			session.Save(r, w)
			redirect(w, r, "/", baseURL)
			return
		}

		if err := tmpl.ExecuteTemplate(w, "signin", struct {
			Strategies map[string]passwordless.Strategy
			Context    *Context
			Next       string
		}{
			Strategies: pw.ListStrategies(nil),
			Context:    getTemplateContext(w, r, session),
			Next:       r.FormValue("next"),
		}); err != nil {
			log.Println(err)
		}
	}
}

// tokenHandler has two roles. Firstly, it allows the user to input the token
// they have received via their chosen method. Secondly, it verifies the
// token they input, and redirects them appropriately on success. On failure,
// the user is prompted to try again.

func signoutHandler(w http.ResponseWriter, r *http.Request) {
	session, err := getSession(w, r)
	if err != nil {
		return
	}

	// Remove secure session cookie
	delete(session.Values, "uid")
	session.AddFlash("signed_out")
	session.Save(r, w)

	redirect(w, r, r.FormValue("next"), baseURL)
}
