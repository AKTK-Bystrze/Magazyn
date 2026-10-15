package types

// User represents an authenticated user identity.
type User struct {
	ID    string
	Email string
}

// LoginRequest contains the user's email address to initiate magic link authentication.
type LoginRequest struct {
	Email string `json:"email"`
}

// LoginResponse indicates the outcome of initiating login.
type LoginResponse struct {
	Message string `json:"message"`
}

// SessionResponse represents the current session details returned to the frontend.
type SessionResponse struct {
	UserID        string `json:"userId"`
	Email         string `json:"email"`
	Username      string `json:"username"`
	Role          string `json:"role"`
	CreditBalance int32  `json:"creditBalance"`
	IsEnabled     bool   `json:"isEnabled"`
	ExpiresAt     string `json:"expiresAt"`
}

// LogoutResponse indicates the outcome of logging out.
type LogoutResponse struct {
	Message string `json:"message"`
}
