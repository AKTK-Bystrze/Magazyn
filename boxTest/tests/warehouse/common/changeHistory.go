package common

import (
	"boxTest/env"
	"fmt"
	"log"
	"strings"
	"time"
)

type ChangeHistory struct {
	changes []struct {
		Key   string
		Value Change
	}
}

func (ch ChangeHistory) toString() string {
	var sb strings.Builder
	for _, entry := range ch.changes {
		sb.WriteString(fmt.Sprintf("  Action: %s,\t Status: %s,\t Timestamp: %s\n", entry.Key, entry.Value.Status, entry.Value.Timestamp.Format(env.CONTAINER_TIME_FORMAT)))
	}
	return sb.String()
}

type ChangeHistoryBuilder struct {
	changeHistory *ChangeHistory
}

func (b *ChangeHistoryBuilder) Build() *ChangeHistory {
	return b.changeHistory
}

func NewChangeHistoryBuilder() *ChangeHistoryBuilder {
	return &ChangeHistoryBuilder{
		changeHistory: &ChangeHistory{changes: make([]struct {
			Key   string
			Value Change
		}, 0)},
	}
}

func (b *ChangeHistoryBuilder) AddChange(key string, value Change) *ChangeHistoryBuilder {
	b.changeHistory.changes = append(b.changeHistory.changes, struct {
		Key   string
		Value Change
	}{Key: key, Value: value})
	return b
}

func (ch *ChangeHistory) GetChanges() []struct {
	Key   string
	Value Change
} {
	return ch.changes
}

func (ch *ChangeHistory) GetChangeByKey(key string) Change {
	for _, entry := range ch.changes {
		if entry.Key == key {
			return entry.Value
		}
	}
	log.Fatalf("No %v in history", key)
	return Change{}
}

func (ch *ChangeHistory) GetAllKeys() []string {
	keys := make([]string, len(ch.changes))
	for i, entry := range ch.changes {
		keys[i] = entry.Key
	}
	return keys
}

func (ch *ChangeHistory) KeyExists(key string) bool {
	for _, entry := range ch.changes {
		if entry.Key == key {
			return true
		}
	}
	return false
}

type Change struct {
	Status    string
	Timestamp time.Time
}

func (c Change) toString() string {
	return fmt.Sprintf("Status: %s, Timestamp: %s\n", c.Status, c.Timestamp.Format(env.CONTAINER_TIME_FORMAT))
}
