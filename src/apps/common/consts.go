package common

const (
	COOKIE_VALIDITY_TIME_HOURS = 6
	SEND_COOKIE_TO_STDOUT      = false
	TOKEN_LENGTH               = 10
	COOKIE_KEY_LENGTH          = 16

	APP_NAME      = "E-magazyn Bystrze"
	SESSION_NAME  = "magazynBystrze"
	DATABASE_NAME = "magazyn.db"
	DATABASE_PATH = "./magazyn.db"
)

const (
	ROLE_ADMIN      = "admin"
	ROLE_NINJA      = "ninja"
	ROLE_USER       = "user"
	ROLE_SUPERADMIN = "superAdmin"
)

var ROLES = []string{ROLE_ADMIN, ROLE_NINJA, ROLE_USER, ROLE_SUPERADMIN}
