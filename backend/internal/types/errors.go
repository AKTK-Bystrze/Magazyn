// It provides structured error handling with error codes, messages, and details for different HTTP status scenarios.
package types

import (
	"errors"
	"fmt"
)

// Custom Error Types
// AppError is the base error type with code and message
type AppError struct {
	Code    string
	Message string
	Details interface{}
}

func (e *AppError) Error() string {
	return e.Message
}

type NotFoundError struct {
	AppError
}

func NewNotFoundError(resource, id string) *NotFoundError {
	return &NotFoundError{
		AppError: AppError{
			Code:    "NOT_FOUND",
			Message: fmt.Sprintf("%s not found", resource),
			Details: map[string]string{"id": id},
		},
	}
}

type ConflictError struct {
	AppError
}

func NewConflictError(message string, details interface{}) *ConflictError {
	return &ConflictError{
		AppError: AppError{
			Code:    "CONFLICT",
			Message: message,
			Details: details,
		},
	}
}

type ValidationError struct {
	AppError
}

func NewValidationError(message string, details interface{}) *ValidationError {
	return &ValidationError{
		AppError: AppError{
			Code:    "VALIDATION_ERROR",
			Message: message,
			Details: details,
		},
	}
}

type ForbiddenError struct {
	AppError
}

func NewForbiddenError(message string) *ForbiddenError {
	return &ForbiddenError{
		AppError: AppError{
			Code:    "FORBIDDEN",
			Message: message,
		},
	}
}

type InternalError struct {
	AppError
}

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

// Sentinel Errors
// ErrProfileNotFound indicates that a user profile was not found in the database
var ErrProfileNotFound = errors.New("profile not found")
