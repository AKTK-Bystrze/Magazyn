package users

import (
	"bystrze/apps/common/models"
	"bystrze/apps/userManager/appState"
)

// Add a function to fetch admin users
func GetAdminUsers() ([]models.User, error) {
	query := `SELECT u_id, u_username, u_email FROM users WHERE u_role LIKE '%admin%'`
	rows, err := appState.App.Db.Queryx(query)
	if err != nil {
		appState.App.Err("Failed to fetch admin users: %v", err)
		return nil, err
	}
	defer func() {
    if err := rows.Close(); err != nil {
        appState.App.Err("Failed to close rows: %v", err)
    }
}()

	var admins []models.User
	for rows.Next() {
		var user models.User
		if err := rows.StructScan(&user); err != nil {
			appState.App.Err("Failed to scan admin user: %v", err)
			continue
		}
		//if admin has role of superAdmin but not has role of admin then skip
		if user.Role == "superAdmin" {
			continue
		}

		admins = append(admins, user)
	}
	return admins, nil
}