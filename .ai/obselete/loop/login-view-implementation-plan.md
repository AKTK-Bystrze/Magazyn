# View Implementation Plan Login

## 1. Overview
The Login View serves as the secure entry point for the Equipment Rental System. It implements a passwordless authentication flow using Magic Links. The interface is designed to be distraction-free, accessible, and responsive, guiding users to simply enter their email address to receive a login link.

## 2. View Routing
- **Path**: `/login`
- **Access**: Public (Redirects to dashboard if already authenticated)

## 3. Component Structure
```text
src/layouts/AuthLayout.astro (or minimal MainLayout configuration)
└── src/pages/login.astro
    └── src/components/auth/LoginFormContainer.tsx (Client Island)
        ├── src/components/auth/LoginForm.tsx
        └── src/components/auth/MagicLinkSent.tsx
```

## 4. Component Details

### `src/components/auth/LoginFormContainer.tsx`
- **Description**: The main orchestrator for the login logic. It manages the state transitions between the input form and the success message. It wraps the interactive elements in a React Client Island (`client:load`).
- **Main elements**: `<div>` wrapper, conditionally rendering `LoginForm` or `MagicLinkSent`.
- **Handled interactions**:
  - Handles the `onLoginSuccess` callback from `LoginForm` to switch views.
  - Manages the overall view state (Form vs Success).
- **Handled validation**: N/A (Delegates to children).
- **Types**: 
  - `LoginViewState`: `'idle' | 'success'`
- **Props**: None.

### `src/components/auth/LoginForm.tsx`
- **Description**: The form component containing the email input and submit logic.
- **Main elements**:
  - `<form>` element.
  - `<Label>` (Shadcn) for "Email".
  - `<Input>` (Shadcn) for email entry (type="email").
  - `<Button>` (Shadcn) for submission (shows spinner when loading).
  - `<Alert>` (Shadcn) for error display.
- **Handled interactions**:
  - `onSubmit`: Triggers validation and API call.
  - `onChange`: Updates local email state.
- **Handled validation**:
  - **Email Required**: Field cannot be empty.
  - **Email Format**: Must satisfy regex for valid email format.
- **Types**:
  - `LoginFormData`: `{ email: string }`
- **Props**:
  - `onSuccess: () => void`: Callback to trigger parent state change.

### `src/components/auth/MagicLinkSent.tsx`
- **Description**: A static Feedback component shown after the link is successfully sent.
- **Main elements**:
  - Success Icon (e.g., Lucide `CheckCircle` or `Mail`).
  - Heading "Check your email".
  - Informational text instructing the user to click the link.
  - Optional: "Back to login" button to reset state (in case of typo).
- **Handled interactions**:
  - "Try again" / "Back": Resets parent state to `'idle'`.
- **Handled validation**: None.
- **Types**: None.
- **Props**:
  - `onReset: () => void`: Callback to reset the flow.

## 5. Types

### DTOs (Data Transfer Objects)
Types matching the backend API contract.

```typescript
// Request Payload for POST /auth/login
export interface LoginRequestDTO {
  email: string;
}

// Response for POST /auth/login
export interface LoginResponseDTO {
  message: string;
}

// Error Response
export interface ApiErrorDTO {
  error: string; // or specific structure based on backend
}
```

### View Models / Component Types
Types used for frontend state and props.

```typescript
// Form State
export interface LoginFormData {
  email: string;
}

// Validation Errors
export interface FormErrors {
  email?: string;
  general?: string;
}
```

## 6. State Management
State is managed locally within the React components, as this view is isolated and does not require global store persistence.

- **`LoginFormContainer`**:
  - `viewState`: `useState<'idle' | 'success'>('idle')`.
- **`LoginForm`**:
  - `email`: Managed via `react-hook-form` or simple `useState`.
  - `isLoading`: Managed via `useMutation` status (TanStack Query) or local boolean.
  - `error`: Managed via `useMutation` error object or local state.

**Hooks**:
- `useLoginMutation`: A custom hook wrapping `useMutation` from `@tanstack/react-query` to call `POST /auth/login`.

## 7. API Integration

### Endpoint
- **URL**: `POST /auth/login`
- **Content-Type**: `application/json`

### Integration Function
```typescript
import { api } from '@/lib/api'; // user's axios/fetch instance

export const login = async (data: LoginRequestDTO): Promise<LoginResponseDTO> => {
  const response = await api.post('/auth/login', data);
  return response.data;
};
```

## 8. User Interactions
1.  **Initial Load**: User sees the Login Form. Email input is auto-focused.
2.  **Typing**: User types email. Validation errors clear if previously present.
3.  **Submit (Enter/Click)**:
    -   Input is disabled.
    -   Button shows "Sending..." or spinner.
    -   Requests sent to API.
4.  **Success**:
    -   Form disappears.
    -   `MagicLinkSent` component fades in.
    -   User sees "Login link sent to [email]".
5.  **Error**:
    -   Input re-enabled.
    -   Error alert appears above/below input: "Email is invalid" or "Connection failed".

## 9. Conditions and Validation
-   **Client-Side**:
    -   `required`: Email must not be empty.
    -   `pattern`: Must match standard email regex.
-   **Server-Side** (handled via API error responses):
    -   `400 Bad Request`: Invalid email format (fallback).
    -   `404 Not Found`: Email not registered.

## 10. Error Handling
-   **Validation Errors**: Displayed inline below the input field using Shadcn `FormMessage` or simple text.
-   **Network/Server Errors**:
    -   `404 (Not Found)`: Display a friendly message: "This email is not registered. Please contact an administrator."
    -   `500 (Server Error)` or Network Fail: Display "Something went wrong. Please try again later."
    -   `429 (Too Many Requests)`: "Too many attempts. Please wait a moment."

## 11. Implementation Steps
1.  **Define Types**: Create DTOs in `src/types/auth.ts` or `src/lib/api/types.ts`.
2.  **Create API Client**: Add `login` function in `src/lib/api/auth.ts`.
3.  **Implement `MagicLinkSent`**: Create the success view component.
4.  **Implement `LoginForm`**:
    -   Setup React Hook Form (optional, or simple state).
    -   Integrate Zod validation.
    -   Connect `useLoginMutation`.
    -   Handle Error/Loading states.
5.  **Implement `LoginFormContainer`**: orchestrate the switch between Form and Success views.
6.  **Create Page**: Implement `src/pages/login.astro` with the container.
7.  **Styling**: Apply Shadcn UI components and centering styles.
8.  **Routing**: Verify page loads at `/login`.
