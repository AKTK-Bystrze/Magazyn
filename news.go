package main

import (
	"fmt"
	"net/http"
)

func createNewsHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		app.Err("%v Form parsing error %v", getUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	newsType := r.FormValue("type")
	if err != nil {
		app.Err("%v Can't get newsType %v", getUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	news := News{
		Header:  r.FormValue("header"),
		Content: r.FormValue("content"),
		// Author:  getUserName(r),
		Author: "Author",
	}

	if news.Header == "" || news.Content == "" || news.Author == "" {
		http.Error(w, "Fields can't be empty", http.StatusBadRequest)
		return
	}
	if newsType == "SmallNews" {
		newsType = "small_news"
	} else if newsType == "BigNews" {
		newsType = "big_news"
	} else {
		app.Err("%v %v", getUserName(r), "Unknown news type")
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}
	query := fmt.Sprintf(`INSERT INTO %v (n_header, n_content, n_author) VALUES (?, ?, ?)`, newsType)
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}

	_, err = app.db.Exec(query, news.Header, news.Content, news.Author)
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}

	app.Debug("%v save %v news with header %v ", getUserName(r), newsType, news.Header)
}

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
