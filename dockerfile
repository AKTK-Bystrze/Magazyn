# Etap budowy
FROM golang:1.20-buster AS builder

ENV CGO_ENABLED=1
RUN apt-get update && \
    apt-get install -y gcc sqlite3 libsqlite3-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN go build -o main .

# Etap produkcji
FROM frolvlad/alpine-glibc:latest

ARG EMAIL
ARG EMAIL_PASS 

ENV MAGAZYN_BYSTRZE_EMAIL_ADDR=${EMAIL}
ENV MAGAZYM_BYSTRZE_EMAIL_PASS=${EMAIL_PASS}
ENV SMTP_HOST=smtp.gmail.com
ENV SMTP_PORT=587

RUN apk --no-cache add sqlite tzdata
ENV TZ=Europe/Warsaw
RUN ln -sf /usr/share/zoneinfo/Europe/Warsaw /etc/localtime && echo "Europe/Warsaw" > /etc/timezone

WORKDIR /app
COPY --from=builder /app/main .
COPY  magazyn.db .
RUN mkdir /app/templates
COPY /templates/*.html /app/templates/
EXPOSE 8080

CMD ["./main", "", "8080", ""]
