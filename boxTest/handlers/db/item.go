package db

import (
	"boxTest/env"
	"boxTest/handlers/app"
	"errors"
	"fmt"
)

// GetAvailableItems retrieves items that are available within the provided time range.
func GetAvailableItems(startTime, endTime string) ([]app.Item, error) {
	db := env.DB
	// Parameterized query to prevent SQL injection
	query := `
		SELECT i_id, i_name, i_description, i_status, i_type 
		FROM items 
		WHERE i_id NOT IN (
			SELECT r_item_id 
			FROM reservations 
			WHERE r_start_time < $1 AND r_end_time > $2 
			AND r_status != 'denied'
		) AND i_status = 'ok';`

	// Execute the query with parameters
	rows, err := db.Query(query, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("error executing query: %v", err)
	}

	defer func() {
		err = errors.Join(err, rows.Close())
	}()

	// Parse the results into a slice of Item structs
	var items []app.Item
	for rows.Next() {
		var item app.Item
		if err := rows.Scan(&item.ID, &item.Name, &item.Description, &item.Status, &item.Type); err != nil {
			return nil, fmt.Errorf("error scanning row: %v", err)
		}
		items = append(items, item)
	}

	// Check for any errors encountered during iteration
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over rows: %v", err)
	}

	return items, nil
}
