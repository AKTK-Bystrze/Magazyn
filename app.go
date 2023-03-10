package main

import (
		"time"
    "log"
)

const OUT_TIME_FMT = "2006-01-02 15:04:05"

type tmpReservation struct {
	Reservation
	Item
	User
}

type queryConfigReservation struct {
	oneUser bool
	userId int
	users	bool
  orderByStart bool
	orderDesc	bool
}

func (app AppState) getReservations(conf queryConfigReservation) ([]Reservation,error) {
	// Retrieve all reservations from database
	query := "SELECT r.*, i.i_name, i.i_description "
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
	rows, err := udb.Queryx(query, conf.userId)

	if err != nil {
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
		reservations = append(reservations, r)
	}
	if err = rows.Err(); err != nil {
		return nil,err
	}
	return reservations,nil
}

type queryConfigItems struct {
  available bool
  startTime time.Time
  endTime time.Time
}

func (app AppState) getItems(conf queryConfigItems) ([]Item,error) {
  // Get all items from the database
  query := "SELECT i_id, i_name, i_description, i_status FROM items"
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
  items := make([]Item, 0)
  for rows.Next() {
    var item Item
    if err := rows.StructScan(&item); err != nil {
      return nil,err
    }
    items = append(items, item)
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
    log.Println(err)
		return false, err
	}
	if count > 0 {
		return false, nil
	}
	return true, nil
}

