package session

import (
	"bystrze/apps/common/models"
	"github.com/gorilla/sessions"
	"net/http"
)

func GetSessionUserName(r *http.Request) string {
	uinfo, ok := r.Context().Value("UserInfo").(models.User)
	return If(ok, uinfo.Name, "unknown")
}

func If[T any](cond bool, vtrue, vfalse T) T {
	if cond {
		return vtrue
	}
	return vfalse
}

type SessionStore interface {
	Get(r *http.Request, name string) (*sessions.Session, error)
	New(r *http.Request, name string) (*sessions.Session, error)
	Save(r *http.Request, w http.ResponseWriter, s *sessions.Session) error
}

func GetSessionUserId(r *http.Request) int64 {
	uinfo, ok := r.Context().Value("UserInfo").(models.User)
	return If(ok, uinfo.ID, -1)
}

func IsSignedIn(s *sessions.Session) bool {
	return s != nil && s.Values["UserInfo"] != nil
}
