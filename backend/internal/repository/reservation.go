package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

// ReservationRepository defines the interface for reservation data access
type ReservationRepository interface {
	GetReservations(ctx context.Context, query types.ReservationListQuery) ([]types.ReservationListItem, int64, error)

	GetReservationByID(ctx context.Context, id string) (*types.ReservationDetail, error)

	CreateReservation(ctx context.Context, reservation types.PublicReservationsInsert) (*types.PublicReservationsSelect, error)

	CreateReservationsAtomic(ctx context.Context, userID string, totalCost int32, isFree bool, createdByUserID string, reservations []types.CreateReservationItem) ([]string, int32, error)

	UpdateReservation(ctx context.Context, id string, reservation types.PublicReservationsUpdate, changedByUserID string) (*types.PublicReservationsSelect, error)

	BulkUpdateReservations(ctx context.Context, ids []string, status string) error

	BulkUpdateStatusAtomic(ctx context.Context, ids []string, status string, adminID string) (*types.BulkStatusUpdateResponse, error)

	GetOverlappingReservations(ctx context.Context, equipmentID string, startDate string, endDate string, excludeReservationID *string) ([]types.PublicReservationsSelect, error)

	GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error)

	GetReservationsInRange(ctx context.Context, rangeStart string, rangeEnd string, equipmentID *string) ([]types.PublicReservationsSelect, error)

	RefundCredits(ctx context.Context, reservationID string, amount int32) error

	ModifyReservationDatesWithCredits(ctx context.Context, reservationID string, changedByUserID string, newStartDate string, newEndDate string) (*types.ModifyDatesResponse, error)
}
