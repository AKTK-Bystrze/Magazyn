package types

// CreditRequestStatus represents the state of a credit request.
type CreditRequestStatus string

const (
	CreditRequestStatusAwaiting            CreditRequestStatus = "awaiting"
	CreditRequestStatusApproved            CreditRequestStatus = "approved"
	CreditRequestStatusRejected            CreditRequestStatus = "rejected"
	CreditRequestStatusApprovedWithChanges CreditRequestStatus = "approved with changes"
)

// CreditRequestDTO represents a credit request returned by the API.
type CreditRequestDTO struct {
	ID           string              `json:"id"`
	Title        string              `json:"title"`
	Description  string              `json:"description"`
	CreditsValue int32               `json:"credits_value"`
	RequestorID  *string             `json:"requestor_id"`
	UserHelpedID *string             `json:"user_helped_id"`
	Status       CreditRequestStatus `json:"status"`
	CreatedAt    string              `json:"created_at"`
	UpdatedAt    string              `json:"updated_at"`
	Helpers      []string            `json:"helpers"` // list of user IDs
}

// CreateCreditRequestDTO represents the payload for creating a credit request.
type CreateCreditRequestDTO struct {
	Title        string   `json:"title" binding:"required"`
	Description  string   `json:"description"`
	CreditsValue int32    `json:"credits_value" binding:"required,gt=0"`
	UserHelpedID string   `json:"user_helped_id" binding:"required"`
	Helpers      []string `json:"helpers" binding:"required,min=1"`
}

// UpdateCreditRequestDTO represents the payload for updating a credit request.
type UpdateCreditRequestDTO struct {
	Title        *string  `json:"title"`
	Description  *string  `json:"description"`
	CreditsValue *int32   `json:"credits_value"`
	UserHelpedID *string  `json:"user_helped_id"`
	Helpers      []string `json:"helpers"`
}

// ReviewCreditRequestDTO represents the payload for an admin reviewing a credit request.
type ReviewCreditRequestDTO struct {
	CreditsValue *int32              `json:"credits_value"`
	Helpers      []string            `json:"helpers"`
	Status       CreditRequestStatus `json:"status" binding:"required"` // approved, rejected, approved with changes
}

// UserCreditLeaderboardItem represents a user's standing in the credit leaderboard.
type UserCreditLeaderboardItem struct {
	UserID       string `json:"user_id"`
	Username     string `json:"username"`
	TotalCredits int32  `json:"total_credits"`
}

// CreditRequestListResponse represents a paginated list of credit requests.
type CreditRequestListResponse struct {
	Requests   []CreditRequestDTO `json:"requests"`
	Pagination Pagination         `json:"pagination"`
}
