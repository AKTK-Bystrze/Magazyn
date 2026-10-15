package validation_test

import (
	"testing"

	"magazyn/backend/internal/validation"

	"github.com/stretchr/testify/assert"
)

func TestCalculateDays(t *testing.T) {
	tests := []struct {
		name      string
		startDate string
		endDate   string
		expected  int
	}{
		{
			name:      "same day rental is 1 day",
			startDate: "2026-10-15",
			endDate:   "2026-10-15",
			expected:  1,
		},
		{
			name:      "three days rental",
			startDate: "2026-10-15",
			endDate:   "2026-10-17",
			expected:  3,
		},
		{
			name:      "end date before start date returns 0",
			startDate: "2026-10-17",
			endDate:   "2026-10-15",
			expected:  0,
		},
		{
			name:      "invalid start date returns 0",
			startDate: "invalid-date",
			endDate:   "2026-10-15",
			expected:  0,
		},
		{
			name:      "invalid end date returns 0",
			startDate: "2026-10-15",
			endDate:   "invalid-date",
			expected:  0,
		},
		{
			name:      "empty strings return 0",
			startDate: "",
			endDate:   "",
			expected:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := validation.CalculateDays(tt.startDate, tt.endDate)
			assert.Equal(t, tt.expected, actual)
		})
	}
}
