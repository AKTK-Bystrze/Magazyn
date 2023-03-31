package main

import (
    "fmt"
		"time"
    "log"
    "database/sql"
)

const OUT_TIME_FMT = "2006-01-02 15:04:05"

type tmpReservation struct {
	Reservation
	Item
	User
}

type queryConfigReservation struct {
	oneUser bool
	oneItem bool
	selectionId int
	users	bool
  orderByStart bool
	orderDesc	bool
}

func (app AppState) Err(format string, a...interface{}) {
  log.Output(2, fmt.Sprintf("ERR:\t" + format, a...))
}

func (app AppState) getReservations(conf queryConfigReservation) ([]Reservation,error) {
  var location, err = time.LoadLocation("Europe/Warsaw")
  if err != nil {
    app.Err(err.Error())
    return []Reservation{}, err
  }
	// Retrieve all reservations from database
	query := "SELECT r.*, i.i_id, i.i_name, i.i_description "
	if conf.users {
		query += ", u.u_username, u.u_id"
	}
	query += " FROM reservations r "
	if conf.users {
		query += " JOIN users u ON r.r_user_id = u.u_id "
	}
	query += " JOIN items i ON r.r_item_id = i.i_id "
	if conf.oneUser {
		query += " WHERE r.r_user_id = ? "
	} else if conf.oneItem {
		query += " WHERE i.i_id = ? "
  }
  if conf.orderByStart {
    query += " ORDER BY r.r_start_time "
  } else {
    query += " ORDER BY r.r_created_at "
  }
	if conf.orderDesc {
		query += " DESC "
	} else {
		query += " ASC "
	}
	//	allow columns without match in structure
	udb := app.db.Unsafe()
	rows, err := udb.Queryx(query, conf.selectionId)

	if err != nil {
		app.Err(err.Error())
		return nil,err
	}
	defer rows.Close()

	var reservations []Reservation
	for rows.Next() {
		var r Reservation
		var t tmpReservation
		err := rows.StructScan(&t)
		if err != nil {
			return nil,err
		}
		//	work around sqlx to better handle embedded structures and JOINs
		r = t.Reservation
		r.Item = t.Item
		r.User = t.User
    //  TODO: update time to localtime (CEST)
    r.StartTime = r.StartTime.In(location)
    r.EndTime = r.EndTime.In(location)
    r.CreatedAt = r.CreatedAt.In(location)
		reservations = append(reservations, r)
	}
	if err = rows.Err(); err != nil {
		return nil,err
	}
	return reservations,nil
}

type queryConfigItems struct {
  available bool
  withCurReservation bool
  startTime time.Time
  endTime time.Time
}

type tmpItem2 struct {
  ID  sql.NullInt64   `db:"r_id"`
  StartTime sql.NullTime   `db:"r_start_time"`
  EndTime sql.NullTime   `db:"r_end_time"`
  Status sql.NullString `db:"r_status"`
  Username sql.NullString `db:"u_username"`
  UserID sql.NullInt64 `db:"u_id"`
  Item
}

type tmpItem struct {
  Item
  CurrentReservation struct {
    Valid bool
    Reservation
  }
}


func (app AppState) getItems(conf queryConfigItems) ([]tmpItem,error) {
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
    return nil,err
  }
  defer rows.Close()

  // Store items in a slice
  items := make([]tmpItem, 0)
  for rows.Next() {
    var tmp tmpItem2 
    if err := rows.StructScan(&tmp); err != nil {
      return nil,err
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
    return nil,err
  }
  return items,nil
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

func (app AppState) getUsername(id int) (string, error) {
	query := `SELECT u_username FROM users WHERE u_id = ?`
	row := app.db.QueryRow(query, id)
	var uname string
	err := row.Scan(&uname)
	if err != nil {
    app.Err(err.Error())
		return "", err
	}
	return uname,nil
}

func (app AppState) getItem(id int) (*Item, error) {
	query := `SELECT * FROM items WHERE i_id = ?`
	row := app.db.QueryRowx(query, id)
  var item Item
	err := row.StructScan(&item)
	if err != nil {
    app.Err(err.Error())
		return nil, err
	}
	return &item,nil
}
