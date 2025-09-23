# Copilot Instructions for Magazyn Repository

Welcome to the Magazyn repository! This document provides essential guidelines for AI coding agents to be productive in this codebase. It outlines the architecture, workflows, conventions, and integration points specific to this project.

## Project Overview

Magazyn is a dual-project repository consisting of:
1. **Bystrze** (`/src`): The main club application.
2. **BoxTest** (`/boxTest`): A testing application.

The Bystrze application is structured into modular services, each responsible for specific functionalities. The BoxTest application is designed for integration and end-to-end testing.

### Key Components
- **Apps** (`src/apps`): Modular services for the Bystrze application, including:
  - `userManager`: Handles authentication, authorization, and user management.
  - `pages`: Manages publicly accessible pages.
  - `warehouse`: Manages inventory and rentals.
  - `common`: Shared models and services.
- **Main** (`src/main`): Contains the server, database, and templates.
- **BoxTest** (`boxTest`): Contains test utilities, handlers, and test cases.

### Data Flow
- Data models are defined in `src/apps/common/models`.
- Each app has its own controllers, services, and app state.
- APIs follow the structure: `/application/permission/service/operation` (e.g., `/warehouse/admin/reservation/show`).

## Developer Workflows

### Building the Project
- Use Docker Compose to build and run the application:
  ```bash
  docker compose up --build -d
  ```
- Alternatively, build the Postgres container and run the application locally:
  ```bash
  docker build -t postgres -f db-dockerfile .
  ```

### Running Tests
- Unit tests follow the naming convention: `Test_<method>_<state>_<expected>`.
- Run BoxTest integration tests:
  ```bash
  go run main.go --tests
  ```
- Clear test cache:
  ```bash
  go clean -testcache
  ```
- Increase timeout for warehouse tests:
  ```bash
  go test -timeout 60s -run ^Test_reservationMadeAndStartedSameTime$ boxTest/tests/warehouse
  ```

### Debugging
- Enable debug mode by setting the `DEBUG` environment variable to `true`.
- Debug links are printed in the terminal when `DEBUG=true`.

## Project-Specific Conventions

### Environment Variables
- Required:
  - `IP`: Application IP (e.g., `127.0.0.1`).
  - `Port`: Application port (e.g., `8080`).
  - `Server`: Server address for login links (e.g., `http://localhost:8080`).
- Optional:
  - `COOKIE_KEY`: Cookie key (randomly generated if not set).
  - `MAGAZYN_BYSTRZE_EMAIL_ADDR`: Email address for sending emails.
  - `MAGAZYN_BYSTRZE_EMAIL_PASS`: Password for the email account.
  - `SMTP_HOST`: SMTP host (e.g., `smtp.gmail.com`).
  - `SMTP_PORT`: SMTP port (e.g., `587`).
  - `DEBUG`: Debug mode (`true` or `false`).

### API Design
- APIs are defined in the constructor of each app.
- Follow the hierarchical structure: `/application/permission/service/operation`.

### User Roles
- Defined in `src/apps/userManager/auth/access/authorization.go`:
  1. **User**: Can rent equipment.
  2. **Ninja**: Manages news and pages.
  3. **Admin**: Manages reservations and equipment.
  4. **SuperAdmin**: Manages users and permissions.

## Integration Points
- **Email Service**: Configured via environment variables. Uses `MAGAZYN_BYSTRZE_EMAIL_ADDR` and `MAGAZYN_BYSTRZE_EMAIL_PASS`.
- **Database**: PostgreSQL, with schema defined in `schema.sql`.
- **Docker**: Used for building and running the application and tests.

## Key Files and Directories
- `src/apps/common/models`: Shared data models.
- `src/apps/<app>/controllers`: API controllers for each app.
- `boxTest/tests`: Integration and end-to-end tests.
- `README.md`: High-level project documentation.

## Notes for AI Agents
- Follow the modular structure when adding new features.
- Ensure new APIs adhere to the `/application/permission/service/operation` pattern.
- Write tests for new features and place them in the appropriate `boxTest/tests` subdirectory.
- Use environment variables for configuration to maintain flexibility.

For further questions, refer to the [README.md](../README.md) or open an issue in the repository.