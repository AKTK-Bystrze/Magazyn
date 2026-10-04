package types

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
type PublicUserResponse struct {
	ID            string `json:"id"`
	Username      string `json:"username"`
	CreditBalance int32  `json:"credit_balance"`
}
type PublicUserListResponse struct {
	Users      []PublicUserResponse `json:"users"`
	Pagination Pagination           `json:"pagination"`
}
type UserListResponse struct {
	Users      []UserResponse `json:"users"`
	Pagination Pagination     `json:"pagination"`
}
type Pagination struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	TotalItems int `json:"total_items"`
	TotalPages int `json:"total_pages"`
}
type CreateUserRequest struct {
	Email         string `json:"email" binding:"required,email"`
	Username      string `json:"username" binding:"required"`
	Role          string `json:"role" binding:"required,oneof=user admin super_admin"`
	CreditBalance *int32 `json:"credit_balance"`
	IsEnabled     *bool  `json:"is_enabled"`
}
type UpdateUserRequest struct {
	Email         *string `json:"email" binding:"omitempty,email"`
	Role          *string `json:"role" binding:"omitempty,oneof=user admin super_admin"`
	CreditBalance *int32  `json:"credit_balance" binding:"omitempty,min=0"`
	IsEnabled     *bool   `json:"is_enabled"`
}
type BulkAdjustCreditsRequest struct {
	UserIDs     []string `json:"user_ids" binding:"required,min=1"`
	Amount      int32    `json:"amount" binding:"required"`
	Reason      string   `json:"reason" binding:"required"`
	Description string   `json:"description"`
}
