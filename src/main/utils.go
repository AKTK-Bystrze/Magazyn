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

func If[T any](cond bool, vtrue, vfalse T) T {
	if cond {
		return vtrue
	}
	return vfalse
}

type Templates interface {
	ExecuteTemplate(wr io.Writer, name string, data any) error
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
