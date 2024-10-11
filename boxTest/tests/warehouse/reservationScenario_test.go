package warehouseTests

import (
	"boxTest/handlers/app"
	"boxTest/tests"
	"boxTest/tests/warehouse/common"
	"testing"
	"time"
)

func Test_reservationMadeAndStartedSameTime(t *testing.T) {
	common.TestSetUp()
	items := common.User.GetAvailableItems(time.Now(), time.Now().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	testCases := []common.TestCase{
		{
			Name:                "Reservation take today return next week",
			StartTime:           time.Now(),
			EndTime:             time.Now().AddDate(0, 0, 7),
			Transition:          make(common.ChangeHistory),
			Item:                reservedItem,
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
		{
			Name:                "Reservation take today return tomorrow",
			StartTime:           time.Now(),
			EndTime:             tests.CreateNextDayAt(23),
			Transition:          make(common.ChangeHistory),
			Item:                reservedItem,
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
		{
			Name:                "Reservation take today return today",
			StartTime:           time.Now(),
			EndTime:             time.Now().Add(time.Hour),
			Transition:          make(common.ChangeHistory),
			Item:                reservedItem,
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
		{
			Name:                "Reservation take today return day after tomorrow",
			StartTime:           time.Now(),
			EndTime:             time.Now().AddDate(0, 0, 2),
			Transition:          make(common.ChangeHistory),
			Item:                reservedItem,
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
	}

	for _, tc := range testCases {
		common.TestSetUp()
		changesHistory := common.ChangeHistory{
			app.PENDING:  {Status: app.PENDING, Timestamp: tc.StartTime},
			app.APPROVED: {Status: app.APPROVED, Timestamp: tc.StartTime},
			app.RENTED:   {Status: app.RENTED, Timestamp: tc.StartTime},
			app.RETURNED: {Status: app.RETURNED, Timestamp: tc.EndTime},
		}
		tc.Transition = changesHistory
		expectedCost := tests.CalculateCost(reservedItem.Type, tc.StartTime, tc.EndTime)
		tc.CreditsWhenCreated = expectedCost
		tc.CreditsWhenReturned = expectedCost
		common.BaseScenario(tc)
		common.TestTearDown()
	}
}

func Test_reservationMadeInFuture(t *testing.T) {
	common.TestSetUp()
	items := common.User.GetAvailableItems(time.Now(), time.Now().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	testCases := []common.TestCase{
		{
			Name:                "Reservation take tomorrow return next week",
			StartTime:           time.Now().AddDate(0, 0, 1),
			EndTime:             time.Now().AddDate(0, 0, 7),
			Transition:          make(common.ChangeHistory),
			Item:                app.Item{},
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
		{
			Name:                "Reservation take next week return after week",
			StartTime:           time.Now().AddDate(0, 0, 7),
			EndTime:             time.Now().AddDate(0, 0, 14),
			Transition:          make(common.ChangeHistory),
			Item:                app.Item{},
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
		{
			Name:                "Reservation take next week return same day",
			StartTime:           time.Now().AddDate(0, 0, 7),
			EndTime:             time.Now().AddDate(0, 0, 7).Add(time.Hour),
			Transition:          make(common.ChangeHistory),
			Item:                app.Item{},
			CreditsWhenCreated:  0,
			CreditsWhenReturned: 0,
		},
	}
	for _, tc := range testCases {
		common.TestSetUp()
		changesHistory := common.ChangeHistory{
			app.PENDING:  {Status: app.PENDING, Timestamp: time.Now()},
			app.APPROVED: {Status: app.APPROVED, Timestamp: time.Now()},
			app.RENTED:   {Status: app.RENTED, Timestamp: tc.StartTime},
			app.RETURNED: {Status: app.RETURNED, Timestamp: tc.EndTime},
		}
		tc.Transition = changesHistory
		expectedCost := tests.CalculateCost(reservedItem.Type, tc.StartTime, tc.EndTime)
		tc.CreditsWhenCreated = expectedCost
		tc.CreditsWhenReturned = expectedCost
		tc.Item = reservedItem
		common.BaseScenario(tc)
		common.TestTearDown()
	}
}

func Test_reservationNotAsPlanned(t *testing.T) {
	common.TestSetUp()
	items := common.User.GetAvailableItems(time.Now(), time.Now().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	now := time.Now()
	nextWeek := time.Now().AddDate(0, 0, 7)
	twoWeeks := time.Now().AddDate(0, 0, 14)
	testCases := []common.TestCase{
		{
			Name: "Reservation started earlier than planned, returned on time",
			StartTime: nextWeek,
			EndTime: twoWeeks,
			Transition: common.ChangeHistory{
				app.PENDING:  {Status: app.PENDING, Timestamp: now},
				app.APPROVED: {Status: app.APPROVED, Timestamp: now},
				app.RENTED:   {Status: app.RENTED, Timestamp: now.AddDate(0, 0, 3)},
				app.RETURNED: {Status: app.RETURNED, Timestamp: twoWeeks},
			},
			Item: reservedItem,
			CreditsWhenCreated: 0,
			CreditsWhenReturned: 0,
		},
		{
			Name: "Reservation started later than planned, returned on time",
			StartTime: nextWeek,
			EndTime: twoWeeks,
			Transition: common.ChangeHistory{
				app.PENDING:  {Status: app.PENDING, Timestamp: now},
				app.APPROVED: {Status: app.APPROVED, Timestamp: now},
				app.RENTED:   {Status: app.RENTED, Timestamp: nextWeek.AddDate(0, 0, 2)},
				app.RETURNED: {Status: app.RETURNED, Timestamp: twoWeeks},
			},
			Item: reservedItem,
			CreditsWhenCreated: 0,
			CreditsWhenReturned: 0,
		},
		{
			Name: "Reservation started on time, returned earlier than planned",
			StartTime: nextWeek,
			EndTime: twoWeeks,
			Transition: common.ChangeHistory{
				app.PENDING:  {Status: app.PENDING, Timestamp: now},
				app.APPROVED: {Status: app.APPROVED, Timestamp: now},
				app.RENTED:   {Status: app.RENTED, Timestamp: nextWeek},
				app.RETURNED: {Status: app.RETURNED, Timestamp: twoWeeks.AddDate(0, 0, -2)}, //should be 6
			},
			Item: reservedItem,
			CreditsWhenCreated: 0,
			CreditsWhenReturned: 0,
		},
		{
			Name: "Reservation started on time, returned later than planned",
			StartTime: nextWeek,
			EndTime: twoWeeks,
			Transition: common.ChangeHistory{
				app.PENDING:  {Status: app.PENDING, Timestamp: now},
				app.APPROVED: {Status: app.APPROVED, Timestamp: now},
				app.RENTED:   {Status: app.RENTED, Timestamp: nextWeek},
				app.RETURNED: {Status: app.RETURNED, Timestamp: twoWeeks.AddDate(0, 0, 2)},
			},
			Item: reservedItem,
			CreditsWhenCreated: 0,
			CreditsWhenReturned: 0,
		},
	}
	for _, tc := range testCases {
		common.TestSetUp()
		tc.CreditsWhenCreated = tests.CalculateCost(reservedItem.Type, tc.StartTime, tc.EndTime)
		tc.CreditsWhenReturned = tests.CalculateCost(reservedItem.Type, tc.Transition[app.RENTED].Timestamp, tc.Transition[app.RETURNED].Timestamp)
		common.BaseScenario(tc)
		common.TestTearDown()
	}
}
