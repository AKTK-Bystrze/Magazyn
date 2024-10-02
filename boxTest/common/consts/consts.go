package consts

// enviroment
const (
	TEST_APP_NAME    = "test_app"
	TEST_DB_PATH     = "/app/magazyn.db"
	SMTP_SERVER_NAME = "test_server"
	DOCKERFILE_PATH  = "."
	NETWORK_NO_WEB   = "test_network_no_web"
	SMTP_PORT        = "3465"
	COOKIE_KEY       = ""
)

const (
	Localhost      = "http://localhost:8080"
	CookeName      = "bystrzeMagazyn"
	TIME_FORMAT    = "2006-01-02T15:04"
	DB_TIME_FORMAT = "2006-01-02 15:04:05"
)

const (
	KayakB1 = "B1"
)

var ITMEMS = []string{KayakB1}

const (
	UserName1      = "kursant1"
	AdminName1     = "admin1"
	SuperAdminName = "superAdmin"
	NinjaName      = "ninja"

	DENIED   = "denied"
	RETURNED = "returned"
	APPROVED = "approved"
	PENDING  = "pending"
	RENTED   = "rented"
)

var RESERVATION_STATUSES = []string{PENDING, APPROVED, RENTED, RETURNED, DENIED}

type User struct {
	ID      int64  `db:"u_id"`
	Name    string `db:"u_username"`
	Email   string `db:"u_email"`
	Role    string `db:"u_role"`
	Credits int    `db:"u_credits"`
}

var USERS = []User{
	{ID: 0, Name: "kursant2", Role: "user", Email: "kursant2@bystrzeEmail.pl", Credits: 10},
	{ID: 1, Name: "kursant1", Role: "user", Email: "kursant1@bystrzeEmail.com", Credits: 200},
	{ID: 2, Name: "admin1", Role: "admin", Email: "admin1@bystrzeEmail.com", Credits: 200},
	{ID: 3, Name: "admin2", Role: "admin ninja", Email: "admin2@bystrzeEmail.com", Credits: 200},
	{ID: 4, Name: "ninja", Role: "ninja", Email: "ninja@bystrzeEmail.com", Credits: 10},
	{ID: 5, Name: "superAdmin", Role: "superAdmin admin ninja", Email: "superAdmin@bystrzeEmail.com", Credits: 10},
}

var USERS_MAP = map[string]User{
	"kursant2":   {ID: 0, Name: "kursant2", Role: "user", Email: "kursant2@bystrzeEmail.pl", Credits: 10},
	"kursant1":   {ID: 1, Name: "kursant1", Role: "user", Email: "kursant1@bystrzeEmail.com", Credits: 200},
	"admin1":     {ID: 2, Name: "admin1", Role: "admin", Email: "admin1@bystrzeEmail.com", Credits: 200},
	"admin2":     {ID: 3, Name: "admin2", Role: "admin ninja", Email: "admin2@bystrzeEmail.com", Credits: 200},
	"ninja":      {ID: 4, Name: "ninja", Role: "ninja", Email: "ninja@bystrzeEmail.com", Credits: 10},
	"superAdmin": {ID: 5, Name: "superAdmin", Role: "superAdmin admin ninja", Email: "superAdmin@bystrzeEmail.com", Credits: 10},
}
