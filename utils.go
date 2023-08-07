package main

import (
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/sessions"
)

// Error represents an error that is displayed to the user.
type Error struct {
	Name        string
	Description string
	Error       error
}

// writeError is a helper method that emits an error page with the given status
// and session.
func writeError(w http.ResponseWriter, r *http.Request, s *sessions.Session, status int, e Error) {
	w.WriteHeader(status)
	tmpl.ExecuteTemplate(w, "error", struct {
		Error Error
	}{
		Error: e,
	})
}

func isSignedIn(s *sessions.Session) bool {
	return s != nil && s.Values["UserInfo"] != nil
}

func validateBASE_URL() {
	if BASE_URL == "" {
		BASE_URL = "http://localhost:8080"
		log.Printf("BASE_URL not defined; using %s", BASE_URL)
	}
}

func getEmailUsername(email string) string {
	usernameAndDomain := strings.Split(email, "@")
	return usernameAndDomain[0]
}
