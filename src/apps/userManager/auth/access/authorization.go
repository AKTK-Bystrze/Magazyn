package access

import (
	"bystrze/apps/common/contextHelpers"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/users"
	"net/http"
	"strings"
)

const (
	ROLE_ADMIN      = "admin"
	ROLE_NINJA      = "ninja"
	ROLE_USER       = "user"
	ROLE_SUPERADMIN = "superAdmin"
)

var ROLES = []string{ROLE_ADMIN, ROLE_NINJA, ROLE_USER, ROLE_SUPERADMIN}

func ValidUserMiddlware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, _ := appState.App.Store.Get(r, appState.SESSION_NAME)
		uid, ok := session.Values["UserInfo"].(int)
		if !ok {
			appState.App.Warn("Unauthorized %v %v %v", strings.Split(r.RemoteAddr, ":")[0], r.Method, r.RequestURI)
			if !isURIpublic(r.RequestURI) {
				http.Redirect(w, r, "/", http.StatusSeeOther)
			}
			appState.UnauthorizedRedirectHandler(w, r)
			return
		}
		var uinfo models.User
		uinfo, err := users.GetUserById(uid)
		if err != nil || !AreRolesValid(uinfo.Role) {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}
		if !uinfo.Enabled && r.URL.Path != "/users/user/disabled" && r.URL.Path != "/users/user/logout" {
			http.Redirect(w, r, "/users/user/disabled", http.StatusSeeOther)
			return
		}
		ctx := r.Context()
		ctx = contextHelpers.WithUserInfo(ctx, uinfo)
		appState.App.Info("%v %v %v %v", uinfo.Name, strings.Split(r.RemoteAddr, ":")[0], r.Method, r.RequestURI)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func isURIpublic(uri string) bool {
	for _, publicURI := range appState.PublicURIs {
		if publicURI == uri {
			return true
		}
	}
	return false
}

func isRoleValid(userRole string) bool {
	for _, privilige := range ROLES {
		if strings.Compare(userRole, privilige) == 0 {
			return true
		}
	}
	return false
}

func AreRolesValid(priviliges string) bool {
	priviligesList := strings.Fields(priviliges)
	var newRole string
	for _, p := range priviligesList {
		if isRoleValid(string(p)) {
			newRole += p
		}
	}
	priviliges = strings.ReplaceAll(priviliges, " ", "")
	return strings.Compare(newRole, priviliges) == 0
}

func AdminHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if hasAdminPrivilege(w, r) {
			h.ServeHTTP(w, r)
		}
	})
}

func NinjaHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if hasNinjaPrivilege(w, r) {
			h.ServeHTTP(w, r)
		}
	})
}

func SuperAdminHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if hasSuperAdminPrivilege(w, r) {
			h.ServeHTTP(w, r)
		}
	})
}

func hasNinjaPrivilege(w http.ResponseWriter, r *http.Request) bool {
	uinfo, ok := contextHelpers.GetUserInfo(r.Context())
	if !ok || !strings.Contains(uinfo.Role, "ninja") {
		appState.App.Err("Non-ninja user (%s) attempts to access ninja API", session.If(ok, uinfo.Name, "unknown"))
		http.Redirect(w, r, "/", http.StatusFound)
		return false
	}
	return true
}

func hasSuperAdminPrivilege(w http.ResponseWriter, r *http.Request) bool {
	uinfo, ok := contextHelpers.GetUserInfo(r.Context())
	if !ok || !strings.Contains(uinfo.Role, ROLE_SUPERADMIN) {
		appState.App.Err("Non-SuperAdmin user (%s) attempts to access superAdmin API", session.If(ok, uinfo.Name, "unknown"))
		http.Redirect(w, r, "/", http.StatusFound)
		return false
	}
	return true
}

func hasAdminPrivilege(w http.ResponseWriter, r *http.Request) bool {
	uinfo, ok := contextHelpers.GetUserInfo(r.Context())
	if !ok || !strings.Contains(uinfo.Role, "admin") {
		appState.App.Err("Non-admin user (%s) attempts to access admin API", session.If(ok, uinfo.Name, "unknown"))
		http.Redirect(w, r, "/", http.StatusFound)
		return false
	}
	return true
}
