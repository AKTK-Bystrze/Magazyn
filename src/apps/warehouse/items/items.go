package items

const OUT_TIME_FMT = "2006-01-02 15:04:05"

type Item struct {
	ID          int    `db:"i_id"`
	Name        string `db:"i_name"`
	Description string `db:"i_description"`
	Status      string `db:"i_status"`
	Type        string `db:"i_type"`
}

func GetItem(itemID int) (Item, error) {
	query := `SELECT * FROM items WHERE i_id = ?`
	row := app.db.QueryRowx(query, id)
	var item structs.Item
	err := row.StructScan(&item)
	if err != nil {
		app.Err(err.Error())
		return nil, err
	}
	return &item, nil
}

func (app AppState) getItems(conf queryConfigItems) ([]tmpItem, error) {
	var location, err = time.LoadLocation("Europe/Warsaw")
	if err != nil {
		app.Err(err.Error())
		return []tmpItem{}, err
	}
	// Get all items from the database
	query := "SELECT i_id, i_name, i_description, i_status, i_type "
	if conf.withCurReservation {
		query += ", r.r_id, r.r_status, u.u_username, u.u_id, r.r_start_time, r.r_end_time "
		//query += ", r.r_id, COALESCE(r.r_start_time, datetime('now')) AS r_start_time, COALESCE(r.r_end_time, datetime('now')) AS r_end_time, COALESCE(r.r_status, '') AS r_status, COALESCE(u.u_username, '') AS u_username "
	}
	query += " FROM items i "
	if conf.withCurReservation {
		//  TODO: this search may require app-privided value for 'now'
		query += ` LEFT JOIN reservations r ON i.i_id = r.r_item_id AND r.r_start_time <= datetime('now', 'localtime') AND r.r_end_time >= datetime('now', 'localtime') AND r.r_status != 'denied'
    LEFT JOIN users u ON r.r_user_id = u.u_id  `
	}
	if conf.available {
		query += ` WHERE i_id NOT IN (
      SELECT r_item_id
      FROM reservations
      WHERE r_start_time < ? AND r_end_time > ? AND r_status != 'denied'
    ) AND i_status == 'ok' `
	}
	rows, err := app.db.Queryx(query,
		conf.endTime.Format(OUT_TIME_FMT),
		conf.startTime.Format(OUT_TIME_FMT))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Store items in a slice
	items := make([]tmpItem, 0)
	for rows.Next() {
		var tmp tmpItem2
		if err := rows.StructScan(&tmp); err != nil {
			return nil, err
		}

		var out tmpItem
		out.Item = tmp.Item
		if tmp.ID.Valid {
			out.CurrentReservation.Valid = true
			out.CurrentReservation.ID = tmp.ID.Int64
			out.CurrentReservation.StartTime = tmp.StartTime.Time.In(location)
			out.CurrentReservation.EndTime = tmp.EndTime.Time.In(location)
			out.CurrentReservation.Status = tmp.Status.String
			out.CurrentReservation.User.Name = tmp.Username.String
			out.CurrentReservation.User.ID = tmp.UserID.Int64
		}

		items = append(items, out)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

type tmpItem2 struct {
	ID        sql.NullInt64  `db:"r_id"`
	StartTime sql.NullTime   `db:"r_start_time"`
	EndTime   sql.NullTime   `db:"r_end_time"`
	Status    sql.NullString `db:"r_status"`
	Username  sql.NullString `db:"u_username"`
	UserID    sql.NullInt64  `db:"u_id"`
	structs.Item
}

type tmpItem struct {
	structs.Item
	CurrentReservation struct {
		Valid bool
		structs.Reservation
	}
}

type queryConfigItems struct {
	available          bool
	withCurReservation bool
	startTime          time.Time
	endTime            time.Time
}

func (app AppState) checkAvailability(start time.Time, end time.Time, itemID int) (bool, error) {
	// check if the requested reservation period is outside of any existing reservation
	query := `SELECT count(*) FROM reservations WHERE r_item_id=? AND r_end_time > ? AND r_start_time < ? AND r_status != 'denied'`
	row := app.db.QueryRow(query, itemID, start.Format(OUT_TIME_FMT), end.Format(OUT_TIME_FMT))
	var count int
	err := row.Scan(&count)
	if err != nil {
		app.Err(err.Error())
		return false, err
	}
	if count > 0 {
		return false, nil
	}
	return true, nil
}
