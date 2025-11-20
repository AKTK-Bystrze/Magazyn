package timeSet

import (
	"testing"
	"time"
)

func TestIsTheSameDay(t *testing.T) {
	testCases := []struct {
		name     string
		t1       time.Time
		t2       time.Time
		expected bool
	}{
		{
			name:     "Same time",
			t1:       time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
			t2:       time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
			expected: true,
		},
		{
			name:     "Different time, same day",
			t1:       time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
			t2:       time.Date(2024, 1, 1, 18, 0, 0, 0, time.UTC),
			expected: true,
		},
		{
			name:     "Different day",
			t1:       time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
			t2:       time.Date(2024, 1, 2, 12, 0, 0, 0, time.UTC),
			expected: false,
		},
		{
			name:     "Different month",
			t1:       time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
			t2:       time.Date(2024, 2, 1, 12, 0, 0, 0, time.UTC),
			expected: false,
		},
		{
			name:     "Different year",
			t1:       time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
			t2:       time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC),
			expected: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := IsTheSameDay(tc.t1, tc.t2)
			if result != tc.expected {
				t.Errorf("Expected %v, but got %v", tc.expected, result)
			}
		})
	}
}
