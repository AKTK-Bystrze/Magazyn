package warehouseTests

import (
	"boxTest/handlers/app"
	"boxTest/tests"
	"boxTest/tests/warehouse/common"
	"testing"
	"time"
)

func timeNow() time.Time {
	return time.Now().In(tests.LOCATION).Truncate(time.Second)
}

func Test_reservationMadeAndStartedSameTime(t *testing.T) {
	common.TestSetUp("Suite_Test_reservationMadeAndStartedSameTime")
	items := common.User.GetAvailableItems(timeNow(), timeNow().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	now := timeNow().Add(15 * time.Minute)
	testCases := []common.TestCase{
		{
			Name:      "Reservation take today return next week",
			StartTime: now,
			EndTime:   now.AddDate(0, 0, 7),
			Item:      reservedItem,
		},
		{
			Name:      "Reservation take today return tomorrow",
			StartTime: now,
			EndTime:   tests.CreateNextDayAt(now, 23),
			Item:      reservedItem,
		},
		{
			Name:      "Reservation take today return today",
			StartTime: now,
			EndTime:   now.Add(time.Hour),
			Item:      reservedItem,
		},
		{
			Name:      "Reservation take today return day after tomorrow",
			StartTime: now,
			EndTime:   now.AddDate(0, 0, 2),
			Item:      reservedItem,
		},
	}

	for _, tc := range testCases {
		common.TestSetUp(tc.Name)
		changesHistory := common.NewChangeHistoryBuilder().
			AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: tc.StartTime}).
			AddChange(app.APPROVED, common.Change{Status: app.APPROVED, Timestamp: tc.StartTime}).
			AddChange(app.RENTED, common.Change{Status: app.RENTED, Timestamp: tc.StartTime}).
			AddChange(app.RETURNED, common.Change{Status: app.RETURNED, Timestamp: tc.EndTime}).
			Build()
		tc.Transition = changesHistory
		expectedCost := tests.CalculateCost(reservedItem.Type, tc.StartTime, tc.EndTime)
		tc.CreditsWhenCreated = expectedCost
		tc.CreditsWhenReturned = expectedCost
		common.BaseScenario(tc)
	}
}

func Test_reservationMadeInFuture(t *testing.T) {
	common.TestSetUp("Suite_Test_reservationMadeInFuture")
	now := timeNow()
	nextDay := now.AddDate(0, 0, 1)
	nextWeek := now.AddDate(0, 0, 7)
	twoWeeks := now.AddDate(0, 0, 14)
	items := common.User.GetAvailableItems(now, now.AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	testCases := []common.TestCase{
		{
			Name:                "Reservation take tomorrow return next week",
			StartTime:           nextDay,
			EndTime:             nextWeek,
			Transition:          common.NewChangeHistoryBuilder().Build(),
			Item:                app.Item{},
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
		{
			Name:                "Reservation take next week return after week",
			StartTime:           nextWeek,
			EndTime:             twoWeeks,
			Transition:          common.NewChangeHistoryBuilder().Build(),
			Item:                app.Item{},
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
		{
			Name:                "Reservation take next week return the same day",
			StartTime:           nextWeek,
			EndTime:             nextWeek.Add(time.Hour),
			Transition:          common.NewChangeHistoryBuilder().Build(),
			Item:                app.Item{},
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
	}
	for _, tc := range testCases {
		common.TestSetUp(tc.Name)
		changesHistory := common.NewChangeHistoryBuilder().
			AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: now}).
			AddChange(app.APPROVED, common.Change{Status: app.APPROVED, Timestamp: now}).
			AddChange(app.RENTED, common.Change{Status: app.RENTED, Timestamp: tc.StartTime}).
			AddChange(app.RETURNED, common.Change{Status: app.RETURNED, Timestamp: tc.EndTime}).
			Build()
		tc.Transition = changesHistory
		expectedCost := tests.CalculateCost(reservedItem.Type, tc.StartTime, tc.EndTime)
		tc.CreditsWhenCreated = expectedCost
		tc.CreditsWhenReturned = expectedCost
		tc.Item = reservedItem
		common.BaseScenario(tc)
	}
}

func Test_reservationNotAsPlanned(t *testing.T) {
	common.TestSetUp("Suite_Test_reservationNotAsPlanned")
	items := common.User.GetAvailableItems(timeNow(), timeNow().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	now := timeNow()
	nextWeek := now.AddDate(0, 0, 7)
	twoWeeks := now.AddDate(0, 0, 14)
	testCases := []common.TestCase{
		{
			Name:      "Reservation started earlier than planned, returned on time",
			StartTime: nextWeek,
			EndTime:   twoWeeks,
			Transition: common.NewChangeHistoryBuilder().
				AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: now}).
				AddChange(app.APPROVED, common.Change{Status: app.APPROVED, Timestamp: now}).
				AddChange(app.RENTED, common.Change{Status: app.RENTED, Timestamp: now.AddDate(0, 0, 3)}).
				AddChange(app.RETURNED, common.Change{Status: app.RETURNED, Timestamp: twoWeeks}).
				Build(),
			Item:                reservedItem,
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
		{
			Name:      "Reservation started later than planned, returned on time",
			StartTime: nextWeek,
			EndTime:   twoWeeks,
			Transition: common.NewChangeHistoryBuilder().
				AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: now}).
				AddChange(app.APPROVED, common.Change{Status: app.APPROVED, Timestamp: now}).
				AddChange(app.RENTED, common.Change{Status: app.RENTED, Timestamp: nextWeek.AddDate(0, 0, 2)}).
				AddChange(app.RETURNED, common.Change{Status: app.RETURNED, Timestamp: twoWeeks}).
				Build(),
			Item:                reservedItem,
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
		{
			Name:      "Reservation started on time, returned earlier than planned",
			StartTime: nextWeek,
			EndTime:   twoWeeks,
			Transition: common.NewChangeHistoryBuilder().
				AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: now}).
				AddChange(app.APPROVED, common.Change{Status: app.APPROVED, Timestamp: now}).
				AddChange(app.RENTED, common.Change{Status: app.RENTED, Timestamp: nextWeek}).
				AddChange(app.RETURNED, common.Change{Status: app.RETURNED, Timestamp: twoWeeks.AddDate(0, 0, -2)}).
				Build(),
			Item:                reservedItem,
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
		{
			Name:      "Reservation started on time, returned later than planned",
			StartTime: nextWeek,
			EndTime:   twoWeeks,
			Transition: common.NewChangeHistoryBuilder().
				AddChange(app.PENDING, common.Change{Status: app.PENDING, Timestamp: now}).
				AddChange(app.APPROVED, common.Change{Status: app.APPROVED, Timestamp: now}).
				AddChange(app.RENTED, common.Change{Status: app.RENTED, Timestamp: nextWeek}).
				AddChange(app.RETURNED, common.Change{Status: app.RETURNED, Timestamp: twoWeeks.AddDate(0, 0, 2)}).
				Build(),
			Item:                reservedItem,
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
	}
	for _, tc := range testCases {
		common.TestSetUp(tc.Name)
		tc.CreditsWhenCreated = tests.CalculateCost(reservedItem.Type, tc.StartTime, tc.EndTime)
		tc.CreditsWhenReturned = tests.CalculateCost(reservedItem.Type, tc.Transition.GetChangeByKey(app.RENTED).Timestamp,
			tc.Transition.GetChangeByKey(app.RETURNED).Timestamp)
		common.BaseScenario(tc)
	}
}
