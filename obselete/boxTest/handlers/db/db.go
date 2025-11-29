package db

import "boxTest/handlers/app"

var USERS_MAP = map[string]app.User{
	"kursant2":   {ID: 1, Name: "kursant2", Role: "user", Email: "kursant2@bystrzeEmail.pl", Credits: 10},
	"kursant1":   {ID: 2, Name: "kursant1", Role: "user", Email: "kursant1@bystrzeEmail.com", Credits: 200},
	"admin1":     {ID: 3, Name: "admin1", Role: "admin", Email: "admin1@bystrzeEmail.com", Credits: 200},
	"admin2":     {ID: 4, Name: "admin2", Role: "admin ninja", Email: "admin2@bystrzeEmail.com", Credits: 200},
	"ninja":      {ID: 5, Name: "ninja", Role: "ninja", Email: "ninja@bystrzeEmail.com", Credits: 10},
	"superAdmin": {ID: 6, Name: "superAdmin", Role: "superAdmin admin ninja", Email: "superAdmin@bystrzeEmail.com", Credits: 10},
}
