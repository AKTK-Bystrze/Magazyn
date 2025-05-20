package common

import (
	"boxTest/env"
	"boxTest/handlers/app"
	"fmt"
	"log"
	"strings"
	"time"
)

type TestCase struct {
	Name                string
	StartTime           time.Time
	EndTime             time.Time
	Transition          *ChangeHistory
	Item                app.Item
	CreditsWhenCreated  int
	CreditsWhenReturned int
}

func (tc TestCase) toString(result string) {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Test Case: %s\n", tc.Name))
	sb.WriteString(fmt.Sprintf("Start Time: %s\n", tc.StartTime.Format(env.CONTAINER_TIME_FORMAT)))
	sb.WriteString(fmt.Sprintf("End Time: %s\n", tc.EndTime.Format(env.CONTAINER_TIME_FORMAT)))
	sb.WriteString(fmt.Sprintf("Credits When Created: %d\n", tc.CreditsWhenCreated))
	sb.WriteString(fmt.Sprintf("Credits When Returned: %d\n", tc.CreditsWhenReturned))

	sb.WriteString("Transition History:\n")
	sb.WriteString(tc.Transition.toString())

	sb.WriteString(fmt.Sprintf("Item Details: %+v\n", tc.Item))
	log.Printf("\n\tTESTCASE %v\n%v\n", result, sb.String())
}
