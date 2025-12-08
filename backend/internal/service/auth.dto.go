package service

// LoginRequest represents the payload for initiating login
type LoginRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// LoginResponse represents the success message after sending magic link
type LoginResponse struct {
	Message string `json:"message"`
}

// SessionResponse combines Auth user data with Profile data
type SessionResponse struct {
	UserId        string `json:"userId"`
	Email         string `json:"email"`
	Username      string `json:"username"`
	Role          string `json:"role"`
	CreditBalance int32  `json:"creditBalance"`
	IsEnabled     bool   `json:"isEnabled"`
	ExpiresAt     string `json:"expiresAt"`
}

// LogoutResponse represents the success message after logout
type LogoutResponse struct {
	Message string `json:"message"`
}
