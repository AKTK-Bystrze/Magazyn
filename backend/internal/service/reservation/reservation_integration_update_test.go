//go:build integration

package reservation_test

import (
	"context"
	"testing"

	"magazyn/backend/internal/testutils"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestModifyDates(t *testing.T) {
	tests := []struct {
		name      string
		initStart int
		initEnd   int
		newStart  *int
		newEnd    *int
		costDelta int32
		wantStart *int
		wantEnd   *int
	}{
		{"ExtendEnd", 5, 7, nil, intPtr(10), 3, nil, intPtr(10)},
		{"ExtendStart", 5, 7, intPtr(3), nil, 2, intPtr(3), nil},
		{"ExtendBoth", 5, 7, intPtr(3), intPtr(10), 5, nil, nil},
		{"ShortenEnd", 5, 10, nil, intPtr(7), -3, nil, intPtr(7)},
		{"ShortenStart", 5, 10, intPtr(8), nil, -3, intPtr(8), nil},
		{"ShortenBoth", 5, 10, intPtr(6), intPtr(8), -3, nil, nil},
		{"ShiftLater", 5, 7, intPtr(10), intPtr(12), 0, nil, nil},
		{"ShiftEarlier", 10, 12, intPtr(5), intPtr(7), 0, nil, nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fixture := setupDateTestFixture(t)
			defer fixture.teardown()
			ctx := context.Background()

			reservationID, err := fixture.createTestReservation(fixture.testUserID, tt.initStart, tt.initEnd)
			require.NoError(t, err)
			balanceBefore := fixture.getUserBalance(fixture.testUserID)

			updateCmd := types.UpdateReservationCommand{}
			if tt.newStart != nil {
				updateCmd.StartDate = testutils.StringPtr(dateOffset(*tt.newStart))
			}
			if tt.newEnd != nil {
				updateCmd.EndDate = testutils.StringPtr(dateOffset(*tt.newEnd))
			}

			resp, err := fixture.svc.Update(ctx, reservationID, updateCmd, fixture.testUserID, "user")
			require.NoError(t, err)
			assert.NotNil(t, resp)
			if tt.wantStart != nil {
				assert.Equal(t, dateOffset(*tt.wantStart), resp.StartDate)
			}
			if tt.wantEnd != nil {
				assert.Equal(t, dateOffset(*tt.wantEnd), resp.EndDate)
			}

			balanceAfter := fixture.getUserBalance(fixture.testUserID)
			expectedDifference := tt.costDelta * fixture.costPerDay
			assert.Equal(t, expectedDifference, balanceBefore-balanceAfter)
		})
	}

	t.Run("ConflictWithOther", func(t *testing.T) {
		fixture := setupDateTestFixture(t)
		defer fixture.teardown()
		ctx := context.Background()
		resID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
		require.NoError(t, err)
		_, err = fixture.createTestReservation(fixture.testUser2ID, 10, 12)
		require.NoError(t, err)
		updateCmd := types.UpdateReservationCommand{EndDate: testutils.StringPtr(dateOffset(11))}
		_, err = fixture.svc.Update(ctx, resID, updateCmd, fixture.testUserID, "user")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Dates not available")
	})

	t.Run("AdjacentToOther", func(t *testing.T) {
		fixture := setupDateTestFixture(t)
		defer fixture.teardown()
		ctx := context.Background()
		resID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
		require.NoError(t, err)
		_, err = fixture.createTestReservation(fixture.testUser2ID, 10, 12)
		require.NoError(t, err)
		updateCmd := types.UpdateReservationCommand{EndDate: testutils.StringPtr(dateOffset(9))}
		resp, err := fixture.svc.Update(ctx, resID, updateCmd, fixture.testUserID, "user")
		require.NoError(t, err)
		assert.Equal(t, dateOffset(9), resp.EndDate)
	})
}

func intPtr(i int) *int {
	return &i
}
