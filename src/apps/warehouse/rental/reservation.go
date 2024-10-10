package rental

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/warehouse/appState"
	"time"
)

type ReservationViewData struct {
	UpcomingReservations   *[]models.Reservation
	HistoricalReservations *[]models.Reservation
	Next24HReservations    *[]models.Reservation
	apps.TemplateData
}

func GetReservation(id int) (*models.Reservation, error) {
	query := `SELECT 
		r.r_id, r.r_start_time, r.r_end_time, r.r_status, r.r_created_at,
		i.i_id, i.i_name, i.i_description, i.i_status, i.i_type,
		u.u_id, u.u_username, u.u_email, u.u_credits
	FROM 
		reservations r
	JOIN 
		items i ON r.r_item_id = i.i_id
	JOIN 
		users u ON r.r_user_id = u.u_id
	WHERE 
		r.r_id = ?`
	var location, err = time.LoadLocation("Europe/Warsaw")
	if err != nil {
		return nil, err
	}
	row := appState.App.Db.Unsafe().QueryRowx(query, id)
	var r models.Reservation
	var t models.TmpReservation
	err = row.StructScan(&t)
	if err != nil {
		appState.App.Err("Can't get reservation id for id %v %v", id, err)
		return nil, err
	}
	//	work around sqlx to better handle embedded structures and JOINs
	r = t.Reservation
	r.Item = t.Item
	r.User = t.User
	//  TODO: update time to localtime (CEST)
	r.StartTime = r.StartTime.In(location)
	r.EndTime = r.EndTime.In(location)
	r.CreatedAt = r.CreatedAt.In(location)
	return &r, nil
}

type QueryConfigReservation struct {
	OneUser      bool
	OneItem      bool
	SelectionId  int
	Users        bool
	OrderByStart bool
	OrderDesc    bool
}

func GetReservations(conf QueryConfigReservation) ([]models.Reservation, error) {
	var location, err = time.LoadLocation("Europe/Warsaw")
	if err != nil {
		appState.App.Err("GetReservations %v", err.Error())
		return []models.Reservation{}, err
	}
	// Retrieve all reservations from database
	query := "SELECT r.*, i.i_id, i.i_name, i.i_description "
	if conf.Users {
		query += ", u.u_username, u.u_id"
	}
	query += " FROM reservations r "
	if conf.Users {
		query += " JOIN users u ON r.r_user_id = u.u_id "
	}
	query += " JOIN items i ON r.r_item_id = i.i_id "
	if conf.OneUser {
		query += " WHERE r.r_user_id = ? "
	} else if conf.OneItem {
		query += " WHERE i.i_id = ? "
	}
	if conf.OrderByStart {
		query += " ORDER BY r.r_start_time "
	} else {
		query += " ORDER BY r.r_created_at "
	}
	if conf.OrderDesc {
		query += " DESC "
	} else {
		query += " ASC "
	}
	//	allow columns without match in structure
	udb := appState.App.Db.Unsafe()
	rows, err := udb.Queryx(query, conf.SelectionId)

	if err != nil {
		appState.App.Err("GetReservations %v", err.Error())
		return nil, err
	}
	defer rows.Close()

	var reservations []models.Reservation
	for rows.Next() {
		var r models.Reservation
		var t models.TmpReservation
		err := rows.StructScan(&t)
		if err != nil {
			appState.App.Err("GetReservations %v", err.Error())
			return nil, err
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
		appState.App.Err("GetReservations %v", err.Error())
		return nil, err
	}
	return reservations, nil
}

func PastFutureReservations(reservations []models.Reservation) ([]models.Reservation, []models.Reservation, []models.Reservation) {
	// Group reservations into current, upcoming and historical
	var upcomingReservations []models.Reservation
	var historicalReservations []models.Reservation
	var currentReservations []models.Reservation

	now := time.Now()
	now24hlater := time.Now().Add(24 * time.Hour)
	now12hearlier := time.Now().Add(-12 * time.Hour)

	for _, res := range reservations {
		if res.StartTime.After(now24hlater) {
			// Reservation is upcoming
			upcomingReservations = append(upcomingReservations, res)
		} else if res.StartTime.After(now) ||
			res.StartTime.After(now12hearlier) ||
			(res.StartTime.Before(now) && res.EndTime.After(now) ||
				res.Status == models.RENTED) {
			// Reservation is upcoming
			currentReservations = append(currentReservations, res)
		} else {
			// Reservation is historical
			historicalReservations = append(historicalReservations, res)
		}
	}
	return historicalReservations, currentReservations, upcomingReservations
}
