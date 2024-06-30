FROM golang:1.20-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN go build -o main .

FROM alpine:latest

ARG EMAIL
ARG EMAIL_PASS 

ENV MAGAZYN_BYSTRZE_EMAIL_ADDR=${EMAIL}
ENV MAGAZYM_BYSTRZE_EMAIL_PASS=${EMAIL_PASS}
ENV SMTP_HOST=smtp.gmail.com
ENV SMTP_PORT=587

RUN apk --no-cache add sqlite
WORKDIR /app
COPY --from=builder /app/main .
COPY  magazyn.db .
RUN mkdir /app/templates
COPY /templates/*.html /app/templates/
EXPOSE 8080

CMD ["./main", "127.0.0.1", "8080", "http://localhost:8080"]
