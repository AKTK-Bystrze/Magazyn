package news

import (
	"bystrze/apps/common/session"
	"bystrze/apps/pages/appState"
	"net/http"

	"github.com/gorilla/mux"
)

func DeleteNewsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	newsID := vars["newsId"]
	newsType := r.URL.Query().Get("type")
	newsType = GetDBTable(newsType)
	if newsType == "" {
		appState.App.Err("%v %v", session.GetSessionUserName(r), "Missing news type")
		http.Error(w, "Missing news type", http.StatusBadRequest)
		return
	}

	err := DeleteNewsByID(newsType, newsID)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "Failed to delete news item", http.StatusInternalServerError)
		return
	}
	appState.App.Debug("%v deleted %v with id %v ", session.GetSessionUserName(r), newsType, newsID)
	w.WriteHeader(http.StatusOK)
}

func CreateNewsHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		appState.App.Err("%v Form parsing error %v", session.GetSessionUserName(r), err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}

	newsType := r.FormValue("type")

	news := News{
		Header:  r.FormValue("header"),
		Content: r.FormValue("content"),
		Author:  session.GetSessionUserName(r),
	}

	if news.Header == "" || news.Content == "" || news.Author == "" {
		http.Error(w, "Fields can't be empty", http.StatusBadRequest)
		return
	}
	newsType = GetDBTable(newsType)
	if newsType == "" {
		appState.App.Err("%v %v", session.GetSessionUserName(r), "Unknown news type")
		http.Error(w, "DB error", http.StatusBadRequest)
	}

	_, err = InsertNews(newsType, news)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB error", http.StatusBadRequest)
		return
	}

	appState.App.Debug("%v save %v with header %v ", session.GetSessionUserName(r), newsType, news.Header)
	w.WriteHeader(http.StatusOK)
}
