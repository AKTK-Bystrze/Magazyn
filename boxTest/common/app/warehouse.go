package app

import (
	"boxTest/common/consts"
	"boxTest/common/httpClient"
	"io/ioutil"
	"log"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

var (
	URL_search       = "/warehouse/user/search"
	URL_reserve      = "/warehouse/user/reserve"
	URL_dashboard    = "/users/user/dashboard"
	URL_reservations = "/warehouse/admin/reservations"
	URL_setStatus    = "/warehouse/admin/setStatus"
)

type Item struct {
	ID          string
	Name        string
	Description string
	Type        string
}

type Reservation struct {
	ID          int       `json:"id"`
	ItemID      int       `json:"item_id"`
	UserID      int       `json:"user_id"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	ChangeByUID int       `json:"change_by_uid"`
}

type ReservationAudit struct {
	ID            int       `json:"id"`
	ReservationID int       `json:"reservation_id"`
	UserID        int       `json:"user_id"`
	Status        string    `json:"status"`
	ChangeDate    time.Time `json:"change_date"`
}

func GetAvaiableItems(timeStart time.Time, timeStop time.Time) []Item {
	resp := httpClient.PostFormRequest(consts.Localhost+URL_search,
		url.Values{
			"start_time": {timeStart.Format(consts.TIME_FORMAT)},
			"end_time":   {timeStop.Format(consts.TIME_FORMAT)},
		})
	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)

	// Load the HTML document from the response body
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(string(body)))
	if err != nil {
		log.Fatalf("Failed to load HTML document: %v", err)
	}
	var availableItems []Item
	itemList := doc.Find("#item-list")
	if itemList.Length() == 0 {
		log.Fatalf("No element found with ID #item-list.")
	} else {
		itemList.Find(".list-group-item").Each(func(i int, s *goquery.Selection) {
			name := s.Find("h4.mb-1").Text()
			description := s.Find("p.mb-1").Eq(0).Text()
			id := s.Find("p.mb-1").Eq(1).Text()
			itemType := s.Find("p.mb-1").Eq(2).Text()
			availableItems = append(availableItems, Item{
				ID:          extractValue(id),
				Name:        name,
				Description: description,
				Type:        extractValue(itemType),
			})
		})
	}
	return availableItems
}

func extractValue(text string) string {
	return strings.TrimSpace(strings.Split(text, ":")[1])
}

func ReserveItem(itemID string, timeStart time.Time, timeStop time.Time) {
	httpClient.PostFormRequest(consts.Localhost+URL_reserve,
		url.Values{
			"start_time": {timeStart.Format(consts.TIME_FORMAT)},
			"end_time":   {timeStop.Format(consts.TIME_FORMAT)},
			"item_id":    {itemID},
		})
}

func Dashboard() {
	httpClient.GetRequest(consts.Localhost + URL_dashboard)
}

func SearchItem(item string) {
	// httpClient.PostFormRequest(URL_search)
}

func ReservationExists(reservations []Reservation, startTime, endTime time.Time, itemID string, user consts.User) bool {
	id, _ := strconv.Atoi(itemID)
	for _, reservation := range reservations {
		loc := time.UTC
		rst := reservation.StartTime.In(loc)
		rst = rst.Truncate(time.Minute)
		st := startTime.In(loc)
		st = st.Truncate(time.Minute)
		ret := reservation.EndTime.In(loc)
		ret = ret.Truncate(time.Minute)
		et := endTime.In(loc)
		et = et.Truncate(time.Minute)
		// log.Printf("r%v - %v\n t%v - %v", rst, st, ret, et)
		if rst.Equal(st) && ret.Equal(et) && reservation.ItemID == id && reservation.Status == consts.PENDING && reservation.UserID == int(user.ID) {
			return true
		}
	}
	return false
}

func SetReservationStatus(reservationId int, status string) {
	//call endpoint
}

func Reservations() {
	httpClient.GetRequest(consts.Localhost + URL_reservations)
}

func ChangeReservationStatus(reservationId int, itemId int, status string) {
	httpClient.PostFormRequest(consts.Localhost+URL_setStatus, url.Values{ //405 Method Not Allowed 405
		"reservation_id": {strconv.Itoa(reservationId)},
		"url":            {URL_setStatus},
		"item_id":        {strconv.Itoa(itemId)},
		"status":         {status},
	})
}
