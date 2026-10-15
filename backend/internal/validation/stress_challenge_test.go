package validation_test

import (
	"math"
	"math/rand"
	"testing"
	"time"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCalculateDays_EmpiricalStress runs exhaustive edge cases and an oracle generator.
func TestCalculateDays_EmpiricalStress(t *testing.T) {
	t.Run("boundary and edge cases", func(t *testing.T) {
		cases := []struct {
			name     string
			start    string
			end      string
			expected int
		}{
			{"same day", "2026-05-10", "2026-05-10", 1},
			{"consecutive days", "2026-05-10", "2026-05-11", 2},
			{"month boundary 30-day", "2026-04-30", "2026-05-01", 2},
			{"month boundary 31-day", "2026-05-31", "2026-06-01", 2},
			{"february non-leap year boundary", "2026-02-28", "2026-03-01", 2},
			{"february leap year boundary", "2024-02-28", "2024-03-01", 3},
			{"february leap day itself", "2024-02-29", "2024-02-29", 1},
			{"february leap day to next day", "2024-02-29", "2024-03-01", 2},
			{"century non-leap year 1900", "1900-02-28", "1900-03-01", 2},
			{"century leap year 2000", "2000-02-28", "2000-03-01", 3},
			{"year boundary", "2025-12-31", "2026-01-01", 2},
			{"full leap year 2024", "2024-01-01", "2024-12-31", 366},
			{"full non-leap year 2025", "2025-01-01", "2025-12-31", 365},
			{"across leap year 2023-2025", "2023-12-31", "2025-01-01", 368},
			{"reversed single day", "2026-05-11", "2026-05-10", 0},
			{"reversed full year", "2026-01-01", "2025-01-01", 0},
			{"empty start", "", "2026-05-10", 0},
			{"empty end", "2026-05-10", "", 0},
			{"both empty", "", "", 0},
			{"slash separator", "2026/05/10", "2026/05/12", 0},
			{"unpadded month", "2026-5-10", "2026-05-12", 0},
			{"reversed order DMY", "10-05-2026", "12-05-2026", 0},
			{"timestamp format", "2026-05-10T00:00:00Z", "2026-05-12T00:00:00Z", 0},
			{"invalid leap day 2026-02-29", "2026-02-29", "2026-03-01", 0},
			{"invalid day 31 in April", "2026-04-31", "2026-05-01", 0},
			{"invalid month 13", "2026-13-01", "2026-13-02", 0},
			{"whitespace in date", " 2026-05-10 ", "2026-05-12", 0},
			{"far future dates", "9999-12-30", "9999-12-31", 2},
			{"far past dates", "0001-01-01", "0001-01-02", 2},
		}

		for _, tc := range cases {
			tc := tc
			t.Run(tc.name, func(t *testing.T) {
				actual := validation.CalculateDays(tc.start, tc.end)
				assert.Equal(t, tc.expected, actual, "failed for %s -> %s", tc.start, tc.end)
			})
		}
	})

	t.Run("oracle generator across 1000 random intervals", func(t *testing.T) {
		//nolint:gosec // deterministic pseudorandom seed is appropriate for test oracle
		r := rand.New(rand.NewSource(42))
		baseDate := time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
		totalDaysRange := 365 * 40 // 40 years

		for i := 0; i < 1000; i++ {
			startOffset := r.Intn(totalDaysRange)
			startDate := baseDate.AddDate(0, 0, startOffset)

			// Delta between -15 and +400 days
			delta := r.Intn(416) - 15
			endDate := startDate.AddDate(0, 0, delta)

			startStr := startDate.Format("2006-01-02")
			endStr := endDate.Format("2006-01-02")

			var expected int
			if delta < 0 {
				expected = 0
			} else {
				expected = delta + 1
			}

			actual := validation.CalculateDays(startStr, endStr)
			require.Equal(t, expected, actual, "Oracle mismatch on iteration %d: %s to %s (delta %d)", i, startStr, endStr, delta)
		}
	})
}

// TestValidatePagination_EmpiricalStress runs exhaustive boundary tests on pagination logic.
func TestValidatePagination_EmpiricalStress(t *testing.T) {
	t.Run("page normalization", func(t *testing.T) {
		pages := []int{-1000000, -10, -1, 0}
		for _, p := range pages {
			page, perPage, err := validation.ValidatePagination(p, 10)
			assert.NoError(t, err)
			assert.Equal(t, constants.DefaultPage, page, "page %d should normalize to DefaultPage", p)
			assert.Equal(t, 10, perPage)
		}

		validPages := []int{1, 2, 10, 100, 1000000, math.MaxInt32}
		for _, p := range validPages {
			page, perPage, err := validation.ValidatePagination(p, 25)
			assert.NoError(t, err)
			assert.Equal(t, p, page, "valid page %d should remain unchanged", p)
			assert.Equal(t, 25, perPage)
		}
	})

	t.Run("perPage normalization for non-positive values", func(t *testing.T) {
		nonPositive := []int{-1000000, -50, -1, 0}
		for _, pp := range nonPositive {
			page, perPage, err := validation.ValidatePagination(1, pp)
			assert.NoError(t, err)
			assert.Equal(t, 1, page)
			assert.Equal(t, constants.DefaultPerPage, perPage, "perPage %d should normalize to DefaultPerPage", pp)
		}
	})

	t.Run("perPage allowed values succeed", func(t *testing.T) {
		for _, allowed := range constants.AllowedPerPageValues {
			page, perPage, err := validation.ValidatePagination(3, allowed)
			assert.NoError(t, err)
			assert.Equal(t, 3, page)
			assert.Equal(t, allowed, perPage)
		}
	})

	t.Run("perPage boundary and oversized values reject with ValidationError", func(t *testing.T) {
		disallowed := []int{
			1, 2, 5, 9, 11, 20, 24, 26, 49, 51, 99, 101, 200, 500, 1000, 10000, math.MaxInt32,
		}

		for _, pp := range disallowed {
			page, perPage, err := validation.ValidatePagination(1, pp)
			require.Error(t, err, "perPage %d should be rejected", pp)

			var valErr *types.ValidationError
			require.ErrorAs(t, err, &valErr, "error must be *types.ValidationError for perPage %d", pp)
			assert.Equal(t, "Invalid per_page value. Allowed: 10, 25, 50, 100", valErr.Message)
			assert.Equal(t, 1, page)
			assert.Equal(t, pp, perPage)
			assert.Equal(t, pp, valErr.Details.(map[string]int)["per_page"])
		}
	})
}
