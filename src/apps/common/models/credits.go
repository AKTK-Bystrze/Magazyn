package models

import "time"

type CreditsAudit struct {
	ID          int       `db:"ca_id"`
	U_ID        int       `db:"ca_user_id"`
	Author_ID   int       `db:"ca_author_id"`
	Value       int       `db:"ca_value"`
	Balance     int       `db:"ca_balance"`
	Description string    `db:"ca_description"`
	ChangeDate  time.Time `db:"ca_change_date"`
}
