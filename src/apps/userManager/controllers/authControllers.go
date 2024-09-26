package controllers

import (
	"bystrze/apps/common"
	sessionPkg "bystrze/apps/common/session"
	app "bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/users"
	"net/http"
	"strings"

	"github.com/johnsto/go-passwordless/v2"
)

func Logout(w http.ResponseWriter, r *http.Request) {
	session, _ := app.App.Store.Get(r, common.SESSION_NAME)
	for key := range session.Values {
		delete(session.Values, key)
	}
	session.Save(r, w)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func Login(w http.ResponseWriter, r *http.Request) {
	session, _ := app.App.Store.Get(r, common.SESSION_NAME)
	if sessionPkg.IsSignedIn(session) {
		userID := session.Values["UserInfo"].(int)
		u, err := users.GetUser(userID)
		if err != nil {
			app.App.Err("%v %v", sessionPkg.GetSessionUserName(r), err.Error())
			http.Error(w, "Template error", http.StatusInternalServerError)
			return
		}
		target := "/users/dashboard"
		if strings.Contains(u.Role, "admin") {
			target = "/warehouse/admin/reservations"
		}
		http.Redirect(w, r, target, http.StatusSeeOther)
		return
	} else {
		app.App.Templates.ExecuteTemplate(w, "login.html", struct {
			Strategies map[string]passwordless.Strategy
			Msg        string
		}{
			Strategies: app.Pw.ListStrategies(nil),
			Msg:        "",
		})
		return
	}
}
