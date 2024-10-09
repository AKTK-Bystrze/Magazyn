package db

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"fmt"
	"log"
	"strconv"
	"strings"
)

var USERS_MAP = map[string]app.User{
	"kursant2":   {ID: 0, Name: "kursant2", Role: "user", Email: "kursant2@bystrzeEmail.pl", Credits: 10},
	"kursant1":   {ID: 1, Name: "kursant1", Role: "user", Email: "kursant1@bystrzeEmail.com", Credits: 200},
	"admin1":     {ID: 2, Name: "admin1", Role: "admin", Email: "admin1@bystrzeEmail.com", Credits: 200},
	"admin2":     {ID: 3, Name: "admin2", Role: "admin ninja", Email: "admin2@bystrzeEmail.com", Credits: 200},
	"ninja":      {ID: 4, Name: "ninja", Role: "ninja", Email: "ninja@bystrzeEmail.com", Credits: 10},
	"superAdmin": {ID: 5, Name: "superAdmin", Role: "superAdmin admin ninja", Email: "superAdmin@bystrzeEmail.com", Credits: 10},
}

func GetUserById(id int) app.User {
	query := fmt.Sprintf("SELECT * FROM users WHERE u_id = %d;", id)
	userString := execSQLiteQueryInContainer(consts.TEST_APP_NAME, consts.TEST_DB_PATH, query)
	return parseToUser(userString)
}

func parseToUser(record string) app.User {
	fields := strings.Split(record, "|")
	if len(fields) != 6 {
		log.Fatalf("unexpected output format for users: %s", record)
	}
	var u app.User
	var err error
	if u.ID, err = strconv.ParseInt(fields[0], 10, 64); err != nil {
		log.Fatalf("U_ID arsing error: %s", record)
	}
	u.Name = strings.TrimSpace(fields[1])
	u.Email = strings.TrimSpace(fields[3])
	u.Role = fields[4]
	if u.Credits, err = parseInt(fields[5]); err != nil {
		log.Fatalf("U_Credits Parsing error: %s", record)
	}
	return u
}
