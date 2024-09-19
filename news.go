package main

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
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
		Author:  getUserName(r),
	}

	if news.Header == "" || news.Content == "" || news.Author == "" {
		http.Error(w, "Fields can't be empty", http.StatusBadRequest)
		return
	}
	newsType = getDBTable(newsType)
	if newsType == "" {
		app.Err("%v %v", getUserName(r), "Unknown news type")
		http.Error(w, "DB error", http.StatusBadRequest)
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

	app.Debug("%v save %v with header %v ", getUserName(r), newsType, news.Header)
	w.WriteHeader(http.StatusOK)
}

func getDBTable(newsType string) string {
	if newsType == "SmallNews" {
		return "small_news"
	} else if newsType == "BigNews" {
		return "big_news"
	} else {
		return ""
	}
}

func deleteNewsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	newsID := vars["newsId"]
	newsType := r.URL.Query().Get("type")
	newsType = getDBTable(newsType)
	if newsType == "" {
		app.Err("%v %v", getUserName(r), "Missing news type")
		http.Error(w, "Missing news type", http.StatusBadRequest)
		return
	}

	query := fmt.Sprintf("DELETE FROM %v WHERE n_id = ?", newsType)
	_, err := app.db.Exec(query, newsID)
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "Failed to delete news item", http.StatusInternalServerError)
		return
	}
	app.Debug("%v deleted %v with id %v ", getUserName(r), newsType, newsID)
	w.WriteHeader(http.StatusOK)
}

func (app AppState) hasNinjaPrivilege(w http.ResponseWriter, r *http.Request) bool {
	uinfo, ok := r.Context().Value("UserInfo").(tmpUser)
	if !ok || uinfo.Role != "ninja" && uinfo.Role != "superAdmin" {
		app.Err("Non-ninja user (%s) attempts to access admin API", If(ok, uinfo.Name, "unknown"))
		http.Redirect(w, r, "/", http.StatusFound)
		return false
	}
	return true
}
