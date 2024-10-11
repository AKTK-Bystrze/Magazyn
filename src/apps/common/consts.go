package common

import "time"

var (
	DATABASE_PATH string
	DATABASE_NAME string

	LOCATION     *time.Location
	OUT_TIME_FMT = "2006-01-02 15:04:05"
	IN_TIME_FMT  = "2006-01-02T15:04"
)

const (
	ROLE_ADMIN      = "admin"
	ROLE_NINJA      = "ninja"
	ROLE_USER       = "user"
	ROLE_SUPERADMIN = "superAdmin"
)

var ROLES = []string{ROLE_ADMIN, ROLE_NINJA, ROLE_USER, ROLE_SUPERADMIN}
