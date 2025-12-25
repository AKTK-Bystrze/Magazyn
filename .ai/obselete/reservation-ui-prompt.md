As a senior frontend developer, your task is to create a detailed implementation plan for a new view in a web application. This plan should be comprehensive and clear enough for another frontend developer to implement the view correctly and efficiently.

First, review the following information:

1. Product Requirements Document (PRD):
<prd>
@[documentation/prd/overview.md] - Complete product overview including functional requirements for reservations
@[documentation/prd/stories/reservations_creation.md] - User stories for reservation creation flow
@[documentation/prd/stories/equipment_browsing.md] - User stories for equipment search and selection
@[documentation/prd/stories/calendar.md] - User stories for calendar availability views
</prd>

2. View Description:
<view_description>
**Reservation Cart** (`/reservations/create`) - Configure rental

This view allows users to create new equipment reservations by selecting equipment items, choosing rental dates, and confirming the booking. The view handles:
- Multi-item selection and cart management
- Date range selection with availability checking
- Cost calculation and credit balance validation
- Confirmation screen before finalizing
- Integration with equipment search and calendar views

Key Components: `CartItemList`, `DateRangePicker`, `CostEstimator`

Key Features:
- Session-based cart storage (sessionStorage)
- Real-time availability validation
- Credit sufficiency checking
- Email notification on successful creation
- Audit trail creation

User Journey:
1. User selects equipment items from Equipment Search view
2. User navigates to Reservation Cart
3. User selects start and end dates for all items
4. System validates availability and credit balance
5. User reviews confirmation screen with total cost and remaining balance
6. User confirms to create reservation
7. System creates reservations, deducts credits, and sends email notification
8. User is redirected to My Reservations view
</view_description>

3. User Stories:
<user_stories>
**Primary User Stories:**
- US-009: Select Multiple Items for Reservation
- US-010: Create Reservation - Date Selection
- US-011: Create Reservation - Availability Check
- US-012: Create Reservation - Confirmation Screen
- US-013: Create Reservation - Finalization
- US-042: Handle Invalid Date Range
- US-045: View Reservation Email Notification
- US-046: Handle Reservation Conflict
- US-050: Handle Concurrent Reservation Attempts

**Related User Stories:**
- US-006: Search Equipment - for item selection
- US-007: View Equipment Details - for viewing item specs
- US-040: Handle Insufficient Credits - validation during booking

**Acceptance Criteria Summary:**
- User can select multiple equipment items
- User can view and remove items from cart
- User selects start and end dates with validation
- System checks availability for all selected items and dates
- System prevents reservation if any item unavailable or insufficient credits
- Confirmation screen shows all items, costs, and remaining balance
- Credits deducted immediately on confirmation
- Email notification sent with all reservation details
- Clear error messages for validation failures
- Handle concurrent reservation attempts gracefully
</user_stories>

4. Endpoint Description:
<endpoint_description>
**POST /reservations** - Create new reservation(s)

Request Body:
```json
{
  "reservations": [
    {
      "equipment_id": "uuid",
      "start_date": "2025-12-01",
      "end_date": "2025-12-05"
    }
  ],
  "user_id": "uuid" // optional, admin only
}
```

Validation:
- `reservations`: Required, array with at least 1 item
- `equipment_id`: Required, must exist and not be archived/broken
- `start_date`: Required, must be in future
- `end_date`: Required, must be >= start_date
- `user_id`: Optional, admin only

Response (201 Created):
```json
{
  "reservations": [
    {
      "id": "uuid",
      "equipment_id": "uuid",
      "equipment_name": "Red Kayak",
      "start_date": "2025-12-01",
      "end_date": "2025-12-05",
      "status": "PENDING",
      "credit_cost": 20
    }
  ],
  "total_credit_cost": 32,
  "remaining_balance": 118
}
```

Business Logic:
- Creates separate reservation record for each equipment item
- Checks availability using exclusion constraint (prevents overlapping)
- Validates user has sufficient credits for total cost
- Deducts credits immediately and logs in credit_history
- Sends email notification with all reservation details
- Creates initial audit trail entry
- Back-to-back reservations allowed (end_date == next start_date)

Error Responses:
- 400 Bad Request: Validation errors, invalid dates
- 401 Unauthorized: Not authenticated
- 404 Not Found: Equipment not found
- 409 Conflict: Equipment unavailable for selected dates, insufficient credits, equipment broken/archived

**GET /equipment/:id/availability** - Check equipment availability

Query Parameters:
- `start_date` (date, required): Start date (YYYY-MM-DD)
- `end_date` (date, required): End date (YYYY-MM-DD)

Response (200 OK):
```json
{
  "equipment_id": "uuid",
  "is_available": false,
  "conflicting_reservations": [
    {
      "id": "uuid",
      "start_date": "2025-12-01",
      "end_date": "2025-12-05",
      "status": "PENDING"
    }
  ]
}
```

**GET /users/me** - Get current user profile (for credit balance)

Response includes:
```json
{
  "id": "uuid",
  "credit_balance": 150
}
```
</endpoint_description>

5. Endpoint Implementation:
<endpoint_implementation>
@[frontend/src/pages/api/reservations.ts] - API endpoint implementations for reservation operations
@[frontend/src/pages/api/equipment.ts] - API endpoint for equipment availability checking
@[frontend/src/pages/api/users.ts] - API endpoint for user profile and credit balance
</endpoint_implementation>

6. Type Definitions:
<type_definitions>
@[frontend/src/types/equipment.types.ts] - Contains all relevant types including:
- `Equipment` - Equipment item with type information
- `EquipmentAvailability` - Availability check response
- `CreateReservationItem` - Single reservation item for creation
- `CreateReservationsCommand` - Command to create reservations
- `CreateReservationsResponse` - Response after creating reservations
- `Reservation` - Reservation with user and equipment information
- `Enums<"reservation_status">` - Reservation status enum
- `Enums<"equipment_status">` - Equipment status enum
</type_definitions>

7. Tech Stack:
<tech_stack>
@[.agent/rules/shared.md] - Contains tech stack information:
- Astro 5 (SSR and static pages)
- TypeScript 5
- React 19 (for dynamic components)
- Tailwind 4 (styling)
- Shadcn/ui (UI components)
- TanStack Query (API data fetching and caching)
- Nano Stores (global UI state - credit balance)
- sessionStorage (reservation cart persistence)
- Sonner (toast notifications)
</tech_stack>

Before creating the final implementation plan, conduct analysis and planning inside <implementation_breakdown> tags in your thinking block. This section can be quite long, as it's important to be thorough.

In your implementation breakdown, execute the following steps:
0. read documentation and rules
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

The final output should be in English and saved in a file named .ai/reservation-view-implementation-plan.md. Do not include any analysis and planning in the final output.

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

Begin analysis and planning now. Your final output should consist solely of the implementation plan in English in markdown format, which you will save in the .ai/reservation-view-implementation-plan.md file and should not duplicate or repeat any work done in the implementation breakdown.
