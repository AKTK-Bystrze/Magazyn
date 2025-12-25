// Package types defines custom error types and sentinel errors for the application.
// It provides structured error handling with error codes, messages, and details for different HTTP status scenarios.
package types

import (
	"errors"
	"fmt"
)

// ============================================================================
// Custom Error Types
// ============================================================================

// AppError is the base error type with code and message
type AppError struct {
	Code    string
	Message string
	Details interface{}
}

func (e *AppError) Error() string {
	return e.Message
}

// NotFoundError represents a resource not found error (404)
type NotFoundError struct {
	AppError
}

// NewNotFoundError creates a new NotFoundError
func NewNotFoundError(resource, id string) *NotFoundError {
	return &NotFoundError{
		AppError: AppError{
			Code:    "NOT_FOUND",
			Message: fmt.Sprintf("%s not found", resource),
			Details: map[string]string{"id": id},
		},
	}
}

// ConflictError represents a conflict error (409)
type ConflictError struct {
	AppError
}

// NewConflictError creates a new ConflictError
func NewConflictError(message string, details interface{}) *ConflictError {
	return &ConflictError{
		AppError: AppError{
			Code:    "CONFLICT",
			Message: message,
			Details: details,
		},
	}
}

// ValidationError represents input validation error (400)
type ValidationError struct {
	AppError
}

// NewValidationError creates a new ValidationError
func NewValidationError(message string, details interface{}) *ValidationError {
	return &ValidationError{
		AppError: AppError{
			Code:    "VALIDATION_ERROR",
			Message: message,
			Details: details,
		},
	}
}

// ForbiddenError represents insufficient permissions error (403)
type ForbiddenError struct {
	AppError
}

// NewForbiddenError creates a new ForbiddenError
func NewForbiddenError(message string) *ForbiddenError {
	return &ForbiddenError{
		AppError: AppError{
			Code:    "FORBIDDEN",
			Message: message,
		},
	}
}

// InternalError represents internal server error (500)
type InternalError struct {
	AppError
}

// NewInternalError creates a new InternalError
func NewInternalError(message string, err error) *InternalError {
	details := map[string]interface{}{}
	if err != nil {
		details["error"] = err.Error()
	}

	return &InternalError{
		AppError: AppError{
			Code:    "INTERNAL_ERROR",
			Message: message,
			Details: details,
		},
	}
}

// ============================================================================
// Sentinel Errors
// ============================================================================

// ErrProfileNotFound indicates that a user profile was not found in the database
var ErrProfileNotFound = errors.New("profile not found")
