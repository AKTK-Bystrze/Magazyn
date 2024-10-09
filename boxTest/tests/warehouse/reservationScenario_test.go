package warehouseTests

import (
	"boxTest/common/app"
	"boxTest/tests"
	"log"
	"testing"
	"time"
)

func Test_reservationMadeAndStartedSameTime(t *testing.T) {
	testSetUp()
	items := user.GetAvailableItems(time.Now(), time.Now().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	testCases := []testCase{
		{
			name:                "Reservation take today return next week",
			startTime:           time.Now(),
			endTime:             time.Now().AddDate(0, 0, 7),
			transition:          make(changeHistory),
			item:                reservedItem,
			creditsWhenCreated:  0,
			creditsWhenReturned: 0,
		},
		{
			name:                "Reservation take today return tomorrow",
			startTime:           time.Now(),
			endTime:             tests.CreateNextDayAt(23),
			transition:          make(changeHistory),
			item:                reservedItem,
			creditsWhenCreated:  0,
			creditsWhenReturned: 0,
		},
		{
			name:                "Reservation take today return today",
			startTime:           time.Now(),
			endTime:             time.Now().Add(time.Hour),
			transition:          make(changeHistory),
			item:                reservedItem,
			creditsWhenCreated:  0,
			creditsWhenReturned: 0,
		},
		{
			name:                "Reservation take today return day after tomorrow",
			startTime:           time.Now(),
			endTime:             time.Now().AddDate(0, 0, 2),
			transition:          make(changeHistory),
			item:                reservedItem,
			creditsWhenCreated:  0,
			creditsWhenReturned: 0,
		},
	}

	for _, tc := range testCases {
		testSetUp()
		log.Printf("TEST reservation case:\n\t %v since %v till %v", tc.name, tc.startTime, tc.endTime)
		changesHistory := changeHistory{
			app.PENDING:  {status: app.PENDING, timestamp: tc.startTime},
			app.APPROVED: {status: app.APPROVED, timestamp: tc.startTime},
			app.RENTED:   {status: app.RENTED, timestamp: tc.startTime},
			app.RETURNED: {status: app.RETURNED, timestamp: tc.endTime},
		}
		tc.transition = changesHistory
		expectedCost := tests.CalculateCost(reservedItem.Type, tc.startTime, tc.endTime)
		tc.creditsWhenCreated = expectedCost
		tc.creditsWhenReturned = expectedCost
		BaseScenario(tc)
		testTearDown()
		log.Printf("TEST reservation case %v PASSED", tc.name)
	}
}

func Test_reservationMadeInFuture(t *testing.T) {
	testSetUp()
	items := user.GetAvailableItems(time.Now(), time.Now().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	testCases := []testCase{
		{
			name:                "Reservation take tomorrow return next week",
			startTime:           time.Now().AddDate(0, 0, 1),
			endTime:             time.Now().AddDate(0, 0, 7),
			transition:          make(changeHistory),
			item:                app.Item{},
			creditsWhenCreated:  0,
			creditsWhenReturned: 0,
		},
		{
			name:                "Reservation take next week return after week",
			startTime:           time.Now().AddDate(0, 0, 7),
			endTime:             time.Now().AddDate(0, 0, 14),
			transition:          make(changeHistory),
			item:                app.Item{},
			creditsWhenCreated:  0,
			creditsWhenReturned: 0,
		},
		{
			name:                "Reservation take next week return same day",
			startTime:           time.Now().AddDate(0, 0, 7),
			endTime:             time.Now().AddDate(0, 0, 7).Add(time.Hour),
			transition:          make(changeHistory),
			item:                app.Item{},
			creditsWhenCreated:  0,
			creditsWhenReturned: 0,
		},
	}
	for _, tc := range testCases {
		testSetUp()
		log.Printf("TEST reservation case:\n\t %v since %v till %v", tc.name, tc.startTime, tc.endTime)
		changesHistory := changeHistory{
			app.PENDING:  {status: app.PENDING, timestamp: time.Now()},
			app.APPROVED: {status: app.APPROVED, timestamp: time.Now()},
			app.RENTED:   {status: app.RENTED, timestamp: tc.startTime},
			app.RETURNED: {status: app.RETURNED, timestamp: tc.endTime},
		}
		tc.transition = changesHistory
		expectedCost := tests.CalculateCost(reservedItem.Type, tc.startTime, tc.endTime)
		tc.creditsWhenCreated = expectedCost
		tc.creditsWhenReturned = expectedCost
		tc.item = reservedItem
		BaseScenario(tc)
		testTearDown()
		log.Printf("TEST reservation case %v PASSED", tc.name)
	}
}

func Test_reservationNotAsPlanned(t *testing.T) {
	testSetUp()
	items := user.GetAvailableItems(time.Now(), time.Now().AddDate(0, 1, 0))
	reservedItem := tests.PickRandomItem(items)
	now := time.Now()
	nextWeek := time.Now().AddDate(0, 0, 7)
	twoWeeks := time.Now().AddDate(0, 0, 14)
	testCases := []testCase{
		{
			"Reservation started earlier than planned, returned on time",
			nextWeek,
			twoWeeks,
			changeHistory{
				app.PENDING:  {status: app.PENDING, timestamp: now},
				app.APPROVED: {status: app.APPROVED, timestamp: now},
				app.RENTED:   {status: app.RENTED, timestamp: now.AddDate(0, 0, 3)},
				app.RETURNED: {status: app.RETURNED, timestamp: twoWeeks},
			},
			reservedItem,
			0,
			0,
		},
		{
			"Reservation started later than planned, returned on time",
			nextWeek,
			twoWeeks,
			changeHistory{
				app.PENDING:  {status: app.PENDING, timestamp: now},
				app.APPROVED: {status: app.APPROVED, timestamp: now},
				app.RENTED:   {status: app.RENTED, timestamp: nextWeek.AddDate(0, 0, 2)},
				app.RETURNED: {status: app.RETURNED, timestamp: twoWeeks},
			},
			reservedItem,
			0,
			0,
		},
		{
			"Reservation started on time, returned earlier than planned",
			nextWeek,
			twoWeeks,
			changeHistory{
				app.PENDING:  {status: app.PENDING, timestamp: now},
				app.APPROVED: {status: app.APPROVED, timestamp: now},
				app.RENTED:   {status: app.RENTED, timestamp: nextWeek},
				app.RETURNED: {status: app.RETURNED, timestamp: twoWeeks.AddDate(0, 0, -2)}, //should be 6
			},
			reservedItem,
			0,
			0,
		},
		{
			"Reservation started on time, returned later than planned",
			nextWeek,
			twoWeeks,
			changeHistory{
				app.PENDING:  {status: app.PENDING, timestamp: now},
				app.APPROVED: {status: app.APPROVED, timestamp: now},
				app.RENTED:   {status: app.RENTED, timestamp: nextWeek},
				app.RETURNED: {status: app.RETURNED, timestamp: twoWeeks.AddDate(0, 0, 2)},
			},
			reservedItem,
			0,
			0,
		},
	}
	for _, tc := range testCases {
		testSetUp()
		tc.creditsWhenCreated = tests.CalculateCost(reservedItem.Type, tc.startTime, tc.endTime)
		tc.creditsWhenReturned = tests.CalculateCost(reservedItem.Type, tc.transition[app.RENTED].timestamp, tc.transition[app.RETURNED].timestamp)
		log.Printf("TEST reservation case:\n\t %v since %v till %v, credits when reservation is created %v, credits when returned %v",
			tc.name, tc.startTime, tc.endTime, tc.creditsWhenCreated, tc.creditsWhenReturned)
		BaseScenario(tc)
		testTearDown()
		log.Printf("TEST reservation case %v PASSED", tc.name)
	}
}
