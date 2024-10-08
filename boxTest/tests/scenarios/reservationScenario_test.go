package scenarios

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"boxTest/common/db"
	"boxTest/env"
	"boxTest/tests"
	"log"
	"testing"
	"time"
)

var (
	user  = app.UserClient{}
	admin = app.UserClient{}
)

type changeHistory map[string]change

type change struct {
	status    string
	timestamp time.Time
}

type testCase struct {
	name                string
	startTime           time.Time
	endTime             time.Time
	transition          changeHistory
	item                app.Item
	creditsWhenCreated  int
	creditsWhenReturned int
}

func testSetUp() {
	log.Print("Test set up...")
	user = app.UserClient{
		User:   db.USERS_MAP[app.UserName1],
		Client: app.CreateHttpClient(),
	}
	user.Login()
	admin = app.UserClient{
		User:   db.USERS_MAP[app.AdminName1],
		Client: app.CreateHttpClient(),
	}
	admin.Login()
	db.RemoveReservations()
	db.RemoveAudits()
}

func testTearDown() {
	log.Print("test clean up...")
	user.LogOut()
	admin.LogOut()
	env.RevertContainerTime(consts.TEST_APP_NAME)
	db.RemoveReservations()
	db.RemoveAudits()
}

func baseScenario(tc testCase) {
	userBefore := db.GetUserById(int(user.User.ID))
	reserveWithTimestamp(tc.transition[app.PENDING], tc.startTime, tc.endTime, tc.item.ID)
	checkCredits(userBefore, tc.creditsWhenCreated)
	reservation := db.GetReservation(
		db.ByItemID(tc.item.ID),
		db.ByStatus(app.PENDING),
		db.ByUserID(int(user.User.ID)),
		db.ByStartTime(tc.startTime),
		db.ByEndTime(tc.endTime),
	)
	checkItemAvailability(tc.startTime, tc.endTime, tc.item, user)
	changeReservationStatusWithTimestamp(tc.transition[app.APPROVED], reservation)
	changeReservationStatusWithTimestamp(tc.transition[app.RENTED], reservation)
	changeReservationStatusWithTimestamp(tc.transition[app.RETURNED], reservation)
	checkCredits(userBefore, tc.creditsWhenReturned)
	items := user.GetAvailableItems(tc.startTime, tc.endTime)
	if tests.IsItemAvailable(tc.item, items) {
		log.Fatal("Reserved item should be available after closed reservation")
	}
	checkReservationAudits(reservation.ID, tc.transition)
}

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
		defer testTearDown()
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
		baseScenario(tc)
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
			item:                reservedItem,
			creditsWhenCreated:  0,
			creditsWhenReturned: 0,
		},
		{
			name:                "Reservation take next week return after week",
			startTime:           time.Now().AddDate(0, 0, 7),
			endTime:             time.Now().AddDate(0, 0, 14),
			transition:          make(changeHistory),
			item:                reservedItem,
			creditsWhenCreated:  0,
			creditsWhenReturned: 0,
		},
		{
			name:                "Reservation take next week return same day",
			startTime:           time.Now().AddDate(0, 0, 7),
			endTime:             time.Now().AddDate(0, 0, 7).Add(time.Hour),
			transition:          make(changeHistory),
			item:                reservedItem,
			creditsWhenCreated:  0,
			creditsWhenReturned: 0,
		},
	}

	for _, tc := range testCases {
		testSetUp()
		defer testTearDown()
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
		baseScenario(tc)
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
		defer testTearDown()
		tc.creditsWhenCreated = tests.CalculateCost(reservedItem.Type, tc.startTime, tc.endTime)
		tc.creditsWhenReturned = tests.CalculateCost(
			reservedItem.Type,
			tc.transition[app.RENTED].timestamp, tc.transition[app.RETURNED].timestamp)
		log.Printf("TEST reservation case:\n\t %v since %v till %v, credits when reservation is created %v, credits when returned %v",
			tc.name, tc.startTime, tc.endTime, tc.creditsWhenCreated, tc.creditsWhenReturned)
		baseScenario(tc)
		testTearDown()
		log.Printf("TEST reservation case %v PASSED", tc.name)
	}
}

func Test_reservationAdminDoesNoting(t *testing.T) {
	// reservations where admin does nothing

}

func checkCredits(userBefore app.User, expectedCost int) {
	log.Print("check user credits ")
	userAfter := db.GetUserById(int(userBefore.ID))
	expectedUserCreditsAfter := userBefore.Credits - expectedCost
	if userAfter.Credits != expectedUserCreditsAfter {
		calculatedCost := userAfter.Credits - userBefore.Credits
		log.Fatalf("User credits is %v, should be %v\n expected cost %v calculated cost %v",
			userAfter.Credits, expectedUserCreditsAfter, expectedCost, calculatedCost)
	}
}

func checkItemAvailability(reservationStart time.Time, reservationEnd time.Time, reservedItem app.Item, user app.UserClient) {
	log.Printf("Check item availability")
	log.Printf("Check item availability - same time")
	items := user.GetAvailableItems(reservationStart, reservationEnd)
	if tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item shouldn't be available when reserved")
	}
	if !tests.IsSameDay(reservationStart, time.Now()) && reservationStart.AddDate(0, 0, -1).After(time.Now()) {
		log.Printf("Check item availability - before")
		items = user.GetAvailableItems(time.Now(), reservationStart.AddDate(0, 0, -1))
		if !tests.IsItemAvailable(reservedItem, items) {
			log.Fatal("Reserved item should be available before reservation")
		}
	}
	log.Printf("Check item availability - after")
	items = user.GetAvailableItems(reservationEnd.AddDate(0, 0, 1), reservationEnd.AddDate(0, 0, 2))
	if !tests.IsItemAvailable(reservedItem, items) {
		log.Fatal("Reserved item should be available after reservation")
	}
	if tests.IsSameDay(reservationStart, reservationEnd) {
		log.Printf("Check item availability - overlapping")
		items = user.GetAvailableItems(reservationStart, reservationEnd.AddDate(0, 0, 1))
		if tests.IsItemAvailable(reservedItem, items) {
			log.Fatal("Reserved item shouldn't be available in overlapping durations")
		}
	} else {
		log.Printf("Check item availability - overlapping")
		items = user.GetAvailableItems(reservationStart.AddDate(0, 0, 1), reservationEnd.AddDate(0, 0, 1))
		if tests.IsItemAvailable(reservedItem, items) {
			log.Fatal("Reserved item shouldn't be available in overlapping durations")
		}
	}
}

func reserveWithTimestamp(change change, reservationStart time.Time, reservationEnd time.Time, itemId int) {
	env.SetContainerTime(change.timestamp.Add(-1*time.Minute), consts.TEST_APP_NAME)
	user.ReserveItem(itemId, reservationStart, reservationEnd)
	env.RevertContainerTime(consts.TEST_APP_NAME)
}

func changeReservationStatusWithTimestamp(change change, reservation app.Reservation) {
	env.SetContainerTime(change.timestamp.Add(-1*time.Minute), consts.TEST_APP_NAME)
	changeReservationStatus(change.status, reservation)
	env.RevertContainerTime(consts.TEST_APP_NAME)
}

func changeReservationStatus(status string, reservation app.Reservation) {
	admin.ChangeReservationStatus(reservation, status)
	reservationLoaded := db.GetReservation(db.ByID(reservation.ID))
	if reservationLoaded.Status != status {
		log.Fatalf("status didn't change. Want %v have %v", status, reservation.Status)
	}
}

func checkReservationAudits(reservationId int, expectedChangesHistory changeHistory) {
	log.Print("check reservation history")
	history := db.GetReservationAudit(reservationId)
	if len(history) != len(expectedChangesHistory) {
		log.Fatal("Changes history has different length than expected")
	}
	keys := []string{app.PENDING, app.APPROVED, app.RENTED, app.RETURNED}
	for i, audit := range history {
		expectedChange := expectedChangesHistory[keys[i]]
		if audit.Auditor != admin.User.Name &&
			tests.IsSameDay(audit.ChangeDate, expectedChange.timestamp) &&
			audit.Status != expectedChange.status {
			log.Fatalf("Reservation change should be %v but is %v", expectedChange, audit)
		}
	}
}
