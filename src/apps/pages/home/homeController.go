package home

import (
	"bystrze/apps"
	"bystrze/apps/pages/appState"
	"bystrze/apps/pages/news"
	"bystrze/services/utils"
	"net/http"
)

func HomePage(w http.ResponseWriter, r *http.Request) {
	smallNews, err := news.GetSmallNews()
	if err != nil {
		appState.App.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	bigNews, err := news.GetBigNews()
	if err != nil {
		appState.App.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	bigNewsData := parseBigNewsData(bigNews)

	appState.App.RenderTemplate(w, r, "home.html", &struct {
		BigNews   []BigNewsData
		SmallNews []news.News
		apps.TemplateData
	}{
		BigNews:   bigNewsData,
		SmallNews: smallNews,
	})
}
