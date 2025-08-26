package db

import (
	"boxTest/env"
	"boxTest/handlers/app"
	"database/sql"
	"log"
)

// GetUserById retrieves a user by their ID from the database.
func GetUserById(id int) app.User {
	db := env.DB
	query := "SELECT u_id, u_username, u_email, u_role, u_credits FROM users WHERE u_id = $1"
	row := db.QueryRow(query, id)

	var u app.User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Credits)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Fatalf("no user found with ID %d", id)
		}
		log.Fatalf("error scanning row: %v", err)
	}

	return u
}
