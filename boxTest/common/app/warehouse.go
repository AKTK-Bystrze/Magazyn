package app

import (
	"boxTest/common/consts"
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

	COST_KAYAK       = 4
	KAYAK            = "kayak"
	COST_PADDLE      = 2
	PADDLE           = "paddle"
	COST_LIFE_JACKET = 1
	LIFE_JACKET      = "life_jacket"
	COST_HELMET      = 1
	HELMET           = "helmet"
	COST_JACKET      = 1
	JACKET           = "jacket"
	COST_SPRAY_SKIRT = 1
	SPRAY_SKIRT      = "spray_skirt"
	COST_ROPE        = 1
	ROPE             = "rope"
	COST_WETSUIT     = 1
	WETSUIT          = "wetsuit"
)

func (uc UserClient) GoToReservations() {
	uc.GetRequest(consts.Localhost + URL_reservations)
}

func (uc UserClient) ChangeReservationStatus(reservationId int, itemId int, status string) {
	uc.PutRequest(consts.Localhost+URL_setStatus, url.Values{
		"reservation_id": {strconv.Itoa(reservationId)},
		"url":            {URL_setStatus},
		"item_id":        {strconv.Itoa(itemId)},
		"status":         {status},
	})
}

func (uc UserClient) GetAvaiableItems(timeStart time.Time, timeStop time.Time) []Item {
	resp := uc.PostFormRequest(consts.Localhost+URL_search,
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
			id = extractValue(id)
			id_int, err := strconv.Atoi(id)
			if err != nil {
				log.Fatalf("GetAvaiableItems: cant parse id from %v", id)
			}
			itemType := s.Find("p.mb-1").Eq(2).Text()
			availableItems = append(availableItems, Item{
				ID:          id_int,
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

func (uc UserClient) ReserveItem(itemID int, timeStart time.Time, timeStop time.Time) {
	uc.PostFormRequest(consts.Localhost+URL_reserve,
		url.Values{
			"start_time": {timeStart.Format(consts.TIME_FORMAT)},
			"end_time":   {timeStop.Format(consts.TIME_FORMAT)},
			"item_id":    {strconv.Itoa(itemID)},
		})
}

func (uc UserClient) Dashboard() {
	uc.GetRequest(consts.Localhost + URL_dashboard)
}

func ReservationExists(reservations []Reservation, startTime, endTime time.Time, itemID int, user User) bool {
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
		if rst.Equal(st) && ret.Equal(et) && reservation.ItemID == itemID && reservation.Status == PENDING && reservation.UserID == int(user.ID) {
			return true
		}
	}
	return false
}
