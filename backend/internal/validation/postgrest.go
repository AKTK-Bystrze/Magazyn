// It includes helpers for validating UUIDs, dates, enums, and sanitizing PostgREST filter inputs.
package validation

import (
	"fmt"
	"regexp"
	"strings"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"
)

// PostgREST operator characters that need escaping in search filters
var postgrestReplacer = strings.NewReplacer(
	",", "\\,",
	".", "\\.",
	"(", "\\(",
	")", "\\)",
	"=", "\\=",
	"*", "\\*",
	"!", "\\!",
)

// UUID validation regex (standard UUID format with hyphens)
var uuidRegex = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

func SanitizeSearchTerm(input string) string {
	return postgrestReplacer.Replace(input)
}
func ValidateUUID(id string) error {
	if id == "" {
		return types.NewValidationError("UUID cannot be empty", nil)
	}
	if len(id) != constants.UUIDLength {
		return types.NewValidationError(
			fmt.Sprintf("UUID must be %d characters long", constants.UUIDLength),
			map[string]interface{}{"length": len(id)},
		)
	}
	// Convert to lowercase for case-insensitive matching
	lowerID := strings.ToLower(id)
	if !uuidRegex.MatchString(lowerID) {
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
	for _, allowed := range allowedValues {
		if value == allowed {
			return nil
		}
	}
	return types.NewValidationError(
		fmt.Sprintf("Invalid enum value '%s'", value),
		map[string]interface{}{
			"value":   value,
			"allowed": allowedValues,
		},
	)
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
