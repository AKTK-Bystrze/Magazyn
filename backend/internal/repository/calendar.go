package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

type CalendarRepository interface {
	// GetEquipmentForCalendar retrieves equipment items for calendar view, optionally filtered by ID
	GetEquipmentForCalendar(ctx context.Context, equipmentID *string) ([]types.PublicEquipmentSelect, error)
	// GetReservationsInDateRange retrieves all reservations that overlap with the given date range.
	// If equipmentID is provided, only reservations for that equipment are returned.
	// Only includes PENDING and RENTED reservations (active reservations).
	GetReservationsInDateRange(ctx context.Context, startDate string, endDate string, equipmentID *string) ([]types.PublicReservationsSelect, error)
}
