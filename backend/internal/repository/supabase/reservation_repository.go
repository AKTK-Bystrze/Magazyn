package supabase

import (
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/supabase-go"
)

type reservationRepository struct {
	client      *supabase.Client
	supabaseURL string
	supabaseKey string
}

func NewReservationRepository(client *supabase.Client, url string, key string) repository.ReservationRepository {
	return &reservationRepository{
		client:      client,
		supabaseURL: url,
		supabaseKey: key,
	}
}

type joinedResponse struct {
	types.PublicReservationsSelect
	Profile struct {
		Username string `json:"username"`
	} `json:"profiles"`
	Equipment struct {
		Name          string `json:"name"`
		EquipmentType struct {
			Name             string `json:"name"`
			CreditCostPerDay int32  `json:"credit_cost_per_day"`
		} `json:"equipment_types"`
	} `json:"equipment"`
}

type detailResponse struct {
	types.PublicReservationsSelect
	Profile struct {
		Username string `json:"username"`
		Email    string `json:"email"`
	} `json:"profiles"`
	Equipment struct {
		Name          string `json:"name"`
		InternalID    string `json:"internal_id"`
		EquipmentType struct {
			Name             string `json:"name"`
			CreditCostPerDay int32  `json:"credit_cost_per_day"`
		} `json:"equipment_types"`
	} `json:"equipment"`
}

type auditRaw struct {
	types.PublicReservationHistorySelect
	Profile struct {
		Username string `json:"username"`
	} `json:"profiles"`
}
