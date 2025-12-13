
# Go Makefile

.PHONY: test-unit test-integration test-all build run

# Default target
all: build

# Run unit tests only (excludes integration tests)
test-unit:
	go test ./internal/... -v -short

# Run integration tests only (might require specific environment)
test-integration:
	go test ./internal/... -v -tags=integration

# Run all tests
test-all:
	go test ./internal/... -v -tags=integration

# Build the application
build:
	go build -o bin/api.exe ./cmd/api

# Run the application
run:
	go run ./cmd/api/main.go

# Run linter
lint:
	golangci-lint run ./...
