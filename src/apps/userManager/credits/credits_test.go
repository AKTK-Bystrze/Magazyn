package credits

import (
	"bystrze/apps"
	"bystrze/apps/common/models"
	"bystrze/apps/common/timeSet"
	"bystrze/apps/userManager/appState"
	"log"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestMain(m *testing.M) {
	var err error
	timeSet.LOCATION, err = time.LoadLocation("Europe/Warsaw")
	if err != nil {
		log.Fatalf("Can't set location for tests: %v", err)
	}

	appState.App = apps.App{
		AppName: "credits_test",
	}
	appState.App.SetLogger()

	os.Exit(m.Run())
}

func TestCalculateRentalCost(t *testing.T) {
	paddleItem := models.Item{
		Type: "paddle",
	}

	// Test Case: 7-day rental (Friday 00:52 to next Friday 00:52)
	// This scenario previously caused a miscalculation (7 days instead of 8)
	// due to floating-point issues and timezone inconsistencies.
	t.Run("7-day rental, Friday to next Friday, should be 8 days cost", func(t *testing.T) {
		startTime := time.Date(2025, 11, 21, 0, 52, 0, 0, timeSet.LOCATION) // Friday, Nov 21, 2025 00:52 CET
		endTime := time.Date(2025, 11, 28, 0, 52, 0, 0, timeSet.LOCATION)   // Friday, Nov 28, 2025 00:52 CET

		expectedCost := 16 // 8 calendar days * 2 credits/day for paddle

		cost, err := CalculateRentalCost(paddleItem, startTime, endTime)

		assert.NoError(t, err)
		assert.Equal(t, expectedCost, cost, "Expected cost for 7-day rental (8 calendar days) should be 16")
	})

	t.Run("1-day rental, same day", func(t *testing.T) {
		startTime := time.Date(2025, 11, 21, 10, 0, 0, 0, timeSet.LOCATION)
		endTime := time.Date(2025, 11, 21, 16, 0, 0, 0, timeSet.LOCATION)
		expectedCost := 2 // 1 calendar day * 2 credits/day

		cost, err := CalculateRentalCost(paddleItem, startTime, endTime)
		assert.NoError(t, err)
		assert.Equal(t, expectedCost, cost, "Expected cost for 1-day rental (same day) should be 2")
	})

	t.Run("2-day rental, overnight", func(t *testing.T) {
		startTime := time.Date(2025, 11, 21, 22, 0, 0, 0, timeSet.LOCATION) // Day 1, 22:00
		endTime := time.Date(2025, 11, 22, 02, 0, 0, 0, timeSet.LOCATION)   // Day 2, 02:00
		expectedCost := 4                                                   // 2 calendar days * 2 credits/day

		cost, err := CalculateRentalCost(paddleItem, startTime, endTime)
		assert.NoError(t, err)
		assert.Equal(t, expectedCost, cost, "Expected cost for 2-day rental (overnight) should be 4")
	})
}
