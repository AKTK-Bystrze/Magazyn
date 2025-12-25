package types

// User represents the authenticated user's identity
// It decouples the domain from specific authentication provider types (e.g., gotrue)
type User struct {
	ID    string
	Email string
}

// Session represents an active user session
type Session struct {
	AccessToken string
	User        User
}

// LoginRequest represents the payload for initiating login
type LoginRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// LoginResponse represents the success message after sending magic link
type LoginResponse struct {
	Message string `json:"message"`
}

// VerifyOTPRequest represents the payload for verifying OTP
type VerifyOTPRequest struct {
	Email string `json:"email" validate:"required,email"`
	Token string `json:"token" validate:"required"`
	Type  string `json:"type" validate:"required"`
}

// SessionResponse defines the structure for session data returned to the client
type SessionResponse struct {
	UserID        string `json:"userId"`
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

// MagicLink constants
type OTPType string

const (
	MagicLink OTPType = "magiclink"
	// Add other types as needed
)
