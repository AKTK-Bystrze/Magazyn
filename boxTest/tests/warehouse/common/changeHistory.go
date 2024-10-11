package common

import "time"

type ChangeHistory map[string]change

type change struct {
	Status    string
	Timestamp time.Time
}
