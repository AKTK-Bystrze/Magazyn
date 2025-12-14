# View Implementation Plan: Users View

## 1. Overview

The Users View is a SuperAdmin-only administrative interface (`/admin/users`) for managing user accounts in the system. It provides comprehensive user management capabilities including:

- **User List**: Paginated table displaying all users with key information (username, email, credit balance, role, account status, date created)
- **Search & Filter**: Filter users by role, search by username or email
- **Create User**: SuperAdmin can create new user accounts with specified roles and initial credits
- **Edit User**: Update user email, credit balance, role, and account status

This view follows the established patterns from `ReservationListContainer` and uses the project's standard API proxy architecture.

### Documentation Compliance

This plan adheres to:
- **[architecture.md](file:///e:/bystrze/Magazyn/frontend/docs/architecture.md)**: Container/Presentational pattern, API Proxy pattern, Type-Safe Transformer pattern
- **[coding_standards.md](file:///e:/bystrze/Magazyn/frontend/docs/coding_standards.md)**: Naming conventions, error handling, React Query setup
- **[astro.md](file:///e:/bystrze/Magazyn/frontend/docs/rules/astro.md)**: Zod validation for API routes, `export const prerender = false`
- **[react.md](file:///e:/bystrze/Magazyn/frontend/docs/rules/react.md)**: Functional components, custom hooks, `useCallback`/`useMemo`
- **[vitest-unit-testing.md](file:///e:/bystrze/Magazyn/frontend/docs/rules/vitest-unit-testing.md)**: Unit tests for transformers

## 2. View Routing

**Path**: `/admin/users`

**Access Control**:
- Requires authenticated session
- Restricted to `admin` and `super_admin` roles for viewing
- Create/Edit operations restricted to `super_admin` role only

**Existing Page**: `frontend/src/pages/admin/users.astro` (currently mock placeholder)

## 3. Component Structure

```
pages/admin/users.astro (Astro Page)
└── AdminLayout
    └── UserListContainer (React, client:load)
        ├── QueryProvider (wrapper)
        └── UserListContainerInner
            ├── Alert (success/error messages)
            ├── UserFilters
            │   ├── Input (search)
            │   └── Select (role filter)
            ├── UserTable
            │   ├── Table/TableHeader/TableBody/TableRow/TableCell
            │   ├── RoleBadge (for role display)
            │   └── Button (edit actions)
            ├── Pagination
            ├── CreateUserDialog
            │   ├── Dialog/DialogContent/DialogHeader
            │   ├── Input (email, username, credit_balance)
            │   ├── Select (role)
            │   └── Button (Create/Cancel)
            └── EditUserDialog
                ├── Dialog/DialogContent/DialogHeader
                ├── Input (email, credit_balance)
                ├── Select (role)
                └── Button (Save/Cancel)
```

## 4. Component Details

### 4.1 UserListContainer

**Description**: Main container component that orchestrates the user management view. Wraps inner content with `QueryProvider` for React Query support. Handles all state management and dialog coordination.

**Main Elements**:
- Success/Error Alert messages with auto-dismiss
- `UserFilters` component for search and filtering
- `UserTable` component for data display
- `Pagination` component for page navigation
- `CreateUserDialog` and `EditUserDialog` for user management

**Handled Interactions**:
- `onSearch(query: string)`: Updates search filter
- `onRoleFilterChange(role: string)`: Updates role filter
- `onPageChange(page: number)`: Updates current page
- `onCreateUser()`: Opens create user dialog
- `onEditUser(user: UserListItem)`: Opens edit dialog with selected user
- `onDialogClose()`: Closes active dialog

**Types**:
- `UserListContainerProps` (mode: 'admin')
- Internal: `UserListItem[]`, `UserListResponse`, `UserFilterState`

**Props**:
```typescript
interface UserListContainerProps {
  /** Mode of the container - always 'admin' for this view */
  mode?: 'admin';
}
```

---

### 4.2 UserFilters

**Description**: Filter bar component for searching and filtering users. Includes search input with debounce and role dropdown filter.

**Main Elements**:
- Search `Input` with magnifying glass icon
- Role `Select` dropdown with all/user/admin/super_admin options
- Reset filters button (optional)

**Handled Interactions**:
- `onChange` for search input (debounced 300ms)
- `onValueChange` for role select

**Validation**:
- Search query max length: 255 characters

**Types**:
- `UserFilterState`

**Props**:
```typescript
interface UserFiltersProps {
  filters: UserFilterState;
  onFilterChange: <K extends keyof UserFilterState>(key: K, value: UserFilterState[K]) => void;
  onReset?: () => void;
}
```

---

### 4.3 UserTable

**Description**: Data table displaying user list with columns for username, email, credits, role, created date, and actions. Uses Shadcn Table components.

**Main Elements**:
- `Table` with `TableHeader` and `TableBody`
- Columns: Username, Email, Credits, Role, Created At, Actions
- `RoleBadge` for role display
- Edit `Button` in actions column (visible to super_admin only)

**Handled Interactions**:
- `onEdit(user: UserListItem)`: Triggers edit dialog opening
- Row hover effects for visual feedback

**Types**:
- `UserListItem[]`

**Props**:
```typescript
interface UserTableProps {
  users: UserListItem[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  onEdit: (user: UserListItem) => void;
}
```

---

### 4.4 RoleBadge

**Description**: Styled badge component for displaying user role. Similar to `StatusBadge` pattern.

**Main Elements**:
- Shadcn `Badge` component with role-based variant

**Types**:
- `Enums<"user_role">`

**Props**:
```typescript
interface RoleBadgeProps {
  role: Enums<"user_role">;
  className?: string;
}
```

---

### 4.5 CreateUserDialog

**Description**: Modal dialog for creating new user accounts. Contains form with validation for email, username, role, and optional initial credit balance.

**Main Elements**:
- `Dialog` with `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- `Input` for email (required)
- `Input` for username (required)
- `Select` for role (required, defaults to 'user')
- `Input` for initial credit balance (optional, defaults to 0)
- Create and Cancel `Button`s

**Handled Interactions**:
- Form submission with validation
- Field change handlers
- Cancel/close dialog

**Validation Conditions**:
- `email`: Required, valid email format, unique (validated by backend)
- `username`: Required, unique, alphanumeric with underscores only (validated by backend)
- `role`: Required, must be one of: user/admin/super_admin
- `creditBalance`: Optional, integer >= 0, defaults to 0

**Types**:
- `CreateUserCommand`

**Props**:
```typescript
interface CreateUserDialogProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (command: CreateUserCommand) => Promise<void>;
}
```

---

### 4.6 EditUserDialog

**Description**: Modal dialog for editing existing user accounts. Pre-populated with current user data. Allows modification of email, credit balance, and role.

**Main Elements**:
- `Dialog` with `DialogContent`, `DialogHeader`, `DialogTitle`
- `Input` for email (editable)
- `Input` for credit balance (editable)
- `Select` for role (editable)
- Display-only: Username (not editable after creation)
- Save and Cancel `Button`s

**Handled Interactions**:
- Form submission with validation
- Field change handlers
- Cancel/close dialog

**Validation Conditions**:
- `email`: Valid email format if provided, unique (validated by backend)
- `role`: Must be one of: user/admin/super_admin
- `creditBalance`: Integer >= 0

**Types**:
- `UpdateUserCommand`, `UserProfile`

**Props**:
```typescript
interface EditUserDialogProps {
  isOpen: boolean;
  user: UserListItem | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (userId: string, command: UpdateUserCommand) => Promise<void>;
}
```

## 5. Types

### 5.1 Existing Types (from `auth.types.ts`)

```typescript
// Already defined - use as-is
type UserProfile = {
  id: string;
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance: number;
  createdAt: string;
  updatedAt: string | null;
};

type UserListItem = {
  id: string;
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance: number;
  createdAt: string;
};

type CreateUserCommand = {
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance?: number;
};

type UpdateUserCommand = {
  email?: string;
  role?: Enums<"user_role">;
  creditBalance?: number;
};
```

### 5.2 New Types (to add in `auth.types.ts`)

```typescript
/**
 * Filter state for user list queries
 */
export type UserFilterState = {
  page: number;
  perPage: number;
  role: Enums<"user_role"> | "ALL";
  search?: string;
};

/**
 * Paginated user list response
 * Matches GET /users response structure
 */
export type UserListResponse = {
  users: UserListItem[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
};
```

### 5.3 Backend DTO Types (for transformer layer)

Create `src/types/users/dtos.types.ts` (per architecture.md domain organization):

```typescript
/**
 * Backend response DTO for user list (snake_case)
 * Source: backend/internal/types/user_types.go
 */
export interface UserListResponseDTO {
  users: Array<{
    id: string;
    email: string;
    username: string;
    role: string;
    credit_balance: number;
    created_at: string;
  }>;
  pagination: {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
}

/**
 * Backend response DTO for single user (snake_case)
 */
export interface UserProfileDTO {
  id: string;
  email: string;
  username: string;
  role: string;
  credit_balance: number;
  created_at: string;
  updated_at: string | null;
}
```

### 5.4 Zod Validation Schemas

Create `src/lib/validators/user.validator.ts` (per astro.md Zod requirement):

```typescript
import { z } from 'zod';

/**
 * Zod schema for user list query parameters
 * Used in API proxy route for input validation
 */
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().refine(
    (val) => [10, 25, 50, 100].includes(val),
    { message: 'Per page must be one of: 10, 25, 50, 100' }
  ).default(25),
  role: z.enum(['user', 'admin', 'super_admin']).optional(),
  search: z.string().max(255).optional(),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

/**
 * Zod schema for create user command
 */
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string()
    .min(1, 'Username is required')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  role: z.enum(['user', 'admin', 'super_admin']),
  credit_balance: z.number().int().min(0).default(0),
});

/**
 * Zod schema for update user command
 */
export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  role: z.enum(['user', 'admin', 'super_admin']).optional(),
  credit_balance: z.number().int().min(0).optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' }
);
```

## 6. State Management

### 6.1 Custom Hook: `useUsers`

Create `src/hooks/useUsers.ts` following the `useReservations` pattern:

```typescript
/**
 * Hook for managing user list with filtering, pagination, and CRUD operations
 * Handles React Query caching and state synchronization
 */
export function useUsers(options: UseUsersOptions = {}): UseUsersReturn {
  // Filter state management
  const [filters, setFilters] = useState<UserFilterState>({...DEFAULT_FILTERS});
  
  // React Query for list
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users', 'list', filters],
    queryFn: () => usersApi.list(filters),
    staleTime: QUERY_STALE_TIME_MS,
  });
  
  // Mutations for create/update
  const createMutation = useMutation({...});
  const updateMutation = useMutation({...});
  
  // Filter helpers
  const setFilter = useCallback(...);
  const resetFilters = useCallback(...);
  
  // Action handlers
  const createUser = useCallback(...);
  const updateUser = useCallback(...);
  
  return {
    data,
    isLoading,
    error,
    filters,
    setFilter,
    resetFilters,
    refetch,
    createUser,
    updateUser,
    isMutating: createMutation.isPending || updateMutation.isPending,
  };
}
```

### 6.2 State Variables

| State | Type | Purpose |
|-------|------|---------|
| `filters` | `UserFilterState` | Current filter/pagination state |
| `createDialogOpen` | `boolean` | Create user dialog visibility |
| `editDialogOpen` | `boolean` | Edit user dialog visibility |
| `selectedUser` | `UserListItem \| null` | User being edited |
| `successMessage` | `string \| null` | Success feedback message |
| `errorMessage` | `string \| null` | Error feedback message |

## 7. API Integration

### 7.1 API Proxy Routes

**Create** `src/pages/api/users/index.ts`:

```typescript
export const prerender = false;

/**
 * GET /api/users - List all users (Admin/SuperAdmin)
 */
export const GET: APIRoute = async ({ locals, request }) => {
  const token = locals.accessToken;
  if (!token) return unauthorized();
  
  const url = new URL(request.url);
  const backendUrl = new URL(`${BACKEND_URL}/users`);
  backendUrl.search = url.search;
  
  const response = await fetch(backendUrl.toString(), {
    method: 'GET',
    headers: buildHeaders(token),
  });
  
  return new Response(response.body, { status: response.status });
};

/**
 * POST /api/users - Create new user (SuperAdmin only)
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const token = locals.accessToken;
  if (!token) return unauthorized();
  
  const body = await request.json();
  const response = await fetch(`${BACKEND_URL}/users`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(body),
  });
  
  return new Response(response.body, { status: response.status });
};
```

**Create** `src/pages/api/users/[id].ts`:

```typescript
export const prerender = false;

/**
 * GET /api/users/:id - Get user detail (Admin/SuperAdmin)
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const { id } = params;
  const token = locals.accessToken;
  if (!token) return unauthorized();
  
  const response = await fetch(`${BACKEND_URL}/users/${id}`, {
    method: 'GET',
    headers: buildHeaders(token),
  });
  
  return new Response(response.body, { status: response.status });
};

/**
 * PATCH /api/users/:id - Update user (SuperAdmin only)
 */
export const PATCH: APIRoute = async ({ params, locals, request }) => {
  const { id } = params;
  const token = locals.accessToken;
  if (!token) return unauthorized();
  
  const body = await request.json();
  const response = await fetch(`${BACKEND_URL}/users/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(token),
    body: JSON.stringify(body),
  });
  
  return new Response(response.body, { status: response.status });
};
```

### 7.2 API Client Service

**Create** `src/lib/api/users-api.ts`:

```typescript
export const usersApi = {
  /**
   * Fetches paginated list of users
   */
  list: async (filters: Partial<UserFilterState>): Promise<UserListResponse> => {
    const params = {
      page: filters.page,
      per_page: filters.perPage,
      role: filters.role !== 'ALL' ? filters.role : undefined,
      search: filters.search,
    };
    const { data } = await api.get<unknown>('/api/users', params);
    return transformUserListResponse(data);
  },
  
  /**
   * Creates new user account
   */
  create: async (command: CreateUserCommand): Promise<UserProfile> => {
    const body = transformCreateUserCommand(command);
    const { data } = await api.post<unknown>('/api/users', body);
    return transformUserProfile(data);
  },
  
  /**
   * Updates existing user
   */
  update: async (id: string, command: UpdateUserCommand): Promise<UserProfile> => {
    const body = transformUpdateUserCommand(command);
    const { data } = await api.patch<unknown>(`/api/users/${id}`, body);
    return transformUserProfile(data);
  },
};
```

### 7.3 Data Transformer

**Create** `src/lib/transformers/user.transformer.ts`:

```typescript
/**
 * Transforms backend user list response to frontend format
 */
export function transformUserListResponse(data: unknown): UserListResponse {
  const dto = data as UserListResponseDTO;
  return {
    users: dto.users.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as Enums<"user_role">,
      creditBalance: user.credit_balance,
      createdAt: user.created_at,
    })),
    pagination: {
      page: dto.pagination.page,
      perPage: dto.pagination.per_page,
      totalItems: dto.pagination.total_items,
      totalPages: dto.pagination.total_pages,
    },
  };
}

/**
 * Transforms create command to backend format
 */
export function transformCreateUserCommand(command: CreateUserCommand): Record<string, unknown> {
  return {
    email: command.email,
    username: command.username,
    role: command.role,
    credit_balance: command.creditBalance ?? 0,
  };
}

/**
 * Transforms update command to backend format
 */
export function transformUpdateUserCommand(command: UpdateUserCommand): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (command.email !== undefined) result.email = command.email;
  if (command.role !== undefined) result.role = command.role;
  if (command.creditBalance !== undefined) result.credit_balance = command.creditBalance;
  return result;
}
```

## 8. User Interactions

| Interaction | Component | Handler | Outcome |
|-------------|-----------|---------|---------|
| Type in search | `UserFilters` | `handleSearchChange` | Debounced filter update, reset to page 1 |
| Select role filter | `UserFilters` | `handleRoleChange` | Filter update, reset to page 1 |
| Click page button | `Pagination` | `handlePageChange` | Load new page of results |
| Click "Create User" | Header area | `handleCreateClick` | Open CreateUserDialog |
| Click "Edit" on row | `UserTable` | `handleEditClick` | Open EditUserDialog with user data |
| Submit create form | `CreateUserDialog` | `handleCreateSubmit` | Create user, close dialog, refresh list |
| Submit edit form | `EditUserDialog` | `handleEditSubmit` | Update user, close dialog, refresh list |
| Close dialog | Dialogs | `handleDialogClose` | Close dialog, clear selected user |

## 9. Conditions and Validation

### 9.1 Access Control Conditions

| Condition | Where Checked | Effect |
|-----------|---------------|--------|
| User not authenticated | `users.astro` | Redirect to login |
| User role not admin/super_admin | `users.astro` | Redirect to dashboard |
| User role not super_admin | `UserTable`, `Header` | Hide Create/Edit buttons |

### 9.2 Form Validation Conditions

**CreateUserDialog**:
| Field | Validation | Error Message |
|-------|------------|---------------|
| email | Required | "Email is required" |
| email | Valid format | "Invalid email format" |
| username | Required | "Username is required" |
| username | Alphanumeric + underscores | "Username can only contain letters, numbers, and underscores" |
| role | Required | "Role is required" |
| creditBalance | Integer >= 0 | "Credit balance must be a non-negative integer" |

**EditUserDialog**:
| Field | Validation | Error Message |
|-------|------------|---------------|
| email | Valid format if provided | "Invalid email format" |
| creditBalance | Integer >= 0 if provided | "Credit balance must be a non-negative integer" |

### 9.3 Backend Validation (handled by API)

- Email uniqueness: 409 Conflict response
- Username uniqueness: 409 Conflict response
- Permission checks: 403 Forbidden response

## 10. Error Handling

### 10.1 API Errors

| HTTP Status | Cause | User Message |
|-------------|-------|--------------|
| 401 | Session expired | "Session expired. Please log in again." (redirect to login) |
| 403 | Insufficient permissions | "You don't have permission to perform this action." |
| 404 | User not found | "User not found." |
| 409 | Email/username conflict | "Email or username already exists." |
| 400 | Validation error | Display validation error from response |
| 500 | Server error | "An unexpected error occurred. Please try again." |

### 10.2 Network Errors

- Display: "Unable to connect to server. Please check your connection."
- Allow retry action

### 10.3 Empty States

| Scenario | Display |
|----------|---------|
| No users found | "No users found" message with reset filters option |
| Loading | Skeleton loader in table |
| Error | Error alert with retry button |

## 11. Implementation Steps

### Phase 1: Types & API Infrastructure

1. [ ] Add `UserFilterState` and `UserListResponse` types to `auth.types.ts`
2. [ ] Create `src/lib/transformers/user.transformer.ts` with transformation functions
3. [ ] Create `src/lib/api/users-api.ts` with API client methods
4. [ ] Create `src/pages/api/users/index.ts` (GET list, POST create)
5. [ ] Create `src/pages/api/users/[id].ts` (GET detail, PATCH update)

### Phase 2: Hook & State Management

6. [ ] Add user-related constants to `constants.ts` (role labels, variants, filter options)
7. [ ] Create `src/hooks/useUsers.ts` hook following `useReservations` pattern

### Phase 3: Components

8. [ ] Create `src/components/users/RoleBadge.tsx`
9. [ ] Create `src/components/users/UserFilters.tsx`
10. [ ] Create `src/components/users/UserTable.tsx`
11. [ ] Create `src/components/users/CreateUserDialog.tsx`
12. [ ] Create `src/components/users/EditUserDialog.tsx`
13. [ ] Create `src/components/users/UserListContainer.tsx`

### Phase 4: Page Integration

14. [ ] Update `src/pages/admin/users.astro` to use `UserListContainer`
15. [ ] Add proper access control checks for SuperAdmin operations

### Phase 5: Unit Testing

16. [ ] Create `src/lib/transformers/__tests__/user.transformer.test.ts`
    - Test `transformUserListResponse` with valid data
    - Test `transformUserListResponse` with edge cases (empty list, null values)
    - Test `transformCreateUserCommand` and `transformUpdateUserCommand`
17. [ ] Create `src/lib/validators/__tests__/user.validator.test.ts`
    - Test `userListQuerySchema` validation
    - Test `createUserSchema` validation (valid/invalid email, username patterns)
    - Test `updateUserSchema` validation

### Phase 6: Verification

18. [ ] Run linter (`npm run lint`)
19. [ ] Run type check (`npx astro check`)
20. [ ] Run unit tests (`npm test`)
21. [ ] Manual testing:
    - [ ] View user list (admin view)
    - [ ] Search users
    - [ ] Filter by role
    - [ ] Pagination
    - [ ] Create user (super_admin only)
    - [ ] Edit user (super_admin only)
    - [ ] Verify error handling for conflicts
    - [ ] Verify permission restrictions

---

## Appendix: Required Shadcn Components

Verify these components are installed (check `src/components/ui/`):

- [x] `table` - For UserTable
- [x] `dialog` - For CreateUserDialog, EditUserDialog
- [x] `input` - For form fields
- [x] `select` - For role selection
- [x] `button` - For actions
- [x] `badge` - For RoleBadge
- [x] `alert` - For success/error messages
- [ ] `skeleton` - For loading states (install if missing: `npx shadcn@latest add skeleton`)
- [ ] `label` - For form labels (install if missing: `npx shadcn@latest add label`)

## Appendix: File Organization Summary

```
src/
├── components/users/           # NEW: User management components
│   ├── UserListContainer.tsx
│   ├── UserTable.tsx
│   ├── UserFilters.tsx
│   ├── RoleBadge.tsx
│   ├── CreateUserDialog.tsx
│   └── EditUserDialog.tsx
│
├── hooks/
│   └── useUsers.ts             # NEW: User CRUD hook
│
├── lib/
│   ├── api/
│   │   └── users-api.ts        # NEW: Users API client
│   ├── transformers/
│   │   ├── user.transformer.ts # NEW: Data transformers
│   │   └── __tests__/
│   │       └── user.transformer.test.ts  # NEW
│   └── validators/
│       ├── user.validator.ts   # NEW: Zod schemas
│       └── __tests__/
│           └── user.validator.test.ts    # NEW
│
├── pages/
│   ├── admin/
│   │   └── users.astro         # MODIFY: Replace mock with real
│   └── api/users/
│       ├── index.ts            # NEW: GET list, POST create
│       └── [id].ts             # NEW: GET detail, PATCH update
│
└── types/
    └── auth.types.ts           # MODIFY: Add UserFilterState, UserListResponse
```
