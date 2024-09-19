package main

import (
	"net/http"
)

func homePage(w http.ResponseWriter, r *http.Request) {
	smallNews, err := app.getSmallNews()
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	bigNews, err := app.getBigNews()
	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	bigNewsData := parseBigNewsData(bigNews)
	err = app.templates.ExecuteTemplate(w, "home.html", &struct {
		BigNews   []BigNewsData
		SmallNews []News
	}{
		bigNewsData,
		smallNews,
	})

	if err != nil {
		app.Err("%v %v", getUserName(r), err.Error())
		http.Error(w, "Template error", http.StatusInternalServerError)
	}
}

type BigNewsData struct {
	ID               int64
	CreatedTimeDay   string
	CreatedTimeMonth string
	Header           string
	Content          string
	Author           User
}

func parseBigNewsData(news []News) []BigNewsData {
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
