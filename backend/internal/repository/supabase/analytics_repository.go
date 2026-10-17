package supabase

import (
	"cmp"
	"context"
	"encoding/json"
	"slices"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"

	"github.com/supabase-community/supabase-go"
)

type analyticsRepository struct {
	client *supabase.Client
}

func NewAnalyticsRepository(client *supabase.Client) repository.AnalyticsRepository {
	return &analyticsRepository{
		client: client,
	}
}

func (r *analyticsRepository) GetEquipmentStats(ctx context.Context, query types.AnalyticsPeriodQuery) ([]types.PublicAnalyticsEquipmentStatsSelect, error) {
	qb := r.client.From(constants.ViewAnalyticsEquipmentStats).
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

func (r *analyticsRepository) GetUserStats(ctx context.Context, query types.AnalyticsPeriodQuery) ([]types.PublicAnalyticsUserStatsSelect, error) {
	data, _, err := r.client.From(constants.ViewAnalyticsUserStats).
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

func (r *analyticsRepository) GetTopRentersForEquipment(ctx context.Context, equipmentID string, limit int) ([]types.TopRenterDTO, error) {
	data, _, err := r.client.From(constants.TableReservations).
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
		userStats[res.UserID].DaysRented += validation.CalculateDays(res.StartDate, res.EndDate)
	}
	result := make([]types.TopRenterDTO, 0, len(userStats))
	for _, stats := range userStats {
		result = append(result, *stats)
	}
	slices.SortFunc(result, func(a, b types.TopRenterDTO) int {
		return cmp.Compare(b.ReservationCount, a.ReservationCount)
	})
	result = result[:min(len(result), limit)]
	return result, nil
}

func (r *analyticsRepository) GetFavoriteEquipmentTypeForUser(ctx context.Context, userID string) (*string, error) {
	data, _, err := r.client.From(constants.TableReservations).
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
	typeCounts := make(map[string]int)
	typeNames := make(map[string]string)
	for _, res := range rawReservations {
		typeCounts[res.Equipment.TypeID]++
		typeNames[res.Equipment.TypeID] = res.Equipment.EquipmentType.Name
	}
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
