package news

import (
	"bystrze/apps/common/models"
	"bystrze/apps/pages/appState"
	"errors"
	"fmt"
	"sort"
)

func DeleteNewsByID(newsType string, newsID string) error {
	query := fmt.Sprintf("DELETE FROM %v WHERE n_id = ?", newsType)
	_, err := appState.App.Db.Exec(query, newsID)
	return err
}

func InsertNews(newsType string, news models.News) (int64, error) {
	query := fmt.Sprintf(`INSERT INTO %v (n_header, n_content, n_author) VALUES (?, ?, ?)`, newsType)
	result, err := appState.App.Db.Exec(query, news.Header, news.Content, news.Author)
	if err != nil {
		id, err := result.LastInsertId()
		return id, err
	}
	return 0, err
}

func RetriveAllNewsByType(newsType string) ([]models.News, error) {
	query := `
		SELECT n_id, n_created_time, n_header, n_content, n_author
		FROM ` + newsType

	rows, err := appState.App.Db.Queryx(query)
	if err != nil {
		return nil, err
	}
	defer func() {
		err = errors.Join(err, rows.Close())
	}()
	var newsList []models.News

	for rows.Next() {
		var news models.News

		err := rows.Scan(&news.ID, &news.CreatedTime, &news.Header, &news.Content, &news.Author)
		if err != nil {
			return nil, err
		}
		newsList = append(newsList, news)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	return newsList, nil
}

func GetBigNews() ([]models.News, error) {
	newsList, err := RetriveAllNewsByType("big_news")
	if err != nil {
		return nil, err
	}
	sort.Slice(newsList, func(i, j int) bool {
		return newsList[i].CreatedTime.After(newsList[j].CreatedTime)
	})
	return newsList, nil
}

func GetSmallNews() ([]models.News, error) {
	newsList, err := RetriveAllNewsByType("small_news")
	if err != nil {
		return nil, err
	}
	sort.Slice(newsList, func(i, j int) bool {
		return newsList[i].CreatedTime.After(newsList[j].CreatedTime)
	})
	return newsList, nil
}
