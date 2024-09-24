package auth

func validUserMiddlware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, _ := app.store.Get(r, structs.SESSION_NAME)
		uid, ok := session.Values["UserInfo"].(int)
		if !ok {
			app.Warn("Unauthorized %v %v %v", strings.Split(r.RemoteAddr, ":")[0], r.Method, r.RequestURI)
			if r.RequestURI != "/" {
				http.Redirect(w, r, "/", http.StatusSeeOther)
			}
			home.HomePage(w, r)
			return
		}
		var uinfo utils.TmpUser
		err := app.db.Get(&uinfo, "SELECT u_username, u_id, u_role, u_credits FROM users WHERE u_id = ?", uid)

		if err != nil || !areRolesValid(uinfo.Role) {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}
		ctx := r.Context()
		ctx = context.WithValue(ctx, "UserInfo", uinfo)
		app.Info("%v %v %v %v", uinfo.Name, strings.Split(r.RemoteAddr, ":")[0], r.Method, r.RequestURI)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func isRoleValid(userRole string) bool {
	for _, privilige := range structs.PRIVILIGES {
		if strings.Compare(userRole, privilige) == 0 {
			return true
		}
	}
	return false
}

func areRolesValid(priviliges string) bool {
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

func adminHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.hasAdminPrivilege(w, r) {
			h.ServeHTTP(w, r)
		}
	})
}

func ninjaHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.hasNinjaPrivilege(w, r) {
			h.ServeHTTP(w, r)
		}
	})
}

func superAdminHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.hasSuperAdminPrivilege(w, r) {
			h.ServeHTTP(w, r)
		}
	})
}

func (app AppState) hasNinjaPrivilege(w http.ResponseWriter, r *http.Request) bool {
	uinfo, ok := r.Context().Value("UserInfo").(utils.TmpUser)
	if !ok || !strings.Contains(uinfo.Role, "ninja") {
		app.Err("Non-ninja user (%s) attempts to access ninja API", utils.If(ok, uinfo.Name, "unknown"))
		http.Redirect(w, r, "/", http.StatusFound)
		return false
	}
	return true
}

func (app AppState) hasSuperAdminPrivilege(w http.ResponseWriter, r *http.Request) bool {
	uinfo, ok := r.Context().Value("UserInfo").(utils.TmpUser)
	if !ok || !strings.Contains(uinfo.Role, structs.SUPERADMIN) {
		app.Err("Non-SuperAdmin user (%s) attempts to access superAdmin API", utils.If(ok, uinfo.Name, "unknown"))
		http.Redirect(w, r, "/", http.StatusFound)
		return false
	}
	return true
}

func (app AppState) hasAdminPrivilege(w http.ResponseWriter, r *http.Request) bool {
	uinfo, ok := r.Context().Value("UserInfo").(utils.TmpUser)
	if !ok || !strings.Contains(uinfo.Role, "admin") {
		app.Err("Non-admin user (%s) attempts to access admin API", utils.If(ok, uinfo.Name, "unknown"))
		http.Redirect(w, r, "/", http.StatusFound)
		return false
	}
	return true
}

const (
	ADMIN      = "admin"
	NINJA      = "ninja"
	USER       = "user"
	SUPERADMIN = "superAdmin"
)

var PRIVILIGES = []string{ADMIN, NINJA, USER, SUPERADMIN}
