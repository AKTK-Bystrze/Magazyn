package models

import "time"

type News struct {
	ID          int64     `db:"n_id"`
	CreatedTime time.Time `db:"n_created_time"`
	Header      string    `db:"n_header"`
	Content     string    `db:"n_content"`
	Author      string    `db:"n_author"`
}

type BigNewsData struct {
	ID               int64
	CreatedTimeDay   string
	CreatedTimeMonth string
	Header           string
	Content          string
	Author           string
}
