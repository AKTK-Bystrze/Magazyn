package types

// CreditHistoryItemDTO represents a single credit transaction record with enriched user data.
type CreditHistoryItemDTO struct {
	ID             string  `json:"id"`
	UserID         string  `json:"user_id"`
	Username       string  `json:"username"`
	Amount         int32   `json:"amount"`
	Reason         string  `json:"reason"`
	Description    *string `json:"description"`
	ReservationID  *string `json:"reservation_id"`
	AuthorID       *string `json:"author_id"`
	AuthorUsername *string `json:"author_username"`
	CreatedAt      string  `json:"created_at"`
}

// CreditHistoryResponse represents the paginated credit history response.
type CreditHistoryResponse struct {
	CreditHistory  []CreditHistoryItemDTO `json:"credit_history"`
	Pagination     Pagination             `json:"pagination"`
	CurrentBalance int32                  `json:"current_balance"`
}

// GetCreditHistoryQuery encapsulates query parameters for credit history retrieval.
type GetCreditHistoryQuery struct {
	Page    int
	PerPage int
	UserID  *string
}
