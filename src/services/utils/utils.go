package utils

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

func If[T any](cond bool, vtrue, vfalse T) T {
	if cond {
		return vtrue
	}
	return vfalse
}

// todo should TmpUser and User be both in use insted of one?
type TmpUser struct {
	ID      int64  `db:"u_id"`
	Name    string `db:"u_username"`
	Role    string `db:"u_role"`
	Credits int    `db:"u_credits"`
}

func GetUserName(r *http.Request) string {
	uinfo, ok := r.Context().Value("UserInfo").(TmpUser)
	return If(ok, uinfo.Name, "unknown")
}

func GetUserId(r *http.Request) int64 {
	uinfo, ok := r.Context().Value("UserInfo").(TmpUser)
	return If(ok, uinfo.ID, -1)
}

func IsSignedIn(s *sessions.Session) bool {
	return s != nil && s.Values["UserInfo"] != nil
}

func GetEmailUsername(email string) string {
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

type SessionStore interface {
	Get(r *http.Request, name string) (*sessions.Session, error)
	New(r *http.Request, name string) (*sessions.Session, error)
	Save(r *http.Request, w http.ResponseWriter, s *sessions.Session) error
}
