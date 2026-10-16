package supabase

import (
	"context"
	"encoding/json"

	"magazyn/backend/internal/constants"
)

func (r *equipmentRepository) GetUserFavorites(ctx context.Context, userID string) (map[string]bool, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := client.From(constants.TableReservations).
		Select("equipment_id", "exact", false).
		Eq("user_id", userID).
		In("status", []string{constants.ReservationStatusRented, constants.ReservationStatusReturned}).
		Execute()
	if err != nil {
		return nil, err
	}
	var reservations []struct {
		EquipmentID string `json:"equipment_id"`
	}
	if err := json.Unmarshal(data, &reservations); err != nil {
		return nil, err
	}
	counts := make(map[string]int)
	for _, res := range reservations {
		counts[res.EquipmentID]++
	}
	favorites := make(map[string]bool)
	maxCount := 0
	for _, c := range counts {
		if c > maxCount {
			maxCount = c
		}
	}
	favCount := 0
	for eqID, c := range counts {
		if c == maxCount && favCount < 3 {
			favorites[eqID] = true
			favCount++
		}
	}
	return favorites, nil
}
