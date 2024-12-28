# Build Stage
FROM golang:1.20-buster AS builder

ENV CGO_ENABLED=1
RUN apt-get update && \
    apt-get install -y gcc sqlite3 libsqlite3-dev

WORKDIR /app

COPY src/go.mod src/go.sum ./
RUN go mod download

COPY  /src ./

RUN go build -o main ./main

# Production Stage
FROM frolvlad/alpine-glibc:latest AS production

ARG EMAIL
ARG EMAIL_PASS 
ARG DSN 
ARG DEBUG=False

ENV MAGAZYN_BYSTRZE_EMAIL_ADDR=${EMAIL}
ENV MAGAZYN_BYSTRZE_EMAIL_PASS=${EMAIL_PASS}
ENV COOKIE_KEY=${COOKIE_KEY}
ENV SMTP_HOST=smtp.gmail.com
ENV SMTP_PORT=587
ENV DEBUG=${DEBUG}
ENV DATABASE_URL =${DSN}

RUN apk --no-cache add sqlite tzdata
ENV TZ=Europe/Warsaw
RUN ln -sf /usr/share/zoneinfo/Europe/Warsaw /etc/localtime && echo "Europe/Warsaw" > /etc/timezone

WORKDIR /app

COPY --from=builder /app/main . 

RUN mkdir -p /app/templates
COPY src/main/templates/ /app/templates/

EXPOSE 8080

# Test stage
FROM production AS test

RUN apk --no-cache add bash busybox-extras

CMD ["./main","127.0.0.1", "8080", "http://localhost:8080"]
