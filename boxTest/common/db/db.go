package db

import (
	"boxTest/common/helpers"
)

func execSQLiteQueryInContainer(containerName, dbFilePath, query string) string {
	res := helpers.RunCommand(false, "docker", "exec", containerName, "sqlite3", dbFilePath, query)
	return res
}
