As a senior frontend developer, your task is to create a detailed implementation plan for a new view in a web application. This plan should be comprehensive and clear enough for another frontend developer to implement the view correctly and efficiently.

First, review the following information:

1. Product Requirements Document (PRD):
<prd>
@documentation/prd/overview.md
@documentation/prd/index.md
</prd>

2. View Description:
<view_description>
**User Mgr** | `/admin/users` | User administration | User list, Credit/Role editing | `UserTable`, `EditUserDialog` | **SuperAdmin** only restrictions.

The Users View is an admin-only view (path: `/admin/users`) that provides user administration capabilities. It displays a master list of all users with their details and allows SuperAdmin users to manage user accounts. Key features include:
- Viewing all users with username, email, credit balance, role, and account status
- Creating new user accounts (SuperAdmin only)
- Editing user profiles: email, credit balance, role, account status (SuperAdmin only)
- Filtering users by role
- Searching users by name or email
- Pagination support
</view_description>

3. User Stories:
<user_stories>
## US-035: SuperAdmin - Create User Account

**Description:** As a superAdmin, I want to create user accounts so new members can access the system.

**Acceptance Criteria:**

- SuperAdmin can access "Create User" form
- SuperAdmin can enter:
  - Username (required, unique)
  - Email address (required, unique, valid format)
  - Initial credit balance (optional, with default value)
  - User role (user, admin, superAdmin)
- System validates all required fields
- System validates email format and uniqueness
- System validates username uniqueness
- New user account is created immediately
- User receives email with login instructions
- User appears in user list

---

## US-036: SuperAdmin - View All Users

**Description:** As a superAdmin, I want to view all users so I can manage the user base.

**Acceptance Criteria:**

- SuperAdmin can access user list
- User list displays:
  - Username
  - Email address
  - Current credit balance
  - Role
  - Account status
  - Date created
- List supports pagination
- SuperAdmin can search users by name or email
- SuperAdmin can filter by role

---

## US-037: SuperAdmin - Edit User Profile

**Description:** As a superAdmin, I want to edit user profiles so I can update user information and manage accounts.

**Acceptance Criteria:**

- SuperAdmin can access edit form from user list or profile page
- SuperAdmin can edit:
  - Email address
  - Credit balance
  - User role
  - Account status (active/inactive)
- Changes to credit balance are logged in user's credit history
- Changes are saved immediately
- Updated information appears in user list

---

## US-039: SuperAdmin - Modify User Credits

**Description:** As a superAdmin, I want to directly modify user credits so I can manage the credit system.

**Acceptance Criteria:**

- SuperAdmin can modify credits from user profile page
- SuperAdmin can add or subtract credits
- SuperAdmin can enter amount and optional note
- Credit change is logged in user's credit history
- User's credit balance updates immediately
- Change appears in user's credit history with superAdmin name
</user_stories>

4. Endpoint Description:
<endpoint_description>
### GET /users

**Description**: List all users (Admin/SuperAdmin only)

**Query Parameters**:

- `page` (integer, default: 1): Page number
- `per_page` (integer, default: 25, values: 10/25/50/100): Items per page
- `role` (string, optional): Filter by role (user/admin/super_admin)
- `search` (string, optional): Search by username or email

**Response** (200 OK):

```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "username": "john_doe",
      "role": "user",
      "credit_balance": 150,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_items": 45,
    "total_pages": 2
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions

---

### GET /users/:id

**Description**: Get specific user profile (Admin/SuperAdmin only)

**Response** (200 OK):

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "john_doe",
  "role": "user",
  "credit_balance": 150,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-11-27T19:56:29Z"
}
```

**Error Responses**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found

---

### POST /users

**Description**: Create new user account (SuperAdmin only)

**Request Body**:

```json
{
  "email": "newuser@example.com",
  "username": "new_user",
  "role": "user",
  "credit_balance": 0
}
```

**Validation**:

- `email`: Required, valid email format, unique
- `username`: Required, unique, alphanumeric with underscores
- `role`: Required, one of: user/admin/super_admin
- `credit_balance`: Optional, integer >= 0, default: 0

**Response** (201 Created):

```json
{
  "id": "uuid",
  "email": "newuser@example.com",
  "username": "new_user",
  "role": "user",
  "credit_balance": 0,
  "created_at": "2025-11-27T19:56:29Z"
}
```

**Error Responses**:

- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Email or username already exists

---

### PATCH /users/:id

**Description**: Update user profile (SuperAdmin only)

**Request Body** (all fields optional):

```json
{
  "email": "updated@example.com",
  "role": "admin",
  "credit_balance": 200
}
```

**Validation**:

- `email`: Valid email format, unique
- `role`: One of: user/admin/super_admin
- `credit_balance`: Integer >= 0

**Response** (200 OK):

```json
{
  "id": "uuid",
  "email": "updated@example.com",
  "username": "john_doe",
  "role": "admin",
  "credit_balance": 200,
  "updated_at": "2025-11-27T19:56:29Z"
}
```

**Business Logic**:

- Credit balance changes are logged in `credit_history` with reason `admin_adjustment`

**Error Responses**:

- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found
- `409 Conflict`: Email already in use
</endpoint_description>

5. Endpoint Implementation:
<endpoint_implementation>
API endpoints to be created at:
- `frontend/src/pages/api/users/index.ts` - GET (list), POST (create)
- `frontend/src/pages/api/users/[id].ts` - GET (detail), PATCH (update)

Follow the API Proxy Pattern from architecture.md - frontend API routes act as proxies to the Go backend.
</endpoint_implementation>

6. Type Definitions:
<type_definitions>
@frontend/src/types/auth.types.ts

Existing types to use:
- `UserProfile` - Full user profile with all fields
- `UserListItem` - User in list view (subset of UserProfile)
- `CreateUserCommand` - Command to create user (POST /users)
- `UpdateUserCommand` - Command to update user (PATCH /users/:id)
- `Enums<"user_role">` - user/admin/super_admin

Additional types may be needed for:
- `UserListResponse` - Paginated list response
- `UserFilters` - Filter/search parameters for the list
</type_definitions>

7. Tech Stack:
<tech_stack>
- **Framework**: Astro 5 (Static Site Generation + Server-Side Rendering)
- **UI Library**: React 19 (for interactive components)
- **Styling**: Tailwind CSS 4 + Shadcn/ui components
- **Language**: TypeScript 5
- **State Management**: React Query (@tanstack/react-query)
- **Authentication**: Supabase Auth
- **Testing**: Vitest + React Testing Library

Key Components to reuse:
- `DataTable` - Reusable Admin table wrapper with server-side pagination, sortable headers, row selection, action column
- `StatusBadge` - For displaying user role/status
- Dialog components from Shadcn/ui for `EditUserDialog` and `CreateUserDialog`
</tech_stack>

8. Coding Standards & Rules:
<coding_standards>
**MUST READ AND FOLLOW** these project rules during implementation:

### Documentation & Code Quality
@.agent/rules/good-practises.md
- Use TSDoc format (`/** ... */`) for all exported functions, interfaces, and types
- Avoid inline comments; use standard documentation comments
- Follow DRY principle: extract repeated UI patterns into reusable components, move logic to hooks
- Use constants files (`constants.ts`) instead of hardcoding values (e.g., roles, pagination sizes)

### Frontend Rules
@frontend/docs/rules/frontend.md
- Use Astro components (.astro) for static content and layout
- Implement React only when interactivity is needed
- Apply ARIA best practices for accessibility

### React Rules
@frontend/docs/rules/react.md
- Use functional components with hooks (no class components)
- Never use "use client" or Next.js directives (Astro project)
- Extract logic into custom hooks in `src/hooks`
- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive calculations
- Use `useId()` for generating unique IDs for accessibility

### Astro Rules
@frontend/docs/rules/astro.md
- Use `export const prerender = false` for API routes
- Use Zod for input validation in API routes
- Extract logic into services in `src/lib/services`
- Use uppercase format for endpoint handlers (GET, POST, PATCH)

### Shadcn/ui Usage
@frontend/docs/rules/ui-shadcn-helper.md
- Components available in `src/components/ui`
- Use `npx shadcn@latest add [component-name]` to install new components
- Project uses "new-york" style variant with "neutral" base color

### Coding Standards
@frontend/docs/coding_standards.md
- **Type Safety First**: Always define types before implementation
- **Fail Fast**: Use early returns and guard clauses
- **Naming Conventions**:
  - React Component File: PascalCase (`UserTable.tsx`)
  - Props Interface: `ComponentNameProps` (`UserTableProps`)
  - Event Handler: `handle + Action` (`handleEditUser`)
  - Callback Prop: `on + Action` (`onUserSelect`)
  - Constants: `SCREAMING_SNAKE_CASE` (`DEFAULT_PAGE_SIZE`)
  - Custom Hook: `use + Name` (`useUserList`)
- **API Proxy Pattern**: Never call backend directly from React; use `/api/` proxies
- **Data Transformation**: Transform snake_case → camelCase at component level
- **QueryProvider**: Wrap components using React Query with `<QueryProvider>`
</coding_standards>

Before creating the final implementation plan, conduct analysis and planning inside <implementation_breakdown> tags in your thinking block. This section can be quite long, as it's important to be thorough.

In your implementation breakdown, execute the following steps:
0. read documenation and rules
1. For each input section (PRD, User Stories, Endpoint Description, Endpoint Implementation, Type Definitions, Tech Stack):
  - Summarize key points
 - List any requirements or constraints
 - Note any potential challenges or important issues
2. Extract and list key requirements from the PRD
3. List all needed main components, along with a brief description of their purpose, needed types, handled events, and validation conditions
4. Create a high-level component tree diagram
5. Identify required DTOs and custom ViewModel types for each view component. Explain these new types in detail, breaking down their fields and associated types.
6. Identify potential state variables and custom hooks, explaining their purpose and how they'll be used
7. List required API calls and corresponding frontend actions
8. Map each user story to specific implementation details, components, or functions
9. List user interactions and their expected outcomes
10. List conditions required by the API and how to verify them at the component level
11. Identify potential error scenarios and suggest how to handle them
12. List potential challenges related to implementing this view and suggest possible solutions

After conducting the analysis, provide an implementation plan in Markdown format with the following sections:

1. Overview: Brief summary of the view and its purpose.
2. View Routing: Specify the path where the view should be accessible.
3. Component Structure: Outline of main components and their hierarchy.
4. Component Details: For each component, describe:
 - Component description, its purpose and what it consists of
 - Main HTML elements and child components that build the component
 - Handled events
 - Validation conditions (detailed conditions, according to API)
 - Types (DTO and ViewModel) required by the component
 - Props that the component accepts from parent (component interface)
5. Types: Detailed description of types required for view implementation, including exact breakdown of any new types or view models by fields and types.
6. State Management: Detailed description of how state is managed in the view, specifying whether a custom hook is required.
7. API Integration: Explanation of how to integrate with the provided endpoint. Precisely indicate request and response types.
8. User Interactions: Detailed description of user interactions and how to handle them.
9. Conditions and Validation: Describe what conditions are verified by the interface, which components they concern, and how they affect the interface state
10. Error Handling: Description of how to handle potential errors or edge cases.
11. Implementation Steps: Step-by-step guide for implementing the view.

Ensure your plan is consistent with the PRD, user stories, and includes the provided tech stack.

The final output should be in English and saved in a file named .ai/frontend/users-view-implementation-plan.md. Do not include any analysis and planning in the final output.

Here's an example of what the output file should look like (content is to be replaced):

```markdown
# View Implementation Plan [View Name]

## 1. Overview
[Brief description of the view and its purpose]

## 2. View Routing
[Path where the view should be accessible]

## 3. Component Structure
[Outline of main components and their hierarchy]

## 4. Component Details
### [Component Name 1]
- Component description [description]
- Main elements: [description]
- Handled interactions: [list]
- Handled validation: [list, detailed]
- Types: [list]
- Props: [list]

### [Component Name 2]
[...]

## 5. Types
[Detailed description of required types]

## 6. State Management
[Description of state management in the view]

## 7. API Integration
[Explanation of integration with provided endpoint, indication of request and response types]

## 8. User Interactions
[Detailed description of user interactions]

## 9. Conditions and Validation
[Detailed description of conditions and their validation]

## 10. Error Handling
[Description of handling potential errors]

## 11. Implementation Steps
1. [Step 1]
2. [Step 2]
3. [...]
```

Begin analysis and planning now. Your final output should consist solely of the implementation plan in English in markdown format, which you will save in the .ai/frontend/users-view-implementation-plan.md file and should not duplicate or repeat any work done in the implementation breakdown.
