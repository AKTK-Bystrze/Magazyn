---
trigger: always_on
---

## BACKEND

### Guidelines for GO

#### GIN

- Use middleware for cross-cutting concerns like authentication, logging, and request validation
- Implement structured logging with context for better debugging of {{error_scenarios}}
- Use binding validation for request payloads with custom validators for complex business rules
- Apply the context package properly to manage request-scoped values and cancellation signals
- Implement proper error handling with custom error types and consistent HTTP status codes
- Use the gin.H map for JSON responses consistently across handlers for {{api_endpoints}}

#### ECHO

- Use the middleware system for cross-cutting concerns with proper ordering based on execution requirements
- Implement the context package for request-scoped values and proper cancellation propagation
- Use the validator package for request validation of {{input_types}} with custom validation rules
- Apply proper route grouping for related endpoints and consistent path prefixing
- Implement structured error handling with custom error types and appropriate HTTP status codes
- Use context timeouts for external service calls to prevent resource leaks when handling {{external_dependencies}}

