package validation_test

import (
	"testing"

	"magazyn/backend/internal/validation"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAdversarial_ValidateISODate(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		shouldErr bool
	}{
		{"valid standard", "2026-10-16", false},
		{"valid month start", "2026-01-01", false},
		{"valid month end 31 days", "2026-05-31", false},
		{"valid month end 30 days", "2026-04-30", false},
		{"valid leap day 2024", "2024-02-29", false},
		{"valid century leap day 2000", "2000-02-29", false},
		{"invalid non-leap Feb 29 2025", "2025-02-29", true},
		{"invalid non-leap Feb 29 2026", "2026-02-29", true},
		{"invalid non-leap century 1900", "1900-02-29", true},
		{"invalid April 31", "2026-04-31", true},
		{"invalid June 31", "2026-06-31", true},
		{"invalid Sept 31", "2026-09-31", true},
		{"invalid Nov 31", "2026-11-31", true},
		{"invalid month 0", "2026-00-15", true},
		{"invalid month 13", "2026-13-01", true},
		{"invalid day 0", "2026-05-00", true},
		{"invalid day 32", "2026-05-32", true},
		{"invalid slash format", "2026/10/16", true},
		{"invalid reverse format", "16-10-2026", true},
		{"invalid unpadded", "2026-1-1", true},
		{"invalid ISO datetime with T", "2026-10-16T00:00:00Z", true},
		{"invalid empty string", "", true},
		{"invalid whitespace", "   ", true},
		{"invalid null string", "null", true},
		{"invalid SQL injection", "' OR 1=1 --", true},
		{"invalid null byte", "2026-10-\x001", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validation.ValidateISODate(tt.input)
			if tt.shouldErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestAdversarial_CalculateDays(t *testing.T) {
	tests := []struct {
		name      string
		startDate string
		endDate   string
		expected  int
	}{
		{"same day", "2026-10-16", "2026-10-16", 1},
		{"two consecutive days", "2026-10-16", "2026-10-17", 2},
		{"month boundary Jan to Feb", "2026-01-31", "2026-02-01", 2},
		{"year boundary Dec to Jan", "2025-12-31", "2026-01-01", 2},
		{"leap year across Feb 29 (2024)", "2024-02-28", "2024-03-01", 3},
		{"non-leap year across Feb 28 (2025)", "2025-02-28", "2025-03-01", 2},
		{"non-leap year full year 2025", "2025-01-01", "2025-12-31", 365},
		{"leap year full year 2024", "2024-01-01", "2024-12-31", 366},
		{"spring forward DST period", "2026-03-28", "2026-03-30", 3},
		{"fall back DST period", "2026-10-24", "2026-10-26", 3},
		{"inverted dates end before start", "2026-10-17", "2026-10-16", 0},
		{"one day inversion", "2026-01-02", "2026-01-01", 0},
		{"invalid start format", "2026/10/16", "2026-10-17", 0},
		{"invalid end format", "2026-10-16", "2026/10/17", 0},
		{"invalid calendar day Feb 30", "2026-02-30", "2026-03-05", 0},
		{"empty start", "", "2026-10-17", 0},
		{"empty end", "2026-10-16", "", 0},
		{"both empty", "", "", 0},
		{"long 10-year span", "2020-01-01", "2029-12-31", 3653}, // 8 normal years (8*365=2920) + 2 leap years 2020, 2024, 2028: wait 2020, 2024, 2028 is 3 leap years! 7*365 + 3*366 = 2555 + 1098 = 3653
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := validation.CalculateDays(tt.startDate, tt.endDate)
			require.Equal(t, tt.expected, actual)
		})
	}
}
