package inventory

func Inventory(w http.ResponseWriter, r *http.Request) {
	itemsWithReservations, err := app.getItems(queryConfigItems{withCurReservation: false})
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	var items []structs.Item
	for _, record := range itemsWithReservations {
		items = append(items, record.Item)
	}
	json, err := json.Marshal(items)
	if err != nil {
		app.Err("%v Error parsing items to json %v", utils.GetUserName(r), err)
		return
	}
	app.renderTemplate(w, r, "inventory.html", &struct {
		Json string
		templateData
	}{
		Json: string(json),
	})
}
