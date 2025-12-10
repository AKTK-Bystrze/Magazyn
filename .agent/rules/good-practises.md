---
trigger: always_on
---

# Shared Good Practices (Frontend & Backend)

## documentation_standards

**Rule**: Do not use inline comments for documentation. Use standard documentation comments for the respective technology.
**Reasoning**: Inline comments can become outdated and clutter code. Standard documentation tools (Godoc, TSDoc) provide structured, accessible documentation that stays close to definitions.

### TypeScript / Frontend
Use TSDoc format (`/** ... */`) for all exported functions, classes, interfaces, and types.

```typescript
/**
 * Calculates the total price including tax.
 *
 * @param price - The base price.
 * @param taxRate - The tax rate as a decimal.
 * @returns The total price.
 */
export function calculateTotal(price: number, taxRate: number): number {
  return price * (1 + taxRate);
}
```

### Go / Backend
Use Godoc format (`// Name ...`) for all exported types, functions, and methods.

```go
// CalculateTotal returns the price with tax applied.
func CalculateTotal(price float64, taxRate float64) float64 {
	return price * (1 + taxRate)
}
```

## dry_principle

**Rule**: Avoid code duplication. Extract common logic into helper functions, components, or shared libraries.
**Reasoning**: Duplication increases maintenance burden and the risk of inconsistencies.

- **Frontend**: Extract repeated UI patterns into reusable components. Move business logic to hooks or utility functions.
- **Backend**: Use middleware for repeated request handling logic. Extract domain logic into service layers.
- **Shared**: If logic is identical (e.g., validation regex), ensure it is consistent, potentially generating one from the other or documenting the source of truth.

## configuration_management

**Rule**: Do not hardcode values. Use constants files or environment variables.
**Reasoning**: Hardcoded values make code difficult to change and deploy across different environments.

### Constants
Use dedicated files for application-wide constants (e.g., `constants.ts` or `const.go`).

**Bad:**
```typescript
if (status === 'active') { ... }
```

**Good:**
```typescript
import { STATUS_ACTIVE } from './constants';
if (status === STATUS_ACTIVE) { ... }
```

### Environment Variables
Use environment variables for sensitive data, URLs, and configuration that varies by environment (dev, staging, prod).

- **Frontend**: `.env`, accessed via `import.meta.env` (Vite) or `process.env`.
- **Backend**: `.env`, encapuslated in a configuration struct/package.
