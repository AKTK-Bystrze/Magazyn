package db

import (
	"boxTest/env"
)

func execSQLiteQueryInContainer(containerName, dbFilePath, query string) string {
	res := env.RunCommand(false, "docker", "exec", containerName, "sqlite3", dbFilePath, query)
	return res
}
