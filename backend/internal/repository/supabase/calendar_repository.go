package supabase

import (
	"context"
	"encoding/json"
	"sort"
	"time"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/supabase-go"
)

type calendarRepository struct {
	client *supabase.Client
}

// NewCalendarRepository creates a new Supabase implementation of CalendarRepository
func NewCalendarRepository(client *supabase.Client) repository.CalendarRepository {
	return &calendarRepository{
		client: client,
	}
}

// GetEquipmentForCalendar retrieves non-archived equipment for calendar display
func (r *calendarRepository) GetEquipmentForCalendar(ctx context.Context, equipmentID *string) ([]types.PublicEquipmentSelect, error) {
	qb := r.client.From("equipment").
		Select("*", "exact", false).
		Eq("is_archived", "false")

	if equipmentID != nil && *equipmentID != "" {
		qb = qb.Eq("id", *equipmentID)
	}

	qb = qb.Order("name", nil)

	data, _, err := qb.Execute()
	if err != nil {
		return nil, err
	}

	var equipment []types.PublicEquipmentSelect
	if err := json.Unmarshal(data, &equipment); err != nil {
		return nil, err
	}

	return equipment, nil
}

// GetReservationsInDateRange retrieves reservations overlapping with the date range
func (r *calendarRepository) GetReservationsInDateRange(ctx context.Context, startDate string, endDate string, equipmentID *string) ([]types.PublicReservationsSelect, error) {
	qb := r.client.From("reservations").
		Select("*", "exact", false).
		Lte("start_date", endDate).
		Gte("end_date", startDate).
		In("status", []string{constants.ReservationStatusPending, constants.ReservationStatusRented})

	if equipmentID != nil && *equipmentID != "" {
		qb = qb.Eq("equipment_id", *equipmentID)
	}

	data, _, err := qb.Execute()
	if err != nil {
		return nil, err
	}

	var reservations []types.PublicReservationsSelect
	if err := json.Unmarshal(data, &reservations); err != nil {
		return nil, err
	}

	return reservations, nil
}

type analyticsRepository struct {
	client *supabase.Client
}

// NewAnalyticsRepository creates a new Supabase implementation of AnalyticsRepository
func NewAnalyticsRepository(client *supabase.Client) repository.AnalyticsRepository {
	return &analyticsRepository{
		client: client,
	}
}

// GetEquipmentStats retrieves aggregated equipment statistics from the analytics view
func (r *analyticsRepository) GetEquipmentStats(ctx context.Context, query types.AnalyticsPeriodQuery) ([]types.PublicAnalyticsEquipmentStatsSelect, error) {
	qb := r.client.From("analytics_equipment_stats").
		Select("*", "exact", false)

	if query.EquipmentID != nil && *query.EquipmentID != "" {
		qb = qb.Eq("equipment_id", *query.EquipmentID)
	}

	data, _, err := qb.Execute()
	if err != nil {
		return nil, err
	}

	var stats []types.PublicAnalyticsEquipmentStatsSelect
	if err := json.Unmarshal(data, &stats); err != nil {
		return nil, err
	}

	return stats, nil
}

// GetUserStats retrieves aggregated user statistics from the analytics view
func (r *analyticsRepository) GetUserStats(ctx context.Context, query types.AnalyticsPeriodQuery) ([]types.PublicAnalyticsUserStatsSelect, error) {
	data, _, err := r.client.From("analytics_user_stats").
		Select("*", "exact", false).
		Execute()

	if err != nil {
		return nil, err
	}

	var stats []types.PublicAnalyticsUserStatsSelect
	if err := json.Unmarshal(data, &stats); err != nil {
		return nil, err
	}

	return stats, nil
}

// GetTopRentersForEquipment retrieves top renters for a specific equipment item
func (r *analyticsRepository) GetTopRentersForEquipment(ctx context.Context, equipmentID string, limit int) ([]types.TopRenterDTO, error) {
	// Query reservations joined with profiles, grouped by user
	// This is a simplified approach - in production, you might use a DB view or RPC
	data, _, err := r.client.From("reservations").
		Select("user_id, profiles!user_id(username), start_date, end_date", "exact", false).
		Eq("equipment_id", equipmentID).
		In("status", []string{constants.ReservationStatusRented, constants.ReservationStatusReturned}).
		Execute()

	if err != nil {
		return nil, err
	}

	var rawReservations []struct {
		UserID  string `json:"user_id"`
		Profile struct {
			Username string `json:"username"`
		} `json:"profiles"`
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
	}

	if err := json.Unmarshal(data, &rawReservations); err != nil {
		return nil, err
	}

	// Aggregate by user
	userStats := make(map[string]*types.TopRenterDTO)
	for _, res := range rawReservations {
		if _, exists := userStats[res.UserID]; !exists {
			userStats[res.UserID] = &types.TopRenterDTO{
				UserID:           res.UserID,
				Username:         res.Profile.Username,
				ReservationCount: 0,
				DaysRented:       0,
			}
		}
		userStats[res.UserID].ReservationCount++
		userStats[res.UserID].DaysRented += calculateDays(res.StartDate, res.EndDate)
	}

	// Convert to slice and sort by reservation count (descending)
	result := make([]types.TopRenterDTO, 0, len(userStats))
	for _, stats := range userStats {
		result = append(result, *stats)
	}

	// Sort by reservation count (descending)
	sort.Slice(result, func(i, j int) bool {
		return result[i].ReservationCount > result[j].ReservationCount
	})

	// Limit results
	if len(result) > limit {
		result = result[:limit]
	}

	return result, nil
}

// GetFavoriteEquipmentTypeForUser determines the most frequently rented equipment type
func (r *analyticsRepository) GetFavoriteEquipmentTypeForUser(ctx context.Context, userID string) (*string, error) {
	data, _, err := r.client.From("reservations").
		Select("equipment:equipment_id(type_id, equipment_types:type_id(name))", "exact", false).
		Eq("user_id", userID).
		In("status", []string{constants.ReservationStatusRented, constants.ReservationStatusReturned}).
		Execute()

	if err != nil {
		return nil, err
	}

	var rawReservations []struct {
		Equipment struct {
			TypeID        string `json:"type_id"`
			EquipmentType struct {
				Name string `json:"name"`
			} `json:"equipment_types"`
		} `json:"equipment"`
	}

	if err := json.Unmarshal(data, &rawReservations); err != nil {
		return nil, err
	}

	if len(rawReservations) == 0 {
		return nil, nil
	}

	// Count by type
	typeCounts := make(map[string]int)
	typeNames := make(map[string]string)
	for _, res := range rawReservations {
		typeCounts[res.Equipment.TypeID]++
		typeNames[res.Equipment.TypeID] = res.Equipment.EquipmentType.Name
	}

	// Find max
	maxCount := 0
	var favoriteTypeID string
	for typeID, count := range typeCounts {
		if count > maxCount {
			maxCount = count
			favoriteTypeID = typeID
		}
	}

	if favoriteTypeID == "" {
		return nil, nil
	}

	typeName := typeNames[favoriteTypeID]
	return &typeName, nil
}

// calculateDays calculates the number of days between two dates (inclusive).
// TODO: This calculation uses time.Parse which may have issues with timezones.
// For production, consider using a more robust date library.
func calculateDays(startDate, endDate string) int {
	start, err := time.Parse(constants.DateFormatISO, startDate)
	if err != nil {
		return 1
	}
	end, err := time.Parse(constants.DateFormatISO, endDate)
	if err != nil {
		return 1
	}
	days := int(end.Sub(start).Hours()/24) + 1
	if days < 1 {
		return 1
	}
	return days
}
