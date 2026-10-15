package validation_test

import (
	"testing"

	"magazyn/backend/internal/validation"

	"github.com/stretchr/testify/assert"
)

func TestCalculateDays_AdversarialBoundaries(t *testing.T) {
	tests := []struct {
		name      string
		startDate string
		endDate   string
		expected  int
	}{
		{
			name:      "Leap year boundary (2024 Feb 28 to Mar 1)",
			startDate: "2024-02-28",
			endDate:   "2024-03-01",
			expected:  3, // Feb 28, Feb 29, Mar 1
		},
		{
			name:      "Non-leap year boundary (2025 Feb 28 to Mar 1)",
			startDate: "2025-02-28",
			endDate:   "2025-03-01",
			expected:  2, // Feb 28, Mar 1
		},
		{
			name:      "Year-end boundary (2025 Dec 30 to 2026 Jan 2)",
			startDate: "2025-12-30",
			endDate:   "2026-01-02",
			expected:  4,
		},
		{
			name:      "Spring DST weekend (2026 Mar 28 to Mar 30)",
			startDate: "2026-03-28",
			endDate:   "2026-03-30",
			expected:  3,
		},
		{
			name:      "Autumn DST weekend (2026 Oct 24 to Oct 26)",
			startDate: "2026-10-24",
			endDate:   "2026-10-26",
			expected:  3,
		},
		{
			name:      "Full leap year (2024 Jan 1 to Dec 31)",
			startDate: "2024-01-01",
			endDate:   "2024-12-31",
			expected:  366,
		},
		{
			name:      "Full non-leap year (2025 Jan 1 to Dec 31)",
			startDate: "2025-01-01",
			endDate:   "2025-12-31",
			expected:  365,
		},
		{
			name:      "Invalid Feb 29 in non-leap year",
			startDate: "2025-02-29",
			endDate:   "2025-03-01",
			expected:  0,
		},
		{
			name:      "Invalid day of month (April 31)",
			startDate: "2026-04-31",
			endDate:   "2026-05-01",
			expected:  0,
		},
		{
			name:      "Invalid month 13",
			startDate: "2026-13-01",
			endDate:   "2026-13-05",
			expected:  0,
		},
		{
			name:      "SQL injection payload in start date",
			startDate: "2026-01-01'; DROP TABLE reservations;--",
			endDate:   "2026-01-05",
			expected:  0,
		},
		{
			name:      "Null byte in date string",
			startDate: "2026-01-01\x00",
			endDate:   "2026-01-05",
			expected:  0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			actual := validation.CalculateDays(tc.startDate, tc.endDate)
			assert.Equal(t, tc.expected, actual)
		})
	}
}
