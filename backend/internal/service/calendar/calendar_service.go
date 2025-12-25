package calendar

import (
	"context"
	"time"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
)

// ============================================================================
// Calendar Service Interface
// ============================================================================

// CalendarService defines operations for calendar and availability functionality
type CalendarService interface {
	// GetCalendarAvailability retrieves equipment availability for a date range
	GetCalendarAvailability(ctx context.Context, query types.CalendarAvailabilityQuery) (*types.CalendarAvailabilityResponse, error)
}

// ============================================================================
// Calendar Service Implementation
// ============================================================================

type calendarService struct {
	calendarRepo repository.CalendarRepository
	typeRepo     repository.EquipmentTypeRepository
}

// NewCalendarService creates a new instance of CalendarService
func NewCalendarService(calendarRepo repository.CalendarRepository, typeRepo repository.EquipmentTypeRepository) CalendarService {
	return &calendarService{
		calendarRepo: calendarRepo,
		typeRepo:     typeRepo,
	}
}

// GetCalendarAvailability builds a calendar grid showing equipment availability
func (s *calendarService) GetCalendarAvailability(ctx context.Context, query types.CalendarAvailabilityQuery) (*types.CalendarAvailabilityResponse, error) {
	logger.Infof(ctx, "GetCalendarAvailability - EquipmentID: %v, StartDate: %v, Days: %d", query.EquipmentID, query.StartDate, query.Days)

	// Set defaults
	startDate := time.Now().Format(constants.DateFormatISO)
	if query.StartDate != nil && *query.StartDate != "" {
		startDate = *query.StartDate
	}
	days := constants.CalendarDefaultDays
	if query.Days > 0 && query.Days <= constants.CalendarMaxDays {
		days = query.Days
	}

	// Parse start date and calculate end date
	start, err := time.Parse(constants.DateFormatISO, startDate)
	if err != nil {
		return nil, types.NewValidationError("Invalid start_date format", map[string]interface{}{"start_date": "must be YYYY-MM-DD"})
	}
	end := start.AddDate(0, 0, days-1)
	endDate := end.Format(constants.DateFormatISO)

	// Fetch equipment (filtered by ID if provided)
	equipment, err := s.calendarRepo.GetEquipmentForCalendar(ctx, query.EquipmentID)
	if err != nil {
		logger.Errorf(ctx, "Failed to fetch equipment for calendar: %v", err)
		return nil, types.NewInternalError("Failed to fetch equipment", err)
	}

	if len(equipment) == 0 {
		return &types.CalendarAvailabilityResponse{Calendar: []types.CalendarEntryDTO{}}, nil
	}

	// Fetch reservations in the date range
	reservations, err := s.calendarRepo.GetReservationsInDateRange(ctx, startDate, endDate, query.EquipmentID)
	if err != nil {
		logger.Errorf(ctx, "Failed to fetch reservations for calendar: %v", err)
		return nil, types.NewInternalError("Failed to fetch reservations", err)
	}

	// Build equipment name map
	equipmentNames := make(map[string]string)
	for _, eq := range equipment {
		name := eq.InternalID
		if eq.Name != nil && *eq.Name != "" {
			name = *eq.Name
		}
		equipmentNames[eq.ID] = name
	}

	// Build reservation lookup: equipmentID -> date -> reservation
	reservationLookup := make(map[string]map[string]*types.PublicReservationsSelect)
	for i := range reservations {
		res := &reservations[i]
		if _, exists := reservationLookup[res.EquipmentID]; !exists {
			reservationLookup[res.EquipmentID] = make(map[string]*types.PublicReservationsSelect)
		}

		// Mark all dates this reservation covers
		resStart, _ := time.Parse(constants.DateFormatISO, res.StartDate)
		resEnd, _ := time.Parse(constants.DateFormatISO, res.EndDate)
		for d := resStart; !d.After(resEnd); d = d.AddDate(0, 0, 1) {
			dateStr := d.Format(constants.DateFormatISO)
			// Only include dates within our query range
			if !d.Before(start) && !d.After(end) {
				reservationLookup[res.EquipmentID][dateStr] = res
			}
		}
	}

	// Build calendar entries
	var calendar []types.CalendarEntryDTO
	for _, eq := range equipment {
		eqName := equipmentNames[eq.ID]
		for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
			dateStr := d.Format(constants.DateFormatISO)
			entry := types.CalendarEntryDTO{
				Date:          dateStr,
				EquipmentID:   eq.ID,
				EquipmentName: eqName,
				IsAvailable:   true,
			}

			// Check if there's a reservation for this equipment on this date
			if eqReservations, exists := reservationLookup[eq.ID]; exists {
				if res, reserved := eqReservations[dateStr]; reserved {
					entry.IsAvailable = false
					entry.ReservationID = &res.ID
					entry.ReservationStatus = &res.Status
				}
			}

			calendar = append(calendar, entry)
		}
	}

	return &types.CalendarAvailabilityResponse{Calendar: calendar}, nil
}
