# API Request Flow - Complete Lifecycle

This diagram shows the complete lifecycle of a reservation request from user input to database persistence and response.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend (Astro/React)
    participant GO as Go Backend
    participant DB as Supabase (Postgres)
    participant SMTP as Gmail

    Note over U, FE: 1. Input Phase (React State)
    U->>FE: Selects Dates & Equipment
    FE->>FE: Validate Input (Zod/React Hook Form)

    Note over FE, GO: 2. Transport Phase (JSON)
    FE->>GO: POST /reservations <br/>{ "equipment_id": "...", "start": "2025-12-01", ... }

    Note over GO: 3. Decoding Phase (Go Structs)
    GO->>GO: Decode JSON to <br/>dto.CreateReservationReq
    GO->>GO: Validate Logic (Check Credits, Dates)

    Note over GO, DB: 4. Persistence Phase (DB Models)
    GO->>DB: Check Availability (Exclusion Constraint)
    GO->>DB: INSERT into reservations <br/>(Maps DTO -> db.Reservation)
    DB-->>GO: Return Created Row (db.Reservation)

    Note over GO, DB: 5. Side Effects
    GO->>DB: INSERT into credit_history
    GO->>SMTP: Send Email Confirmation

    Note over GO, FE: 6. Response Phase (Public DTO)
    GO->>GO: Map db.Reservation -> <br/>dto.ReservationResponse
    GO-->>FE: 201 Created <br/>{ "id": "...", "status": "PENDING", ... }

    Note over FE: 7. Consumption Phase
    FE->>FE: TanStack Query Cache Update
    FE-->>U: Show Success Toast
```

## Phase Breakdown

### 1. Input Phase (Frontend)

- User interacts with React form
- Client-side validation using Zod/React Hook Form
- Prevents invalid requests from reaching the backend

### 2. Transport Phase (HTTP)

- Frontend sends JSON request to Go backend
- Uses camelCase naming convention
- Includes JWT token for authentication

### 3. Decoding Phase (Backend)

- Go backend decodes JSON to DTO struct
- Validates business logic (credit balance, date conflicts)
- Maps DTO to database entities

### 4. Persistence Phase (Database)

- Checks equipment availability using exclusion constraints
- Inserts reservation record
- Returns created row with generated ID

### 5. Side Effects

- Records credit transaction in history
- Sends email confirmation via Gmail SMTP
- Maintains audit trail

### 6. Response Phase (Backend)

- Maps database entity to public DTO
- Formats dates and enriches data
- Returns JSON response to frontend

### 7. Consumption Phase (Frontend)

- TanStack Query updates cache
- React components re-render with new data
- User sees success feedback
