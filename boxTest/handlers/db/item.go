package db

import (
	"boxTest/handlers/app"
	"boxTest/env"
	"fmt"
	"strings"
)

func GetAvailableItems(startTime, endTime string) []app.Item {
	query := "SELECT i_id, i_name, i_description, i_status, i_type FROM items " +
		"WHERE i_id NOT IN (SELECT r_item_id FROM reservations WHERE r_start_time < ? AND r_end_time > ? AND r_status != 'denied') " +
		"AND i_status = 'ok';"
	itemsString := execSQLiteQueryInContainer(env.TEST_APP_NAME, env.DB_PATH_IN_CONTAINER, fmt.Sprintf(query, startTime, endTime))
	return parseToItemList(itemsString)
}

func parseToItem(itemString string) app.Item {
	var item app.Item
	fmt.Sscanf(itemString, "%d|%s|%s|%s", &item.ID, &item.Name, &item.Description, &item.Type)
	return item
}

func parseToItemList(itemsString string) []app.Item {
	var items []app.Item
	rows := strings.Split(strings.TrimSpace(itemsString), "\n")
	for _, row := range rows {
		item := parseToItem(row)
		items = append(items, item)
	}
	return items
}
