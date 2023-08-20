package main

import (
	"context"
	"database/sql"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/sessions"
	"github.com/jmoiron/sqlx"
	"github.com/johnsto/go-passwordless/v2"
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

func getEmailUsername(email string) string {
	usernameAndDomain := strings.Split(email, "@")
	return usernameAndDomain[0]
}

type Templates interface {
	ExecuteTemplate(wr io.Writer, name string, data any) error
}

type Passwordless interface {
	GetStrategy(ctx context.Context, name string) (passwordless.Strategy, error)
	ListStrategies(ctx context.Context) map[string]passwordless.Strategy
	RequestToken(ctx context.Context, s string, uid string, recipient string) error
	SetStrategy(name string, s passwordless.Strategy)
	SetTransport(name string, t passwordless.Transport, g passwordless.TokenGenerator, ttl time.Duration) passwordless.Strategy
	VerifyToken(ctx context.Context, uid string, token string) (bool, error)
}

type Database interface {
	Exec(query string, args ...any) (sql.Result, error)
	QueryRow(query string, args ...any) *sql.Row
	Query(query string, args ...any) (*sql.Rows, error)
	Get(dest interface{}, query string, args ...interface{}) error
	Prepare(query string) (*sql.Stmt, error)
	Unsafe() *sqlx.DB
	Queryx(query string, args ...interface{}) (*sqlx.Rows, error)
	QueryRowx(query string, args ...interface{}) *sqlx.Row
}
