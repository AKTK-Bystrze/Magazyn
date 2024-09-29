package db

import (
	"boxTest/common/consts"
	"boxTest/common/helpers"
)

func execSQLiteQueryInContainer(containerName, dbFilePath, query string) string {
	res := helpers.RunCommand(false, "docker", "exec", containerName, "sqlite3", dbFilePath, query)
	return res
}

func GetReservations() string {
	query := "SELECT * FROM reservations;"
	return execSQLiteQueryInContainer(consts.TEST_APP_NAME, consts.TEST_DB_PATH, query)
}
