package home

import "bystrze/apps/common/models"

func ParseBigNewsData(news []models.News) []models.BigNewsData {
	var bigNewsDataList []models.BigNewsData
	for _, news := range news {
		bigNewsData := models.BigNewsData{
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
