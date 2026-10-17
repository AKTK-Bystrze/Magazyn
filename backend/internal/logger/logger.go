// Package logger provides structured logging with slog and request context enrichment.
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

var (
	defaultLogger *slog.Logger
	levelVar      *slog.LevelVar
)

func init() {
	levelVar = new(slog.LevelVar)
	levelVar.Set(slog.LevelInfo)
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: levelVar,
	})
	defaultLogger = slog.New(handler)
}

func SetMinLevel(levelStr string) {
	level := strings.ToUpper(levelStr)
	switch level {
	case "DEBUG":
		levelVar.Set(slog.LevelDebug)
	case "INFO":
		levelVar.Set(slog.LevelInfo)
	case "WARN":
		levelVar.Set(slog.LevelWarn)
	case "ERROR":
		levelVar.Set(slog.LevelError)
	default:
		levelVar.Set(slog.LevelInfo)
	}
}
func getUsernameFromContext(ctx context.Context) string {
	if ctx == nil {
		return "[UNAUTHENTICATED]"
	}
	profile := ctx.Value(appcontext.UserProfileContextKey)
	if profile != nil {
		userProfile, ok := profile.(*model.PublicProfilesSelect)
		if ok && userProfile.Username != "" {
			return userProfile.Username
		}
	}
	user := ctx.Value(appcontext.UserContextKey)
	if user == nil {
		return "[UNAUTHENTICATED]"
	}
	return "[AUTHENTICATED]"
}
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
func logWithCtx(ctx context.Context, level slog.Level, msg string) {
	if !defaultLogger.Enabled(ctx, level) {
		return
	}
	attrs := getContextAttrs(ctx)
	defaultLogger.LogAttrs(ctx, level, msg, attrs...)
}

// Debug logs a debug message using the default logger
func Debug(ctx context.Context, message string) {
	logWithCtx(ctx, slog.LevelDebug, message)
}
func Debugf(ctx context.Context, format string, args ...interface{}) {
	logWithCtx(ctx, slog.LevelDebug, fmt.Sprintf(format, args...))
}
func Info(ctx context.Context, message string) {
	logWithCtx(ctx, slog.LevelInfo, message)
}
func Infof(ctx context.Context, format string, args ...interface{}) {
	logWithCtx(ctx, slog.LevelInfo, fmt.Sprintf(format, args...))
}
func Warn(ctx context.Context, message string) {
	logWithCtx(ctx, slog.LevelWarn, message)
}
func Warnf(ctx context.Context, format string, args ...interface{}) {
	logWithCtx(ctx, slog.LevelWarn, fmt.Sprintf(format, args...))
}
func Error(ctx context.Context, message string) {
	logWithCtx(ctx, slog.LevelError, message)
}
func Errorf(ctx context.Context, format string, args ...interface{}) {
	logWithCtx(ctx, slog.LevelError, fmt.Sprintf(format, args...))
}
