# UI Selectors Convention for Playwright E2E Testing

## Overview

This document defines the convention for adding stable `data-testid` selectors to UI components for Playwright E2E testing.

## Strategy: `data-testid` Attributes

| Priority | Selector Type | Use Case |
|----------|--------------|----------|
| 1️⃣ Primary | `data-testid` | All interactive elements, containers, forms |
| 2️⃣ Secondary | `getByRole()` | Semantic elements (buttons, links, inputs) |
| 3️⃣ Fallback | `getByText()` | Static labels (avoid for critical flows) |

## Naming Convention

Use **kebab-case** with semantic structure:

```
{feature}-{element}-{variant?}
```

### Examples

| Pattern | Example | Element |
|---------|---------|---------|
| Container | `equipment-list-container` | Main view wrapper |
| Table | `reservations-table` | Data table |
| Row | `equipment-row-{id}` | Dynamic row with ID |
| Button | `login-submit-button` | Action button |
| Dialog | `cancel-reservation-dialog` | Modal/dialog |
| Input | `equipment-search-input` | Form input |
| Filter | `status-filter-select` | Filter control |

## Implementation Rules

### 1. Place selectors INSIDE components

```tsx
// ✅ Good: selector inside component
export function LoginForm() {
  return (
    <form data-testid="login-form">
      <input data-testid="login-email-input" />
      <button data-testid="login-submit-button">Login</button>
    </form>
  );
}

// ❌ Bad: selector on parent that renders component
<div data-testid="login-form">
  <LoginForm />
</div>
```

### 2. Use consistent prefixes per feature

| Feature | Prefix |
|---------|--------|
| Authentication | `auth-`, `login-` |
| Equipment | `equipment-` |
| Reservations | `reservation-` |
| Users | `user-` |
| Credits | `credits-` |
| Navigation | `nav-`, `sidebar-` |
| Admin | `admin-` |

### 3. Add IDs to dynamic elements

```tsx
// For lists/tables with dynamic data
<tr data-testid={`equipment-row-${equipment.id}`}>
  <button data-testid={`equipment-edit-button-${equipment.id}`}>Edit</button>
</tr>
```

### 4. Dialog/Modal pattern

```tsx
<Dialog>
  <DialogContent data-testid="confirm-archive-dialog">
    <DialogHeader data-testid="confirm-archive-dialog-header" />
    <DialogFooter>
      <Button data-testid="confirm-archive-cancel-button">Cancel</Button>
      <Button data-testid="confirm-archive-confirm-button">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Playwright Usage Examples

```typescript
// Basic selectors
await page.getByTestId('login-submit-button').click();
await page.getByTestId('equipment-search-input').fill('Kayak');

// Dynamic selectors
await page.getByTestId(`equipment-row-${equipmentId}`).click();

// Combine with role for better semantics
await page.getByTestId('reservation-form')
  .getByRole('button', { name: 'Submit' })
  .click();

// Wait for elements
await page.getByTestId('reservations-table').waitFor();
```

## Critical Elements Checklist

Elements that **MUST** have `data-testid`:

- [ ] Forms and form submit buttons
- [ ] Navigation links and menus
- [ ] Data tables and table rows
- [ ] Action buttons (edit, delete, cancel, confirm)
- [ ] Dialogs and modal content
- [ ] Filter controls
- [ ] Search inputs
- [ ] Status badges (for assertions)
- [ ] Loading states
- [ ] Error messages

## Anti-patterns

| ❌ Avoid | ✅ Instead |
|----------|-----------|
| `data-testid="btn1"` | `data-testid="login-submit-button"` |
| `data-testid="div"` | `data-testid="equipment-card-container"` |
| Using CSS classes for testing | Use `data-testid` |
| Changing testids frequently | Treat as API contract |
