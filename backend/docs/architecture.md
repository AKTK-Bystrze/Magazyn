# Backend Architecture & Design Patterns

This document details the architectural choices and software design patterns used in the Magazyn backend. Understanding these patterns is crucial for maintaining code consistency and quality.

## 1. Architectural Style

We follow a **Layered Architecture** with elements of **Hexagonal Architecture (Ports and Adapters)**. This promotes separation of concerns, testability, and improved maintainability.

### Layers

1.  **Transport/Handler Layer** (`internal/handler`)
    *   **Responsibility**: Handles HTTP requests, parses JSON bodies, validates constraints, calls the Service Layer, and writes HTTP responses.
    *   **Dependencies**: Depends only on the Service Layer interfaces.
    *   **Goal**: Keep validation logic simple; delegate business logic to services.

2.  **Service/Business Logic Layer** (`internal/service`)
    *   **Responsibility**: Implements the core business rules of the application. Orchestrates calls to repositories and other services.
    *   **Dependencies**: Depends on Repository interfaces, not concrete implementations.
    *   **Goal**: Pure Golang code, agnostic of HTTP or specific database driver.

3.  **Data Access/Repository Layer** (`internal/repository`)
    *   **Responsibility**: Abstracts the data storage mechanism. Performs CRUD operations against Supabase/PostgreSQL.
    *   **Dependencies**: Depends on database drivers/clients.
    *   **Goal**: Provide a clean interface for data access, protecting services from SQL/DB specifics.

4.  **Domain/Entities Layer** (`internal/types`)
    *   **Responsibility**: Defines shared structures (DTOs, Domain Models) used across layers.
    *   **Goal**: Common language for data representation.

## 2. Design Patterns

### Repository Pattern
*   **Description**: Used to abstract the data layer. We define interfaces (e.g., `EquipmentRepository`) that outline the contract for data access. Concrete implementations (`supabase/equipment_repository.go`) fulfill these contracts.
*   **Why**: Allows us to swap the underlying database technology without changing business logic and makes unit testing easier by allowing mock repositories.

### Dependency Injection (DI)
*   **Description**: Dependencies (Repositories, Services) are passed into structs (Handlers, Services) via constructor functions (`New...`) rather than being instantiated inside them. Setup is performed in `main.go`.
*   **Why**: Promotes loose coupling and enables easy mocking of dependencies during testing.
*   **Example**: `NewAuthService(repo repository.AuthRepository)` accepts any implementation of `AuthRepository`.

### Adapter Pattern
*   **Description**: We use adapters to make external third-party libraries compatible with our internal interfaces.
*   **Example**: `internal/service/common/adapters.go` adapts the Supabase Go client to match our `AuthRepository` needs, wrapping specific method calls and potentially transforming errors or data.

### Factory Pattern
*   **Description**: We use "Constructor" functions (e.g., `NewAuthHandler`, `NewAuthService`) which act as simple factories to initialize structs with their required dependencies.
*   **Why**: Ensures that objects are always created in a valid state with all necessary dependencies provided.

### Middleware Pattern
*   **Description**: Used to intercept HTTP requests for cross-cutting concerns before they reach the handler.
*   **Examples**:
    *   **Auth Middleware**: Verifies JWT tokens and injects User/Profile context.
    *   **RBAC Middleware**: Enforces Role-Based Access Control.
    *   **CORS Middleware**: Manages Cross-Origin Resource Sharing headers.

### Data Transfer Object (DTO)
*   **Description**: specific structs (e.g., `EquipmentDTO`, `CreateEquipmentCommand`) are used to transfer data between the API client and the backend.
*   **Why**: Decouples the internal database schema (`database.types.go`) from the external API contract, allowing independent evolution of API and Database.

### Atomic Operations & Stored Procedures (RPC)
*   **Description**: For database operations requiring ACID guarantees across multiple tables (e.g., modifying `reservations` and `profiles` simultaneously), we utilize PostgreSQL Stored Procedures (Functions) called via Supabase RPC.
*   **Why**: The standard Supabase/PostgREST HTTP API does not support client-managed transactions (BEGIN/COMMIT). Stored Procedures ensure data consistency and integrity for critical business flows.
*   **Examples**:
    *   `create_reservation_atomic`: Handles reservation creation, credit balance checking, deduction, and conflict detection in a single transaction.
    *   `refund_reservation_credits`: Atomically refunds credits to a user and logs the transaction upon reservation cancellation.

### Authentication Contexts: User Token vs Service Role Key
*   **User Token (RLS)**: For standard operations, we use the user's JWT (forwarded from the frontend) with the public/anon key. This adheres to Supabase's Row-Level Security (RLS) policies, ensuring users only access their own data.
    *   **Usage**: Most Repository methods (e.g., `GetProfile`, `CreateReservation`).
*   **Service Role Key (Auth Admin Only)**: For privileged Supabase Auth API operations that cannot use RLS.
    *   **Usage**: `AuthRepository.CreateUser` (Admin User Creation via Supabase Auth Admin API), Test infrastructure.
    *   **Security**: This key is kept secret on the backend and never exposed to the client. Used only for operations that have no RLS-based alternative.

## 3. Error Handling Design

We use a layered error handling approach:

1.  **Repositories**: Return wrapped errors including underlying cause (for debugging) but mapped to generic error states where possible (e.g., `pgx.ErrNoRows` -> `types.NewNotFoundError`).
2.  **Services**: Handle business rule violations and return domain logic errors (e.g., "insufficient credits").
3.  **Handlers**: Map domain/system errors to appropriate HTTP Status Codes (404, 400, 500) using helper functions in `internal/handler/common/http_utils.go`.
