package main

func (app AppState) hasNinjaPrivilege(w http.ResponseWriter, r *http.Request) bool {
	// Check if user is authenticated as admin
	uinfo, ok := r.Context().Value("UserInfo").(tmpUser)
	if !ok || uinfo.Role != "ninja" && uinfo.Role != "superAdmin" {
		app.Err("Non-ninja user (%s) attempts to access admin API", If(ok, uinfo.Name, "unknown"))
		http.Redirect(w, r, "/", http.StatusFound)
		return false
	}
	return true
}
