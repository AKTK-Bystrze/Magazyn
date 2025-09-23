package items

import (
	"bystrze/apps/common/models"
	"bystrze/apps/common/timeSet"
	"bystrze/apps/warehouse/appState"
	"database/sql"
	"errors"
	"time"

	"github.com/jmoiron/sqlx"
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
	query := `SELECT * FROM items WHERE i_id = $1`
	row := appState.App.Db.QueryRowx(query, itemID)
	var item models.Item
	err := row.StructScan(&item)
	if err != nil {
		appState.App.Debug("GetItem %v %v", itemID, err.Error())
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
		query += ` LEFT JOIN reservations r ON i.i_id = r.r_item_id AND r.r_start_time <= NOW() AND r.r_end_time >= NOW() AND r.r_status != 'denied'
    LEFT JOIN users u ON r.r_user_id = u.u_id  `
	}
	var rows *sqlx.Rows
	var err error
	if conf.Available {
		query += ` WHERE i_id NOT IN (
      SELECT r_item_id
      FROM reservations
      WHERE r_start_time < $1 AND r_end_time > $2 AND r_status != 'denied'
    ) AND i_status = 'ok' `
		rows, err = appState.App.Db.Queryx(query,
			conf.EndTime.Format(timeSet.OUT_TIME_FMT),
			conf.StartTime.Format(timeSet.OUT_TIME_FMT))
	} else {
		rows, err = appState.App.Db.Queryx(query)
	}

	if err != nil {
		appState.App.Debug("GetItems %v %v %v", query, conf, err.Error())
		return nil, err
	}
	defer func() {
		err = errors.Join(err, rows.Close())
	}()

	// Store items in a slice
	items := make([]models.TmpItemWithReservation, 0)
	for rows.Next() {
		var tmpItem tmpItem2
		if err := rows.StructScan(&tmpItem); err != nil {
			appState.App.Debug("GetItems %v %v %v", rows, conf, err.Error())
			return nil, err
		}

		var out models.TmpItemWithReservation
		out.Item = tmpItem.Item
		if tmpItem.ID.Valid {
			out.CurrentReservation.Valid = true
			out.CurrentReservation.ID = tmpItem.ID.Int64
			out.CurrentReservation.StartTime = tmpItem.StartTime.Time.In(timeSet.LOCATION)
			out.CurrentReservation.EndTime = tmpItem.EndTime.Time.In(timeSet.LOCATION)
			out.CurrentReservation.Status = tmpItem.Status.String
			out.CurrentReservation.User.Name = tmpItem.Username.String
			out.CurrentReservation.User.ID = tmpItem.UserID.Int64
		}

		items = append(items, out)
	}
	if err := rows.Err(); err != nil {
		appState.App.Debug("GetItems %v %v", conf, err.Error())
		return nil, err
	}
	return items, nil
}

func CheckAvailability(start time.Time, end time.Time, itemID int) (bool, error) {
       query := `SELECT count(*) FROM reservations WHERE r_item_id=$1 AND r_end_time > $2 AND r_start_time < $3 AND (r_status = 'pending' OR r_status = 'rented')`
       row := appState.App.Db.QueryRow(query, itemID, start.Format(timeSet.OUT_TIME_FMT), end.Format(timeSet.OUT_TIME_FMT))
       var count int
       err := row.Scan(&count)
       if err != nil {
	       appState.App.Debug("CheckAvailability %v %v %v %v", start, end, itemID, err.Error())
	       return false, err
       }
       if count > 0 {
	       return false, nil
       }
       return true, nil
}

func UpdateItemStatus(itemID int, status string) error {
	stmt, err := appState.App.Db.Prepare("UPDATE items SET i_status = $1 WHERE i_id = $2")
	if err != nil {
		appState.App.Debug("UpdateItemStatus %v %v %v", itemID, status, err.Error())
		return err
	}
	_, err = stmt.Exec(status, itemID)
	if err != nil {
		appState.App.Debug("UpdateItemStatus %v %v %v", itemID, status, err.Error())
	}
	return err
}

func UpdateItemDescription(itemID int, description string) error {
	stmt, err := appState.App.Db.Prepare("UPDATE items SET i_description = $1 WHERE i_id = $2")
	if err != nil {
		appState.App.Debug("UpdateItemDescription %v %v %v", itemID, description, err.Error())
		return err
	}
	_, err = stmt.Exec(description, itemID)
	if err != nil {
		appState.App.Debug("UpdateItemDescription %v %v %v", itemID, description, err.Error())
	}
	return err
}
