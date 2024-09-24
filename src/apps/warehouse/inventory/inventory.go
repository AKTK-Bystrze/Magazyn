package inventory

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/email/appState"
	"bystrze/apps/warehouse/items"
	"encoding/json"
	"net/http"
)

func Inventory(w http.ResponseWriter, r *http.Request) {
	itemsWithReservations, err := items.GetItems(models.QueryConfigItems{WithCurReservation: false})
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	var items []models.Item
	for _, record := range itemsWithReservations {
		items = append(items, record.Item)
	}
	json, err := json.Marshal(items)
	if err != nil {
		appState.App.Err("%v Error parsing items to json %v", session.GetSessionUserName(r), err)
		return
	}
	appState.App.RenderTemplate(w, r, "inventory.html", &struct {
		Json string
		apps.TemplateData
	}{
		Json: string(json),
	})
}
