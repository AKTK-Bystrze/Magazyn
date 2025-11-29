Go Backend Application Structure

This plan outlines the recommended directory structure for the Go application, emphasizing separation of concerns (Layered/Hexagonal Architecture) for better maintainability, testability, and scalability.

1. Top-Level Directory Structure

The core structure follows Go conventions, separating the entry point (cmd), internal logic (internal), and external dependencies/config (config, pkg).

.
├── cmd/
│ └── api/ # Main entry point for the REST API server
│ └── main.go # Initializes config, database, router, and starts the server
├── config/ # Configuration files and environment loading logic
├── internal/ # ALL core application business logic (cannot be imported by external projects)
│ ├── auth/ # JWT validation, role checking, user context
│ ├── data/ # Repository implementations (database access, SQL)
│ ├── handlers/ # HTTP handlers (controller layer)
│ ├── models/ # Structs for application data (DTOs, database models)
│ ├── services/ # Core business logic (transactional logic, calculations)
│ ├── router/ # Router setup, middleware, and route definitions
│ └── utils/ # General utilities (e.g., pagination helpers, error wrappers)
├── pkg/ # Libraries that can be shared (e.g., custom mailer client)
│ └── mailer/ # SMTP client setup and email sending functionality
└── go.mod
└── Dockerfile

2. Package Responsibilities (Detailed)

cmd/api

The application entry point. It handles all initialization and dependency injection.

File/Function

Responsibility

main.go

1. Load environment variables/configuration.

2. Initialize external services (database, mailer).

3. Instantiate services and inject data repositories.

4. Initialize the HTTP router with all handlers.

5. Start the server (e.g., listening on port 8080).

internal/models

Contains the data structures used throughout the application.

File/Struct

Responsibility

db.go

Generated or manually defined structs mirroring the Supabase tables (PublicProfilesSelect, etc., often with Go's sql.Null\* types).

dto.go

Data Transfer Objects. Structs for request bodies (LoginRequest, CreateReservationRequest) and response payloads (SessionInfo, PaginatedResponse). These use camelCase for JSON.

context.go

Defines the UserContextKey and the struct used to pass authenticated user data (UserID, Role) via the request context.

internal/data

The Repository Layer. This is the only package that should interact directly with the PostgreSQL/Supabase driver.

File/Function

Responsibility

repositories.go

Defines interfaces for all repositories (e.g., UserRepository, EquipmentRepository). Crucial for testing.

user_repo.go

Implements user-related DB operations: GetProfileByID, UpdateCredits.

reservation_repo.go

Implements reservation DB operations: CreateReservation, CheckAvailability, GetReservationByID.

transaction.go

Logic for running database transactions (using pgx.Tx or similar).

internal/services

The Business Logic Layer. This layer orchestrates data operations and enforces application rules. It takes DTOs and returns DTOs, without knowing about HTTP.

File/Function

Responsibility

services.go

Defines interfaces for all services (e.g., ReservationService, CreditService).

reservation_service.go

Implements core logic: Credit Calculation, Transactional Booking (checking balance, deducting credits, creating reservation in a single DB transaction).

credit_service.go

Logic for approving credit requests and logging credit history entries.

internal/handlers

The Controller Layer. This handles HTTP requests, validates input, calls the appropriate service, and formats the response.

File/Function

Responsibility

user_handlers.go

GET /users/me, PATCH /users/:id. Calls UserService.

reservation_handlers.go

POST /reservations, PATCH /reservations/:id. Calls ReservationService.

equipment_handlers.go

GET /equipment, POST /equipment-types. Calls EquipmentService.

error.go

Centralized logic for mapping service errors (e.g., services.ErrNotFound) to HTTP status codes (e.g., 404 Not Found).

internal/auth

Handles authentication and authorization.

File/Function

Responsibility

jwt.go

Logic to parse and validate Supabase JWTs. Extracts user claims.

middleware.go

AuthMiddleware: Extracts and validates JWT, populates user context.

RoleMiddleware: Checks the user's role in the context against the required role (admin, super_admin).

pkg/mailer

Any shared library that could be used outside of this specific application's core logic.

File/Function

Responsibility

client.go

Defines the Mailer interface and the implementation using Gmail SMTP.

templates.go

Loads and processes HTML templates for transactional emails (e.g., confirmation, cancellation).

3. Data Flow Example: Creating a Reservation

This flow demonstrates how the different layers interact for the most complex operation.

handlers (reservation_handlers.go)

Receives POST /reservations.

Parses JSON into models.CreateReservationRequest DTO.

Calls r.ReservationService.Create(ctx, requestBody, userID).

services (reservation_service.go)

Receives the DTO and authenticated userID.

Starts DB Transaction.

Calls r.CreditRepo.CheckBalance(userID).

Calculates Cost based on dates and equipment type.

If Cost > Balance, rolls back and returns services.ErrInsufficientCredits.

Calls r.ReservationRepo.Insert(reservationModel).

Calls r.CreditRepo.DeductCredits(userID, Cost).

Commits DB Transaction.

data (reservation_repo.go, credit_repo.go)

Executes raw SQL queries against the Supabase database (using pgx or similar client).

Handles database errors (e.g., 409 Conflict from the exclusion constraint).

handlers (Back to Controller)

If successful, formats the success response.

Dispatches an asynchronous task (goroutine) to r.Mailer.SendConfirmationEmail(...).
