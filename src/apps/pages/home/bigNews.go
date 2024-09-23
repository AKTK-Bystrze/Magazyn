package home

import "bystrze/apps/pages/news"

type BigNewsData struct {
	ID               int64
	CreatedTimeDay   string
	CreatedTimeMonth string
	Header           string
	Content          string
	Author           string
}

func parseBigNewsData(news []news.News) []BigNewsData {
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
