package types

// UserResponse represents the public user profile data returned by the API.
type UserResponse struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	Username      string  `json:"username"`
	Role          string  `json:"role"`
	CreditBalance int32   `json:"credit_balance"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     *string `json:"updated_at,omitempty"`
}

// UserListResponse contains a list of users and pagination metadata.
type UserListResponse struct {
	Users      []UserResponse `json:"users"`
	Pagination Pagination     `json:"pagination"`
}

// Pagination holds pagination metadata to be included in list responses.
type Pagination struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	TotalItems int `json:"total_items"`
	TotalPages int `json:"total_pages"`
}

// CreateUserRequest defines the structure for creating a new user via the API.
type CreateUserRequest struct {
	Email         string `json:"email" binding:"required,email"`
	Username      string `json:"username" binding:"required"`
	Role          string `json:"role" binding:"required,oneof=user admin super_admin"`
	CreditBalance *int32 `json:"credit_balance"`
}

// UpdateUserRequest defines the structure for updating an existing user's details.
type UpdateUserRequest struct {
	Email         *string `json:"email" binding:"omitempty,email"`
	Role          *string `json:"role" binding:"omitempty,oneof=user admin super_admin"`
	CreditBalance *int32  `json:"credit_balance" binding:"omitempty,min=0"`
}
