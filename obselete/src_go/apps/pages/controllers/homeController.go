package controllers

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/pages/appState"
	"bystrze/apps/pages/home"
	"bystrze/apps/pages/news"
	"net/http"
)

func HomePage(w http.ResponseWriter, r *http.Request) {
	smallNews, err := news.GetSmallNews()
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	bigNews, err := news.GetBigNews()
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	bigNewsData := home.ParseBigNewsData(bigNews)

	appState.App.RenderTemplate(w, r, "home.html", &struct {
		BigNews   []models.BigNewsData
		SmallNews []models.News
		apps.TemplateData
	}{
		BigNews:   bigNewsData,
		SmallNews: smallNews,
	})
}

func RedirectToHome(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/pages/home", http.StatusTemporaryRedirect)
}
