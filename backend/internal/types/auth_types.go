package types

type User struct {
	ID    string
	Email string
}
type Session struct {
	AccessToken string
	User        User
}
type LoginRequest struct {
	Email string `json:"email" validate:"required,email"`
}
type LoginResponse struct {
	Message string `json:"message"`
}
type SessionResponse struct {
	UserID        string `json:"userId"`
	Email         string `json:"email"`
	Username      string `json:"username"`
	Role          string `json:"role"`
	CreditBalance int32  `json:"creditBalance"`
	IsEnabled     bool   `json:"isEnabled"`
	ExpiresAt     string `json:"expiresAt"`
}
type LogoutResponse struct {
	Message string `json:"message"`
}
