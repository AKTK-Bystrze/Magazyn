package main

import (
	"net/http"

	"github.com/gorilla/sessions"
)

// Context holds data pertaining to the base page template.
type Context struct {
	SignedIn bool
	UserID   string
	UserName string
	Flashes  []interface{}
}

// Error represents an error that is displayed to the user.
type Error struct {
	Name        string
	Description string
	Error       error
}

// getTemplateContext returns a Context object containing the current user
// and other variables required by all templates.
func getTemplateContext(w http.ResponseWriter, r *http.Request, s *sessions.Session) *Context {
	ctx := &Context{
		Flashes: s.Flashes(),
	}
	if uid, ok := s.Values["uid"].(string); ok {
		ctx.SignedIn = true
		ctx.UserName = uid
		ctx.UserID = uid
	}
	s.Save(r, w)
	return ctx
}

// writeError is a helper method that emits an error page with the given status
// and session.
func writeError(w http.ResponseWriter, r *http.Request, s *sessions.Session, status int, e Error) {
	w.WriteHeader(status)
	tmpl.ExecuteTemplate(w, "error", struct {
		Context *Context
		Error   Error
	}{
		Context: getTemplateContext(w, r, s),
		Error:   e,
	})
}

func isSignedIn(s *sessions.Session) bool {
	return s != nil && s.Values["UserInfo"] != nil
}
