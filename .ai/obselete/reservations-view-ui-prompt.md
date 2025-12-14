As a senior frontend developer, your task is to create a detailed implementation plan for the "Reservations View" in a web application. This plan should be comprehensive and clear enough for another frontend developer to implement the view correctly and efficiently.

First, review the following information:

1. Product Requirements Document (PRD):
<prd>
### 3.5 Reservation System

3.5.1 Users select start and end dates for reservations (not fixed duration).

3.5.2 Multi-item selection:
- UI allows selecting multiple items as a single transaction
- Backend creates separate reservations for each item
- Confirmation screen shows total cost for all items

3.5.3 Reservation creation workflow:
- User selects equipment items
- User selects start and end dates
- System checks availability and credit balance
- System displays confirmation screen with:
  - Selected items and details
  - Total credit cost
  - Remaining credit balance after reservation
- User confirms or cancels
- System creates reservations and deducts credits
- Email notification sent

3.5.4 Availability checking:
- System prevents conflicting reservations at creation
- Users see clear error messages explaining why an item is unavailable:
  - Item already reserved for selected dates
  - Item is broken/unavailable
  - Insufficient credits
  - Invalid date range

3.5.5 Back-to-back reservations are allowed (end time equals next reservation start time).

3.5.6 Users can modify dates of their own PENDING reservations:
- Dates must be in the future
- End date must be after start date
- System warns on significant extension (>50% increase or >3 days)
- Credits automatically recalculated and adjusted

3.5.7 Users can cancel their own PENDING reservations anytime before admin confirms:
- Cancelled items immediately become available
- Credits refunded immediately
- Reservation status changes to DENIED

3.5.8 Reservation status workflow:
- PENDING: Initial status, credits deducted
- RENTED: Admin confirms rental has started
- RETURNED: Admin confirms equipment returned
- DENIED: Reservation cancelled or rejected, credits refunded

3.5.9 Users can only change their own PENDING reservations to DENIED (cancellation).

3.5.10 Administrators can change any reservation status (except final states RETURNED and DENIED).

3.5.11 Reservation list displays:
- All user's reservations (for regular users)
- All reservations (for admins, with user information)
- Filtering by status (PENDING, RENTED, RETURNED, DENIED)
- Sorting by date
- Pagination support

3.5.12 Reservation audit trail:
- System automatically logs all reservation changes (creation and updates)
- Audit records are immutable (cannot be modified or deleted)
- Each audit record captures:
  - Complete snapshot of reservation state (user, equipment, dates, status)
  - Who made the change (user or admin)
  - When the change occurred (timestamp)
- Users can view timeline of changes for their own reservations
- Admins can view audit trail for all reservations
- Timeline displayed chronologically on reservation details page
</prd>

2. View Description:
<view_description>
This prompt covers the implementation of the "Reservations View" which serves two distinct contexts based on user role:

1.  **User View ("My Reservations")**: Located at `/reservations`.
    *   **Purpose**: A view where a logged-in user can see a list of their own reservations (active and past).
    *   **Key Features**:
        *   List of reservations with details: Equipment details, Status (color-coded), Dates, Credit cost.
        *   Filtering by status (PENDING, RENTED, RETURNED, DENIED).
        *   Pagination.
        *   **Actions**:
            *   **Cancel**: Users can cancel their own `PENDING` reservations (changes status to `DENIED`).
            *   **Modify**: Users can modify dates of their own `PENDING` reservations (subject to availability and warnings).
    *   **Components**: `ReservationList`, `StatusBadge`, `ReservationCard` (or row).

2.  **Admin View ("Reservations Manager")**: Located at `/admin/reservations`.
    *   **Purpose**: A comprehensive management view for Administrators to oversee all reservations across the system.
    *   **Key Features**:
        *   Master list of ALL reservations showing User info (Name/Email) in addition to reservation details.
        *   **Quick Filters**: PENDING, Today, Overdue, All.
        *   **Bulk Actions**: Select multiple reservations to change status (e.g., mark multiple as RENTED).
        *   **Individual Actions**: Edit status (PENDING -> RENTED -> RETURNED/DENIED).
        *   Sorting and advanced filtering.
    *   **Components**: `DataTable` (Admin), `BulkActionToolbar`.

Both views share underlying data structures but differ significantly in available actions and visible data fields (user info).
</view_description>

3. User Stories:
<user_stories>
## US-014: View Reservation List
**Description:** As a user, I want to view all my reservations so I can see my rental history and current reservations.
**Acceptance Criteria:**
- User can access reservation list from dashboard
- Reservation list displays: Equipment name and type, Start and end dates, Status, Credit cost
- Reservations are sorted by date (most recent first)
- User can filter by status
- List supports pagination (10, 25, 50, 100 items per page)
- User can click on reservation to view details

## US-015: View Reservation Details
**Description:** As a user, I want to view detailed information about a specific reservation so I can see all relevant details.
**Acceptance Criteria:**
- User can click on reservation from list to view details
- Reservation details page shows: Equipment details, Dates, Status, Credit cost, Audit trail timeline
- User can see if reservation is modifiable (PENDING status)

## US-016: Modify Reservation Dates
**Description:** As a user, I want to modify the dates of my PENDING reservations so I can adjust my plans without cancelling.
**Acceptance Criteria:**
- User can modify dates only for their own PENDING reservations
- System warns if extension is significant (>50% increase or >3 days)
- System automatically recalculates credits
- System checks availability for new dates

## US-017: Cancel Reservation
**Description:** As a user, I want to cancel my PENDING reservations anytime before admin confirms so I have flexibility.
**Acceptance Criteria:**
- Upon confirmation, reservation status changes to DENIED
- Credits are refunded immediately
- Cancelled item immediately becomes available

## US-023: Admin - View All Reservations
**Description:** As an admin, I want to view all reservations with user information so I can manage the entire rental system.
**Acceptance Criteria:**
- List displays: User name/email, Equipment details, Dates, Status, Cost
- Admin can filter by status, user, or date
- List supports pagination

## US-025: Admin - Change Reservation Status
**Description:** As an admin, I want to change reservation status so I can manage the rental workflow.
**Acceptance Criteria:**
- Admin can change status of any reservation (except final states)
- Status changes are saved immediately and logged in audit trail

## US-028: Admin - Bulk Status Changes
**Description:** As an admin, I want to perform bulk status changes so I can efficiently manage multiple reservations.
**Acceptance Criteria:**
- Admin can select multiple reservations
- Admin can choose new status to apply
- System applies status change to all selected reservations
</user_stories>

4. Endpoint Description:
<endpoint_description>
### GET /reservations
**Description**: List reservations (user sees own, admin sees all)
**Query Parameters**:
- `page`, `per_page`
- `status`: PENDING/RENTED/RETURNED/DENIED
- `user_id` (admin only): Filter by user
- `equipment_id`: Filter by equipment
- `start_date_from`, `start_date_to`
**Response**: List of reservations with pagination details.

### GET /reservations/:id
**Description**: Get reservation details with audit trail
**Response**: Detailed reservation object including `audit_trail` array, user info, and equipment info.

### PATCH /reservations/:id
**Description**: Update reservation (dates or status)
**Body**: `start_date`, `end_date`, `status`
**Validation**:
- Dates must be future (for modification)
- Checks availability and credit balance
**Business Logic**:
- Status changes trigger audit logs
- Date changes trigger credit adjustments

### GET /equipment/:id/availability
**Description**: Check equipment availability for date range (Useful for modification checks)
</endpoint_description>

5. Endpoint Implementation:
<endpoint_implementation>
@src/lib/api/reservations.ts
</endpoint_implementation>

6. Type Definitions:
<type_definitions>
@src/types.ts
</type_definitions>

7. Tech Stack:
<tech_stack>
@documentation/techstack.md
</tech_stack>

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

The final output should be in English and saved in a file named .ai/{view-name}-view-implementation-plan.md. Do not include any analysis and planning in the final output.
