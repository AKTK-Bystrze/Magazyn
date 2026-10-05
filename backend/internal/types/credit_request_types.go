package types

// CreditRequestStatus represents the review workflow state of a credit request.
type CreditRequestStatus string

// Credit request workflow status constants.
const (
	// CreditRequestStatusAwaiting indicates request has been submitted and awaits review.
	CreditRequestStatusAwaiting CreditRequestStatus = "awaiting"
	// CreditRequestStatusApproved indicates request was approved as submitted.
	CreditRequestStatusApproved CreditRequestStatus = "approved"
	// CreditRequestStatusRejected indicates request was rejected.
	CreditRequestStatusRejected CreditRequestStatus = "rejected"
	// CreditRequestStatusApprovedWithChanges indicates request was approved with modified credit values.
	CreditRequestStatusApprovedWithChanges CreditRequestStatus = "approved with changes"
)

// CreditRequestDTO represents a credit grant request for helping community members.
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
	// Helpers lists user IDs who assisted with the task.
	Helpers []string `json:"helpers"`
}

// CreateCreditRequestDTO contains fields required to submit a new credit request.
type CreateCreditRequestDTO struct {
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	CreditsValue int32    `json:"credits_value"`
	UserHelpedID string   `json:"user_helped_id"`
	Helpers      []string `json:"helpers"`
}

// UpdateCreditRequestDTO contains optional fields for modifying a credit request before review.
type UpdateCreditRequestDTO struct {
	Title        *string  `json:"title"`
	Description  *string  `json:"description"`
	CreditsValue *int32   `json:"credits_value"`
	UserHelpedID *string  `json:"user_helped_id"`
	Helpers      []string `json:"helpers"`
}

// ReviewCreditRequestDTO contains the decision and adjustments when reviewing a credit request.
type ReviewCreditRequestDTO struct {
	CreditsValue *int32              `json:"credits_value"`
	Helpers      []string            `json:"helpers"`
	Status       CreditRequestStatus `json:"status"`
}

// UserCreditLeaderboardItem represents a user and their accumulated credit earnings.
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
