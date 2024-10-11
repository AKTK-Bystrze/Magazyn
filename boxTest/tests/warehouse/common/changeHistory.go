package common

import (
	"boxTest/env"
	"fmt"
	"strings"
	"time"
)

type ChangeHistory map[string]change

func (ch ChangeHistory) toString() string {
	var sb strings.Builder
	for key, change := range ch {
		sb.WriteString(fmt.Sprintf("  Action: %s, Status: %s, Timestamp: %s\n", key, change.Status, change.Timestamp.Format(env.TIME_FORMAT)))
	}
	return sb.String()
}

type change struct {
	Status    string
	Timestamp time.Time
}

func (c change) toString() string {
	return fmt.Sprintf("Status: %s, Timestamp: %s\n", c.Status, c.Timestamp.Format(env.TIME_FORMAT))
}
