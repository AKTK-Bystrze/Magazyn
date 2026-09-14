// Package logger provides structured logging with user context and configurable log levels.
// It supports DEBUG, INFO, WARN, and ERROR levels and automatically includes user information from the request context.
package logger

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"

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

// Logger is a custom logger that includes user context and supports level-based filtering.
// It wraps slog.Logger and adds user context extraction for authenticated requests.
type Logger struct {
	logger   *slog.Logger
	levelVar *slog.LevelVar
}

var defaultLogger *Logger

func init() {
	lvl := new(slog.LevelVar)
	lvl.Set(slog.LevelInfo)
	
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: lvl,
	})
	
	defaultLogger = &Logger{
		logger:   slog.New(handler),
		levelVar: lvl,
	}
}

// GetLogger returns the default logger instance.
func GetLogger() *Logger {
	return defaultLogger
}

// SetMinLevel sets the minimum log level for the default logger.
// Log messages below this level will be suppressed. Defaults to INFO if an invalid level is provided.
func SetMinLevel(levelStr string) {
	level := strings.ToUpper(levelStr)
	switch level {
	case "DEBUG":
		defaultLogger.levelVar.Set(slog.LevelDebug)
	case "INFO":
		defaultLogger.levelVar.Set(slog.LevelInfo)
	case "WARN":
		defaultLogger.levelVar.Set(slog.LevelWarn)
	case "ERROR":
		defaultLogger.levelVar.Set(slog.LevelError)
	default:
		defaultLogger.levelVar.Set(slog.LevelInfo)
	}
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

// getContextAttrs returns common attributes from context
func getContextAttrs(ctx context.Context) []slog.Attr {
	if ctx == nil {
		return nil
	}
	attrs := []slog.Attr{}
	
	username := getUsernameFromContext(ctx)
	if username != "[UNAUTHENTICATED]" {
		attrs = append(attrs, slog.String("username", username))
	}
	
	if traceID, ok := ctx.Value(appcontext.TraceIDContextKey).(string); ok && traceID != "" {
		attrs = append(attrs, slog.String("trace_id", traceID))
	}
	
	return attrs
}

func (l *Logger) logWithCtx(ctx context.Context, level slog.Level, msg string) {
	if !l.logger.Enabled(ctx, level) {
		return
	}
	attrs := getContextAttrs(ctx)
	l.logger.LogAttrs(ctx, level, msg, attrs...)
}

func (l *Logger) Debug(ctx context.Context, message string) {
	l.logWithCtx(ctx, slog.LevelDebug, message)
}

func (l *Logger) Debugf(ctx context.Context, format string, args ...interface{}) {
	l.logWithCtx(ctx, slog.LevelDebug, fmt.Sprintf(format, args...))
}

func (l *Logger) Info(ctx context.Context, message string) {
	l.logWithCtx(ctx, slog.LevelInfo, message)
}

func (l *Logger) Infof(ctx context.Context, format string, args ...interface{}) {
	l.logWithCtx(ctx, slog.LevelInfo, fmt.Sprintf(format, args...))
}

func (l *Logger) Warn(ctx context.Context, message string) {
	l.logWithCtx(ctx, slog.LevelWarn, message)
}

func (l *Logger) Warnf(ctx context.Context, format string, args ...interface{}) {
	l.logWithCtx(ctx, slog.LevelWarn, fmt.Sprintf(format, args...))
}

func (l *Logger) Error(ctx context.Context, message string) {
	l.logWithCtx(ctx, slog.LevelError, message)
}

func (l *Logger) Errorf(ctx context.Context, format string, args ...interface{}) {
	l.logWithCtx(ctx, slog.LevelError, fmt.Sprintf(format, args...))
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
