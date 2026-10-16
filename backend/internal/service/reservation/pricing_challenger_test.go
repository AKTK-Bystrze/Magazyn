package reservation_test

import (
	"testing"

	"magazyn/backend/internal/service/reservation"

	"github.com/stretchr/testify/assert"
)

func TestAdversarial_CalculateReservationCost(t *testing.T) {
	tests := []struct {
		name             string
		startDate        string
		endDate          string
		creditCostPerDay int32
		isFree           bool
		expectedCost     int32
	}{
		{
			name:             "isFree true returns 0 regardless of days and rate",
			startDate:        "2026-10-15",
			endDate:          "2026-10-25",
			creditCostPerDay: 50,
			isFree:           true,
			expectedCost:     0,
		},
		{
			name:             "isFree true with inverted dates returns 0",
			startDate:        "2026-10-25",
			endDate:          "2026-10-15",
			creditCostPerDay: 50,
			isFree:           true,
			expectedCost:     0,
		},
		{
			name:             "same day rental 1 day at 15 credits",
			startDate:        "2026-10-15",
			endDate:          "2026-10-15",
			creditCostPerDay: 15,
			isFree:           false,
			expectedCost:     15,
		},
		{
			name:             "same day rental 0 credit cost per day",
			startDate:        "2026-10-15",
			endDate:          "2026-10-15",
			creditCostPerDay: 0,
			isFree:           false,
			expectedCost:     0,
		},
		{
			name:             "three days rental at 10 credits",
			startDate:        "2026-10-15",
			endDate:          "2026-10-17",
			creditCostPerDay: 10,
			isFree:           false,
			expectedCost:     30,
		},
		{
			name:             "leap year 3 days (Feb 28 to Mar 1 2024) at 20 credits",
			startDate:        "2024-02-28",
			endDate:          "2024-03-01",
			creditCostPerDay: 20,
			isFree:           false,
			expectedCost:     60,
		},
		{
			name:             "non-leap year 2 days (Feb 28 to Mar 1 2025) at 20 credits",
			startDate:        "2025-02-28",
			endDate:          "2025-03-01",
			creditCostPerDay: 20,
			isFree:           false,
			expectedCost:     40,
		},
		{
			name:             "year rollover 2 days (Dec 31 2025 to Jan 1 2026) at 25 credits",
			startDate:        "2025-12-31",
			endDate:          "2026-01-01",
			creditCostPerDay: 25,
			isFree:           false,
			expectedCost:     50,
		},
		{
			name:             "inverted dates returns 0 cost",
			startDate:        "2026-10-20",
			endDate:          "2026-10-15",
			creditCostPerDay: 30,
			isFree:           false,
			expectedCost:     0,
		},
		{
			name:             "invalid start date returns 0 cost",
			startDate:        "invalid",
			endDate:          "2026-10-15",
			creditCostPerDay: 30,
			isFree:           false,
			expectedCost:     0,
		},
		{
			name:             "invalid end date returns 0 cost",
			startDate:        "2026-10-15",
			endDate:          "invalid",
			creditCostPerDay: 30,
			isFree:           false,
			expectedCost:     0,
		},
		{
			name:             "empty dates return 0 cost",
			startDate:        "",
			endDate:          "",
			creditCostPerDay: 30,
			isFree:           false,
			expectedCost:     0,
		},
		{
			name:             "long rental 30 days at 5 credits",
			startDate:        "2026-06-01",
			endDate:          "2026-06-30",
			creditCostPerDay: 5,
			isFree:           false,
			expectedCost:     150,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := reservation.CalculateReservationCost(tt.startDate, tt.endDate, tt.creditCostPerDay, tt.isFree)
			assert.Equal(t, tt.expectedCost, actual)
		})
	}
}
