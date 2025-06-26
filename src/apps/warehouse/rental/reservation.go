package rental

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/common/timeSet"
	"bystrze/apps/warehouse/appState"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

// reservationStatus
const (
	DENIED   = "denied"
	RETURNED = "returned"
	APPROVED = "approved"
	PENDING  = "pending"
	RENTED   = "rented"
)

type QueryConfigReservation struct {
	OneUser      bool
	OneItem      bool
	SelectionId  int
	Users        bool
	OrderByStart bool
	OrderDesc    bool
}

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
		r.r_id = $1`
	row := appState.App.Db.Unsafe().QueryRowx(query, id)
	var r models.Reservation
	var t models.TmpReservation
	err := row.StructScan(&t)
	if err != nil {
		appState.App.Err("Can't get reservation id for id %v %v", id, err)
		return nil, err
	}
	//	work around sqlx to better handle embedded structures and JOINs
	r = t.Reservation
	r.Item = t.Item
	r.User = t.User
	//  TODO: update time to localtime (CEST)
	r.StartTime = r.StartTime.In(timeSet.LOCATION)
	r.EndTime = r.EndTime.In(timeSet.LOCATION)
	r.CreatedAt = r.CreatedAt.In(timeSet.LOCATION)
	return &r, nil
}

func GetReservations(conf QueryConfigReservation) ([]models.Reservation, error) {
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
		query += " WHERE r.r_user_id = $1 "
	} else if conf.OneItem {
		query += " WHERE i.i_id = $1 "
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

	var rows *sqlx.Rows
	var err error

	if strings.Contains(query, "$1") {
		rows, err = udb.Queryx(query, conf.SelectionId)
	} else {
		rows, err = udb.Queryx(query)
	}

	if err != nil {
		appState.App.Err("GetReservations %v", err.Error())
		return nil, err
	}
	defer func() {
		err = errors.Join(err, rows.Close())
	}()

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
		r.StartTime = r.StartTime.In(timeSet.LOCATION)
		r.EndTime = r.EndTime.In(timeSet.LOCATION)
		r.CreatedAt = r.CreatedAt.In(timeSet.LOCATION)
		reservations = append(reservations, r)
	}
	if err = rows.Err(); err != nil {
		appState.App.Err("GetReservations %v", err.Error())
		return nil, err
	}
	return reservations, nil
}

func GetPastFutureReservations(reservations []models.Reservation) ([]models.Reservation, []models.Reservation, []models.Reservation) {
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
				res.Status == RENTED) {
			// Reservation is upcoming
			currentReservations = append(currentReservations, res)
		} else {
			// Reservation is historical
			historicalReservations = append(historicalReservations, res)
		}
	}
	return historicalReservations, currentReservations, upcomingReservations
}

func AddReservation(reservation models.Reservation) error {
	stmt, err := appState.App.Db.Prepare("INSERT INTO reservations (r_item_id, r_user_id, r_changeby_uid, r_start_time, r_end_time, r_status) VALUES ($1, $2, $3, $4, $5, $6)")
	if err != nil {
		appState.App.Err("%v %v", "Cant create reservation", err.Error())
		return err
	}
	defer func() {
		err = errors.Join(err, stmt.Close())
	}()

	_, err = stmt.Exec(reservation.Item.ID,
		reservation.User.ID,
		reservation.User.ID,
		reservation.StartTime.UTC().Format(timeSet.OUT_TIME_FMT),
		reservation.EndTime.UTC().Format(timeSet.OUT_TIME_FMT),
		reservation.Status)
	if err != nil {
		appState.App.Debug("%v %v", "cant insert reservation", err.Error())
		return err
	}
	return nil
}

func UpdateReservationStatus(reservation models.Reservation, status string, w http.ResponseWriter, changingUserId int) {
	result, err := appState.App.Db.Exec(`UPDATE reservations SET r_status = $1,r_changeby_uid = $2 WHERE r_id = $3`, status, changingUserId, reservation.ID)
	if err != nil {
		appState.App.Err("updateReservationStatus %v", err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	numRows, err := result.RowsAffected()
	if err != nil || numRows != 1 {
		if err != nil {
			appState.App.Err("updateReservationStatus %v", err.Error())
		} else {
			appState.App.Err("Failed to update reservation status %v", err)
		}
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	response := fmt.Sprintf("id: %d", reservation.ID)
	w.Write([]byte(response))
}

func UpdateReservationsDate(reservation models.Reservation, field string, newTime time.Time, w http.ResponseWriter) error {
	if field != "r_end_time" && field != "r_start_time" {
		appState.App.Err("Wrong parameter used in method updateReservationsDate %v", field)
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return fmt.Errorf("wrong parameter used in method updateReservationsDate")
	}
	newTimeFormated := newTime.Format(timeSet.OUT_TIME_FMT)
	query := fmt.Sprintf(`UPDATE reservations SET %v = $1,r_changeby_uid = $2 WHERE r_id = $3`, field)
	result, err := appState.App.Db.Exec(query, newTimeFormated, reservation.User.ID, reservation.ID)
	if err != nil {
		appState.App.Err("updateReservationEndDate %v", err.Error())
		http.Error(w, "Can't update reservation ", http.StatusInternalServerError)
		return err
	}
	numRows, err := result.RowsAffected()
	if err != nil || numRows != 1 {
		if err != nil {
			appState.App.Err("updateReservationEndDate %v", err.Error())
		} else {
			appState.App.Err("Failed to update reservation end time %v", err)
		}
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return err
	}
	appState.App.Debug("Successfuly updated reservation %v to %v", field, newTime.Format(timeSet.OUT_TIME_FMT))
	return nil
}

func GetReservationHistory(reservationID int) ([]models.ReservationAudit, error) {
	udb := appState.App.Db.Unsafe()
	var history []models.ReservationAudit
	rows, err := udb.Queryx("SELECT ra.*,u.u_username FROM reservation_audit ra JOIN users u ON ra.ra_user_id = u.u_id WHERE ra_reservation_id = $1 ORDER BY ra_change_date", reservationID)
	if err != nil {
		appState.App.Err("%v %v", "Scanning history", err.Error())
		return nil, err
	}
	for rows.Next() {
		var audit models.ReservationAudit
		var t models.TmpReservationAudit
		err := rows.StructScan(&t)
		if err != nil {
			appState.App.Err("%v %v", "Scanning history", err.Error())
			return nil, err
		}
		//	work around sqlx to better handle embedded structures and JOINs
		audit = t.ReservationAudit
		audit.User = t.User
		//  TODO: update timestamps to localtime
		audit.ChangeDate = audit.ChangeDate.In(timeSet.LOCATION)
		history = append(history, audit)
	}
	return history, nil
}
