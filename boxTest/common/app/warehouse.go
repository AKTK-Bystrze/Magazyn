package app

import (
	"boxTest/common/consts"
	"boxTest/common/httpClient"
	"io/ioutil"
	"log"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

var (
	URL_search  = "/warehouse/user/search"
	URL_reserve = "/warehouse/user/reserve"
)

type Item struct {
	ID          string
	Name        string
	Description string
	Type        string
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
		log.Println("No element found with ID #item-list.")
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

func SearchItem(item string) {
	// httpClient.PostFormRequest(URL_search)
}
