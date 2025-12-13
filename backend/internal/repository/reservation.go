package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

// ReservationRepository defines the interface for reservation data access
type ReservationRepository interface {
	// GetReservations retrieves a paginated list of reservations based on filters
	GetReservations(ctx context.Context, query types.ReservationListQuery) ([]types.ReservationListItem, int64, error)

	// GetReservationByID retrieves a single reservation with full details by ID
	GetReservationByID(ctx context.Context, id string) (*types.ReservationDetail, error)

	// CreateReservation creates a new reservation record
	// Note: Providing a transaction object/context might be needed for atomicity with credits,
	// but for now we define the basic operation.
	CreateReservation(ctx context.Context, reservation types.PublicReservationsInsert) (*types.PublicReservationsSelect, error)

	// CreateReservationsAtomic creates multiple reservations and deducts credits atomically using DB RPC
	CreateReservationsAtomic(ctx context.Context, userID string, totalCost int32, reservations []types.CreateReservationItem) ([]string, int32, error)

	// UpdateReservation updates an existing reservation
	UpdateReservation(ctx context.Context, id string, reservation types.PublicReservationsUpdate) (*types.PublicReservationsSelect, error)

	// BulkUpdateReservations updates the status of multiple reservations
	BulkUpdateReservations(ctx context.Context, ids []string, status string) error

	// GetOverlappingReservations checks if there are any approved/pending reservations for the given equipment in the date range.
	// Used for availability checking.
	GetOverlappingReservations(ctx context.Context, equipmentID string, startDate string, endDate string, excludeReservationID *string) ([]types.PublicReservationsSelect, error)

	// GetDashboardStats retrieves summary statistics for the admin dashboard
	GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error)

	// GetReservationsInRange retrieves coupons that overlap with the specified date range.
	// Optionally filters by equipmentID if provided.
	// rangeStart and rangeEnd should be in YYYY-MM-DD format.
	GetReservationsInRange(ctx context.Context, rangeStart string, rangeEnd string, equipmentID *string) ([]types.PublicReservationsSelect, error)

	// RefundCredits refunds credits to the user for a cancelled reservation
	RefundCredits(ctx context.Context, reservationID string, amount int32) error
}
