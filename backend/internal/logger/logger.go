// Package logger provides structured logging with user context and configurable log levels.
// It supports DEBUG, INFO, WARN, and ERROR levels and automatically includes user information from the request context.
package logger

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"magazyn/backend/internal/appcontext"
	model "magazyn/backend/internal/types"
)

// LogLevel represents the severity of a log message.
// Valid levels are DEBUG, INFO, WARN, and ERROR, ordered from least to most severe.
type LogLevel string

// Log level constants for filtering and categorizing log messages.
const (
	DEBUG LogLevel = "DEBUG"
	INFO  LogLevel = "INFO"
	WARN  LogLevel = "WARN"
	ERROR LogLevel = "ERROR"
)

// logLevelValue returns numeric value for comparison
func logLevelValue(level LogLevel) int {
	switch level {
	case DEBUG:
		return 0
	case INFO:
		return 1
	case WARN:
		return 2
	case ERROR:
		return 3
	default:
		return 1 // Default to INFO
	}
}

// Logger is a custom logger that includes user context and supports level-based filtering.
// It wraps Go's standard logger and adds user context extraction for authenticated requests.
type Logger struct {
	logger   *log.Logger
	minLevel LogLevel
}

var defaultLogger *Logger

func init() {
	defaultLogger = &Logger{
		logger:   log.New(os.Stdout, "", log.LstdFlags),
		minLevel: INFO, // Default to INFO level
	}
}

// GetLogger returns the default logger instance.
func GetLogger() *Logger {
	return defaultLogger
}

// SetMinLevel sets the minimum log level for the default logger.
// Log messages below this level will be suppressed. Defaults to INFO if an invalid level is provided.
func SetMinLevel(levelStr string) {
	level := LogLevel(levelStr)
	switch level {
	case DEBUG, INFO, WARN, ERROR:
		defaultLogger.minLevel = level
	default:
		defaultLogger.minLevel = INFO
	}
}

// shouldLog checks if a message at the given level should be logged
func (l *Logger) shouldLog(level LogLevel) bool {
	return logLevelValue(level) >= logLevelValue(l.minLevel)
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
	if l.shouldLog(DEBUG) {
		l.logger.Println(l.formatMessage(ctx, DEBUG, message))
	}
}

// Debugf logs a formatted debug message with user context
func (l *Logger) Debugf(ctx context.Context, format string, args ...interface{}) {
	if l.shouldLog(DEBUG) {
		message := fmt.Sprintf(format, args...)
		l.Debug(ctx, message)
	}
}

// Info logs an info message with user context
func (l *Logger) Info(ctx context.Context, message string) {
	if l.shouldLog(INFO) {
		l.logger.Println(l.formatMessage(ctx, INFO, message))
	}
}

// Infof logs a formatted info message with user context
func (l *Logger) Infof(ctx context.Context, format string, args ...interface{}) {
	if l.shouldLog(INFO) {
		message := fmt.Sprintf(format, args...)
		l.Info(ctx, message)
	}
}

// Warn logs a warning message with user context
func (l *Logger) Warn(ctx context.Context, message string) {
	if l.shouldLog(WARN) {
		l.logger.Println(l.formatMessage(ctx, WARN, message))
	}
}

// Warnf logs a formatted warning message with user context
func (l *Logger) Warnf(ctx context.Context, format string, args ...interface{}) {
	if l.shouldLog(WARN) {
		message := fmt.Sprintf(format, args...)
		l.Warn(ctx, message)
	}
}

// Error logs an error message with user context
func (l *Logger) Error(ctx context.Context, message string) {
	if l.shouldLog(ERROR) {
		l.logger.Println(l.formatMessage(ctx, ERROR, message))
	}
}

// Errorf logs a formatted error message with user context
func (l *Logger) Errorf(ctx context.Context, format string, args ...interface{}) {
	if l.shouldLog(ERROR) {
		message := fmt.Sprintf(format, args...)
		l.Error(ctx, message)
	}
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
