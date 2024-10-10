package items

import (
	"bystrze/apps/common"
	"bystrze/apps/common/models"
	"bystrze/apps/warehouse/appState"
	"database/sql"
	"time"
)

type tmpItem2 struct {
	ID        sql.NullInt64  `db:"r_id"`
	StartTime sql.NullTime   `db:"r_start_time"`
	EndTime   sql.NullTime   `db:"r_end_time"`
	Status    sql.NullString `db:"r_status"`
	Username  sql.NullString `db:"u_username"`
	UserID    sql.NullInt64  `db:"u_id"`
	models.Item
}

func GetItem(itemID int) (*models.Item, error) {
	query := `SELECT * FROM items WHERE i_id = ?`
	row := appState.App.Db.QueryRowx(query, itemID)
	var item models.Item
	err := row.StructScan(&item)
	if err != nil {
		appState.App.Err("GetItem %v", err.Error())
		return nil, err
	}
	return &item, nil
}

func GetItems(conf models.QueryConfigItems) ([]models.TmpItemWithReservation, error) {
	// Get all items from the database
	query := "SELECT i_id, i_name, i_description, i_status, i_type "
	if conf.WithCurReservation {
		query += ", r.r_id, r.r_status, u.u_username, u.u_id, r.r_start_time, r.r_end_time "
		//query += ", r.r_id, COALESCE(r.r_start_time, datetime('now')) AS r_start_time, COALESCE(r.r_end_time, datetime('now')) AS r_end_time, COALESCE(r.r_status, '') AS r_status, COALESCE(u.u_username, '') AS u_username "
	}
	query += " FROM items i "
	if conf.WithCurReservation {
		//  TODO: this search may require app-privided value for 'now'
		query += ` LEFT JOIN reservations r ON i.i_id = r.r_item_id AND r.r_start_time <= datetime('now', 'localtime') AND r.r_end_time >= datetime('now', 'localtime') AND r.r_status != 'denied'
    LEFT JOIN users u ON r.r_user_id = u.u_id  `
	}
	if conf.Available {
		query += ` WHERE i_id NOT IN (
      SELECT r_item_id
      FROM reservations
      WHERE r_start_time < ? AND r_end_time > ? AND r_status != 'denied'
    ) AND i_status == 'ok' `
	}
	rows, err := appState.App.Db.Queryx(query,
		conf.EndTime.Format(common.OUT_TIME_FMT),
		conf.StartTime.Format(common.OUT_TIME_FMT))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Store items in a slice
	items := make([]models.TmpItemWithReservation, 0)
	for rows.Next() {
		var tmpItem tmpItem2
		if err := rows.StructScan(&tmpItem); err != nil {
			return nil, err
		}

		var out models.TmpItemWithReservation
		out.Item = tmpItem.Item
		if tmpItem.ID.Valid {
			out.CurrentReservation.Valid = true
			out.CurrentReservation.ID = tmpItem.ID.Int64
			out.CurrentReservation.StartTime = tmpItem.StartTime.Time.In(common.LOCATION)
			out.CurrentReservation.EndTime = tmpItem.EndTime.Time.In(common.LOCATION)
			out.CurrentReservation.Status = tmpItem.Status.String
			out.CurrentReservation.User.Name = tmpItem.Username.String
			out.CurrentReservation.User.ID = tmpItem.UserID.Int64
		}

		items = append(items, out)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func CheckAvailability(start time.Time, end time.Time, itemID int) (bool, error) {
	// check if the requested reservation period is outside of any existing reservation
	query := `SELECT count(*) FROM reservations WHERE r_item_id=? AND r_end_time > ? AND r_start_time < ? AND r_status != 'denied'`
	row := appState.App.Db.QueryRow(query, itemID, start.Format(common.OUT_TIME_FMT), end.Format(common.OUT_TIME_FMT))
	var count int
	err := row.Scan(&count)
	if err != nil {
		appState.App.Err("CheckAvailability %v", err.Error())
		return false, err
	}
	if count > 0 {
		return false, nil
	}
	return true, nil
}

func UpdateItemStatus(itemID int, status string) error {
	stmt, err := appState.App.Db.Prepare("UPDATE items SET i_status = ? WHERE i_id = ?")
	if err != nil {
		return err
	}
	_, err = stmt.Exec(status, itemID)
	return err
}
