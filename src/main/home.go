package main

import (
	"bystrze/services/structs"
	"bystrze/services/utils"
	"net/http"
)

func HomePage(w http.ResponseWriter, r *http.Request) {
	smallNews, err := app.getSmallNews()
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	bigNews, err := app.getBigNews()
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	bigNewsData := parseBigNewsData(bigNews)

	app.renderTemplate(w, r, "home.html", &struct {
		BigNews   []BigNewsData
		SmallNews []structs.News
		templateData
	}{
		BigNews:   bigNewsData,
		SmallNews: smallNews,
	})
}

type BigNewsData struct {
	ID               int64
	CreatedTimeDay   string
	CreatedTimeMonth string
	Header           string
	Content          string
	Author           string
}

func parseBigNewsData(news []structs.News) []BigNewsData {
	var bigNewsDataList []BigNewsData
	for _, news := range news {
		bigNewsData := BigNewsData{
			ID:               news.ID,
			CreatedTimeDay:   news.CreatedTime.Format("02"),
			CreatedTimeMonth: news.CreatedTime.Format("Jan"),
			Header:           news.Header,
			Content:          news.Content,
			Author:           news.Author,
		}
		bigNewsDataList = append(bigNewsDataList, bigNewsData)
	}
	return bigNewsDataList
}
