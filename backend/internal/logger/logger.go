package logger

import (
	"context"
	"fmt"
	"log"
	"magazyn/backend/internal/appcontext"
	model "magazyn/backend/internal/types"
	"os"
	"time"
)

// LogLevel represents the severity of a log message
type LogLevel string

const (
	DEBUG LogLevel = "DEBUG"
	INFO  LogLevel = "INFO"
	WARN  LogLevel = "WARN"
	ERROR LogLevel = "ERROR"
)

// Logger is a custom logger that includes user context
type Logger struct {
	logger *log.Logger
}

var defaultLogger *Logger

func init() {
	defaultLogger = &Logger{
		logger: log.New(os.Stdout, "", log.LstdFlags),
	}
}

// GetLogger returns the default logger instance
func GetLogger() *Logger {
	return defaultLogger
}

// getUsernameFromContext extracts the username from the context
func getUsernameFromContext(ctx context.Context) string {
	if ctx == nil {
		return "[UNAUTHENTICATED]"
	}

	// Try to get user profile from context (set by middleware)
	profile := ctx.Value(appcontext.UserProfileContextKey)
	if profile != nil {
		// Type assert to PublicProfilesSelect
		userProfile, ok := profile.(*model.PublicProfilesSelect)
		if ok && userProfile.Username != "" {
			return userProfile.Username
		}
	}

	// Fallback: check if there's a user in context at all
	user := ctx.Value(appcontext.UserContextKey)
	if user == nil {
		return "[UNAUTHENTICATED]"
	}

	// If we have a user but no profile, return a generic authenticated marker
	return "[AUTHENTICATED]"
}

// formatMessage formats a log message with user context
func (l *Logger) formatMessage(ctx context.Context, level LogLevel, message string) string {
	username := getUsernameFromContext(ctx)
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	return fmt.Sprintf("[%s] [%s] [%s] %s", timestamp, level, username, message)
}

// Debug logs a debug message with user context
func (l *Logger) Debug(ctx context.Context, message string) {
	l.logger.Println(l.formatMessage(ctx, DEBUG, message))
}

// Debugf logs a formatted debug message with user context
func (l *Logger) Debugf(ctx context.Context, format string, args ...interface{}) {
	message := fmt.Sprintf(format, args...)
	l.Debug(ctx, message)
}

// Info logs an info message with user context
func (l *Logger) Info(ctx context.Context, message string) {
	l.logger.Println(l.formatMessage(ctx, INFO, message))
}

// Infof logs a formatted info message with user context
func (l *Logger) Infof(ctx context.Context, format string, args ...interface{}) {
	message := fmt.Sprintf(format, args...)
	l.Info(ctx, message)
}

// Warn logs a warning message with user context
func (l *Logger) Warn(ctx context.Context, message string) {
	l.logger.Println(l.formatMessage(ctx, WARN, message))
}

// Warnf logs a formatted warning message with user context
func (l *Logger) Warnf(ctx context.Context, format string, args ...interface{}) {
	message := fmt.Sprintf(format, args...)
	l.Warn(ctx, message)
}

// Error logs an error message with user context
func (l *Logger) Error(ctx context.Context, message string) {
	l.logger.Println(l.formatMessage(ctx, ERROR, message))
}

// Errorf logs a formatted error message with user context
func (l *Logger) Errorf(ctx context.Context, format string, args ...interface{}) {
	message := fmt.Sprintf(format, args...)
	l.Error(ctx, message)
}

// Convenience functions for the default logger

// Debug logs a debug message using the default logger
func Debug(ctx context.Context, message string) {
	defaultLogger.Debug(ctx, message)
}

// Debugf logs a formatted debug message using the default logger
func Debugf(ctx context.Context, format string, args ...interface{}) {
	defaultLogger.Debugf(ctx, format, args...)
}

// Info logs an info message using the default logger
func Info(ctx context.Context, message string) {
	defaultLogger.Info(ctx, message)
}

// Infof logs a formatted info message using the default logger
func Infof(ctx context.Context, format string, args ...interface{}) {
	defaultLogger.Infof(ctx, format, args...)
}

// Warn logs a warning message using the default logger
func Warn(ctx context.Context, message string) {
	defaultLogger.Warn(ctx, message)
}

// Warnf logs a formatted warning message using the default logger
func Warnf(ctx context.Context, format string, args ...interface{}) {
	defaultLogger.Warnf(ctx, format, args...)
}

// Error logs an error message using the default logger
func Error(ctx context.Context, message string) {
	defaultLogger.Error(ctx, message)
}

// Errorf logs a formatted error message using the default logger
func Errorf(ctx context.Context, format string, args ...interface{}) {
	defaultLogger.Errorf(ctx, format, args...)
}
