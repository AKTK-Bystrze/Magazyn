package app

const (
	UserName1      = "kursant1"
	AdminName1     = "admin1"
	SuperAdminName = "superAdmin"
	NinjaName      = "ninja"
)

type User struct {
	ID      int64  `db:"u_id"`
	Name    string `db:"u_username"`
	Email   string `db:"u_email"`
	Role    string `db:"u_role"`
	Credits int    `db:"u_credits"`
}
