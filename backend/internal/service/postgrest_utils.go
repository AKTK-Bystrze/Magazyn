package service

import "strings"

// ============================================================================
// Postgrest Error Utilities
// ============================================================================

// IsNotFoundError checks if the error is a Postgrest "not found" error (PGRST116)
func IsNotFoundError(err error) bool {
	return err != nil && strings.Contains(err.Error(), "PGRST116")
}

// IsUniqueViolationError checks if the error is a Postgrest unique constraint violation (PGRST409)
func IsUniqueViolationError(err error) bool {
	return err != nil && strings.Contains(err.Error(), "PGRST409")
}

// IsForeignKeyViolationError checks if the error is a Postgrest foreign key violation
func IsForeignKeyViolationError(err error) bool {
	return err != nil && strings.Contains(err.Error(), "PGRST204")
}
