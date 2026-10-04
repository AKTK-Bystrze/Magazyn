---
trigger: always_on
---

## BACKEND

### Guidelines for GO

- **Architecture**: Enforce Layered Architecture (`handler` -> `service` -> `repository`). Business logic strictly belongs in the `service` layer.
- **Routing**: Use the standard library `net/http` with `http.NewServeMux()`. Do not use external frameworks like Gin or Echo.
- **Contexts**: Always propagate `context.Context` from HTTP requests down through services to repositories for logging, cancellation, and identity injection.
- **Dependency Injection**: Pass dependencies (e.g., repositories) via Constructor Injection functions (`NewAuthService(repo)`). Do not use global state.
- **Database / PostgREST**: 
  - Use `supabase-go` for database ops and `gotrue-go` for auth operations. 
  - Always sanitize search terms for `ILIKE` clauses using `validation.SanitizeSearchTerm(term)` to prevent PostgREST injection.
- **Error Handling**: Use structured domain errors (e.g., `types.NotFoundError`, `types.ConflictError`). Map them to proper HTTP status codes at the `handler` level using `http_utils.go`.
- **Testing**: Group tests using `t.Run()` and verify context extraction explicitly. Check `.agent/rules/go-testing.md` for specific unit testing rules.
