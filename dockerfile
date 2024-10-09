# Build Stage
FROM golang:1.20-buster AS builder

ENV CGO_ENABLED=1
RUN apt-get update && \
    apt-get install -y gcc sqlite3 libsqlite3-dev

WORKDIR /app

# Copy go.mod and go.sum first to leverage Docker caching
COPY src/go.mod src/go.sum ./
RUN go mod download

# Now copy the entire source code (all .go files and other necessary files)
COPY /src ./

# Build the Go application
RUN go build -o main ./main

# Production Stage
FROM frolvlad/alpine-glibc:latest AS production

# Set build arguments for environment variables
ARG EMAIL
ARG EMAIL_PASS 
ARG DB_PATH

# Configure environment variables
ENV MAGAZYN_BYSTRZE_EMAIL_ADDR=${EMAIL}
ENV MAGAZYN_BYSTRZE_EMAIL_PASS=${EMAIL_PASS}
ENV COOKIE_KEY=${COOKIE_KEY}
ENV SMTP_HOST=smtp.gmail.com
ENV SMTP_PORT=587

# Install dependencies and configure timezone
RUN apk --no-cache add sqlite tzdata
ENV TZ=Europe/Warsaw
RUN ln -sf /usr/share/zoneinfo/Europe/Warsaw /etc/localtime && echo "Europe/Warsaw" > /etc/timezone

# Set the working directory
WORKDIR /app

# Copy the built Go application from the builder stage
COPY --from=builder /app/main . 

# Copy the SQLite database
COPY ${DB_PATH} magazyn.db

# Copy templates
RUN mkdir -p /app/templates
COPY src/main/templates/ /app/templates/

# Expose port 8080 for the application
EXPOSE 8080

# Stage 3: Test Image
FROM production AS test
# Install test dependencies (mock libraries, tools, etc.) for tests
RUN apk --no-cache add bash busybox-extras

# Command to run the application
CMD ["./main", "", "8080", "http://localhost:8080"]
