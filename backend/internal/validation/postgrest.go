// Package validation provides helpers for validating UUIDs, dates, enums, and sanitizing PostgREST filter inputs.
package validation

import (
	"fmt"
	"slices"
	"strings"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"

	"github.com/google/uuid"
)

var postgrestReplacer = strings.NewReplacer(
	",", "\\,",
	".", "\\.",
	"(", "\\(",
	")", "\\)",
	"=", "\\=",
	"*", "\\*",
	"!", "\\!",
)

func SanitizeSearchTerm(input string) string {
	return postgrestReplacer.Replace(input)
}
func ValidateUUID(id string) error {
	if len(id) != constants.UUIDLength {
		return types.NewValidationError("Invalid UUID format", map[string]string{"id": id})
	}
	if _, err := uuid.Parse(id); err != nil {
		return types.NewValidationError(
			"Invalid UUID format",
			map[string]string{"id": id},
		)
	}
	return nil
}
func ValidateEnum(value string, allowedValues []string) error {
	if value == "" {
		return types.NewValidationError("Enum value cannot be empty", nil)
	}
	if !slices.Contains(allowedValues, value) {
		return types.NewValidationError(
			fmt.Sprintf("Invalid enum value '%s'", value),
			map[string]interface{}{
				"value":   value,
				"allowed": allowedValues,
			},
		)
	}
	return nil
}
func ValidateStringLength(str string, minLength, maxLength int) error {
	length := len(str)
	if length < minLength || length > maxLength {
		return types.NewValidationError(
			fmt.Sprintf("String length %d is out of range [%d, %d]", length, minLength, maxLength),
			map[string]int{"length": length, "min": minLength, "max": maxLength},
		)
	}
	return nil
}
