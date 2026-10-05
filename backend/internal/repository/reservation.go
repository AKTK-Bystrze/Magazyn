package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

type ReservationRepository interface {
	GetReservations(ctx context.Context, query types.ReservationListQuery) ([]types.ReservationListItem, int64, error)
	// GetReservationByID retrieves a single reservation with full details by ID
	GetReservationByID(ctx context.Context, id string) (*types.ReservationDetail, error)
	// CreateReservationsAtomic creates multiple reservations and deducts credits atomically using DB RPC
	CreateReservationsAtomic(ctx context.Context, userID string, totalCost int32, isFree bool, createdByUserID string, reservations []types.CreateReservationItem) ([]string, int32, error)
	// UpdateReservation updates an existing reservation
	// changedByUserID is used for audit trail - tracks who made the change
	UpdateReservation(ctx context.Context, id string, reservation types.PublicReservationsUpdate, changedByUserID string) (*types.PublicReservationsSelect, error)
	// BulkUpdateStatusAtomic updates the status of multiple reservations and handles refunds atomically via RPC
	BulkUpdateStatusAtomic(ctx context.Context, ids []string, status string, adminID string) (*types.BulkStatusUpdateResponse, error)
	// GetOverlappingReservations checks if there are any approved/pending reservations for the given equipment in the date range.
	// Used for availability checking.
	GetOverlappingReservations(ctx context.Context, equipmentID string, startDate string, endDate string, excludeReservationID *string) ([]types.PublicReservationsSelect, error)
	// GetDashboardStats retrieves summary statistics for the admin dashboard
	GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error)
	// RefundCredits refunds credits to the user for a cancelled reservation
	RefundCredits(ctx context.Context, reservationID string, amount int32) error
	// ModifyReservationDatesWithCredits updates reservation dates and adjusts credits atomically
	// Returns updated reservation with credit adjustment details
	ModifyReservationDatesWithCredits(ctx context.Context, reservationID string, changedByUserID string, newStartDate string, newEndDate string) (*types.ModifyDatesResponse, error)
}
