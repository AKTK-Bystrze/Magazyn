package types

// UserResponse represents full user profile information returned by administrative endpoints.
type UserResponse struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	Username      string  `json:"username"`
	Role          string  `json:"role"`
	CreditBalance int32   `json:"credit_balance"`
	IsEnabled     bool    `json:"is_enabled"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     *string `json:"updated_at,omitempty"`
}

// PublicUserResponse represents public user information visible across the community.
type PublicUserResponse struct {
	ID            string `json:"id"`
	Username      string `json:"username"`
	CreditBalance int32  `json:"credit_balance"`
}

// PublicUserListResponse represents a paginated list of public user profiles.
type PublicUserListResponse struct {
	Users      []PublicUserResponse `json:"users"`
	Pagination Pagination           `json:"pagination"`
}

// UserListResponse represents a paginated list of full user profiles for administrators.
type UserListResponse struct {
	Users      []UserResponse `json:"users"`
	Pagination Pagination     `json:"pagination"`
}

// Pagination represents pagination metadata included in list responses.
type Pagination struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	TotalItems int `json:"total_items"`
	TotalPages int `json:"total_pages"`
}

// CreateUserRequest contains fields required to register a new user account.
type CreateUserRequest struct {
	Email         string `json:"email"`
	Username      string `json:"username"`
	Role          string `json:"role"`
	CreditBalance *int32 `json:"credit_balance"`
	IsEnabled     *bool  `json:"is_enabled"`
}

// UpdateUserRequest contains optional fields to update an existing user account.
type UpdateUserRequest struct {
	Email         *string `json:"email"`
	Role          *string `json:"role"`
	CreditBalance *int32  `json:"credit_balance"`
	IsEnabled     *bool   `json:"is_enabled"`
}

// BulkAdjustCreditsRequest specifies user IDs and credit adjustments applied by an administrator.
type BulkAdjustCreditsRequest struct {
	UserIDs     []string `json:"user_ids"`
	Amount      int32    `json:"amount"`
	Reason      string   `json:"reason"`
	Description string   `json:"description"`
}
