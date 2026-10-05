package types

type CreditRequestStatus string

const (
	CreditRequestStatusAwaiting            CreditRequestStatus = "awaiting"
	CreditRequestStatusApproved            CreditRequestStatus = "approved"
	CreditRequestStatusRejected            CreditRequestStatus = "rejected"
	CreditRequestStatusApprovedWithChanges CreditRequestStatus = "approved with changes"
)

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
type CreateCreditRequestDTO struct {
	Title        string   `json:"title" binding:"required"`
	Description  string   `json:"description"`
	CreditsValue int32    `json:"credits_value" binding:"required,gt=0"`
	UserHelpedID string   `json:"user_helped_id" binding:"required"`
	Helpers      []string `json:"helpers" binding:"required,min=1"`
}
type UpdateCreditRequestDTO struct {
	Title        *string  `json:"title"`
	Description  *string  `json:"description"`
	CreditsValue *int32   `json:"credits_value"`
	UserHelpedID *string  `json:"user_helped_id"`
	Helpers      []string `json:"helpers"`
}
type ReviewCreditRequestDTO struct {
	CreditsValue *int32              `json:"credits_value"`
	Helpers      []string            `json:"helpers"`
	Status       CreditRequestStatus `json:"status" binding:"required"` // approved, rejected, approved with changes
}
type UserCreditLeaderboardItem struct {
	UserID       string `json:"user_id"`
	Username     string `json:"username"`
	TotalCredits int32  `json:"total_credits"`
}
type CreditRequestListResponse struct {
	Requests   []CreditRequestDTO `json:"requests"`
	Pagination Pagination         `json:"pagination"`
}
