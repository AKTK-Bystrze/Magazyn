As a senior frontend developer, your task is to create a detailed implementation plan for the "Filter Equipment by Availability Date Range" feature in a web application. This plan should be comprehensive and clear enough for another frontend developer to implement the feature correctly and efficiently.

First, review the following information:

1. Product Requirements Document (PRD):
<prd>
### 3.4 Equipment Management

3.4.1 Equipment search and discovery:
- Users can browse all equipment in the inventory
- Search by equipment type (dropdown)
- Search by name (text input)
- Search by description (text input)
- **Filter by availability date range** to show only equipment free for entire period
- Multiple filters can be applied simultaneously
- Results show equipment image, status, and credit cost per day
- Favorites (top 3 per type based on rental history) appear first
- Remaining items sorted alphabetically

3.4.2 Equipment availability:
- System checks availability before allowing reservation
- Clear error messages explain why item is unavailable
- Broken items are clearly marked with warning indicator
- Unavailable items cannot be selected for reservation

### 3.5 Reservation System

3.5.4 Availability checking:
- System prevents conflicting reservations at creation
- Users see clear error messages explaining why an item is unavailable:
  - Item already reserved for selected dates
  - Item is broken/unavailable
  - Insufficient credits
  - Invalid date range
</prd>

2. View Description:
<view_description>
This feature enhances the existing **Equipment Search View** located at `/equipment` by adding a date range filter for availability.

**Purpose**: Allow users to filter equipment by specifying a start and end date, showing only items that are available for the entire specified period. This helps users quickly find equipment they can actually reserve for their desired dates.

**Key Features**:
- Date range picker integrated into existing filter sidebar/drawer
- Start date and end date inputs with validation
- Real-time filtering of equipment list based on availability
- Combines seamlessly with existing filters (type, name, availability status)
- Clear action to reset date filter while preserving other filters
- Visual indication when date filter is active

**Integration Points**:
- Existing `FilterSidebar` (Desktop) / `FilterDrawer` (Mobile) components
- Existing `EquipmentGrid` component
- Equipment search API with new query parameters

**Components to modify/extend**: `FilterSidebar`, `FilterDrawer`, `EquipmentGrid`, equipment search hook
</view_description>

3. User Stories:
<user_stories>
## US-051: Filter Equipment by Availability Date Range

**Description:** As a user, I want to filter equipment by a date range within which the equipment has to be available so that I can quickly find items I can actually reserve for my desired period.

**Acceptance Criteria:**

- User can specify a start date and end date filter
- System only shows equipment that is available for the entire specified date range
- Items with conflicting reservations for any part of the date range are excluded
- Filter can be combined with other existing filters (name, type, category, availability status)
- Clearing the date filter shows all equipment again (respecting other active filters)
- Date validation follows the same rules as reservation creation (start date in future, end date after start date)

---

## US-006: Search Equipment (Related)

**Description:** As a user, I want to search for available equipment by type, name, or description so I can find what I need quickly.

**Acceptance Criteria:**

- User can access search page from navigation
- User can filter by equipment type (dropdown)
- User can search by name (text input)
- User can search by description (text input)
- User can apply multiple filters simultaneously
- Search results display all matching equipment
- Search results show equipment image or placeholder
- Search results show equipment status (available/unavailable)
- Search results show credit cost per day
- Search results are paginated (10, 25, 50, 100 items per page)
- Favorite items appear first in search results
- All other items are sorted alphabetically by name

---

## US-041: Handle Equipment Unavailable

**Description:** As a user, I want to see why equipment is unavailable so I can understand when it might be available.

**Acceptance Criteria:**

- System checks availability before allowing reservation
- If item is unavailable, system displays clear reason
- Unavailable items are marked in search results
- Broken items show warning indicator
- User cannot select unavailable items for reservation

---

## US-042: Handle Invalid Date Range

**Description:** As a user, I want to see validation errors for invalid date selections so I can correct my input.

**Acceptance Criteria:**

- System validates start date is in the future
- System validates end date is after start date
- System displays clear error messages for invalid dates:
  - "Start date must be in the future"
  - "End date must be after start date"
- Date picker prevents selection of invalid dates where possible
- User cannot proceed with invalid date range
</user_stories>

4. Endpoint Description:
<endpoint_description>
### GET /equipment
**Description**: List equipment with optional filters including availability date range
**Query Parameters**:
- `page`, `per_page`: Pagination controls
- `type_id`: Filter by equipment type
- `search`: Search by name/description
- `status`: Filter by availability status (ok/broken)
- `available_from`: Start date for availability check (ISO date string, e.g., "2024-01-15")
- `available_to`: End date for availability check (ISO date string, e.g., "2024-01-20")
**Response**: List of equipment matching filters with pagination details.
**Business Logic**:
- When `available_from` and `available_to` are provided, excludes equipment with conflicting reservations
- Only includes equipment that is available for the ENTIRE date range
- Respects all other filters in combination

### GET /equipment/:id/availability
**Description**: Check equipment availability for date range
**Query Parameters**:
- `start_date`: Start date to check
- `end_date`: End date to check
**Response**: Availability status and conflicting reservation dates if any.
</endpoint_description>

5. Endpoint Implementation:
<endpoint_implementation>
@frontend/src/lib/api/equipment-api.ts
@backend/internal/equipment/handler.go
</endpoint_implementation>

5a. Existing Code Context (MUST READ):
<existing_code>
### Files to MODIFY (extend existing functionality)
- `@frontend/src/types/equipment/equipment.types.ts` - Add `availableFrom` and `availableTo` to `EquipmentSearchParams`
- `@frontend/src/hooks/use-equipment-search.ts` - Add date filter state management and URL sync
- `@frontend/src/components/equipment/FilterSidebar.tsx` - Add DateRangePicker section
- `@frontend/src/components/equipment/EquipmentSearchContainer.tsx` - Pass date filter props

### Patterns to Follow (from architecture.md)
1. **Container/Presentational**: Container (`EquipmentSearchContainer`) fetches data, Presentational (`FilterSidebar`) renders UI
2. **Type-Safe Transformers**: DTOs → Validators (Zod) → Transformers → Frontend Types
3. **URL State Management**: Existing `useEquipmentSearch` syncs filters with URL params
4. **Debounced Updates**: Use existing `SEARCH_DEBOUNCE_MS` constant from `@/lib/config/constants`

### Key Constants (from good-practises.md)
- DO NOT hardcode date format strings - use constants
- DO NOT hardcode validation messages - use constants
- Use TSDoc format for all exported functions and types
</existing_code>

6. Type Definitions:
<type_definitions>
@frontend/src/types/index.ts
@frontend/src/types/equipment/equipment.types.ts (contains EquipmentSearchParams to extend)
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

1. Overview: Brief summary of the feature and its purpose.
2. View Routing: Specify the path where the feature should be accessible.
3. Component Structure: Outline of main components and their hierarchy.
4. Component Details: For each component, describe:
 - Component description, its purpose and what it consists of
 - Main HTML elements and child components that build the component
 - Handled events
 - Validation conditions (detailed conditions, according to API)
 - Types (DTO and ViewModel) required by the component
 - Props that the component accepts from parent (component interface)
5. Types: Detailed description of types required for feature implementation, including exact breakdown of any new types or view models by fields and types.
6. State Management: Detailed description of how state is managed in the view, specifying whether a custom hook is required.
7. API Integration: Explanation of how to integrate with the provided endpoint. Precisely indicate request and response types.
8. User Interactions: Detailed description of user interactions and how to handle them.
9. Conditions and Validation: Describe what conditions are verified by the interface, which components they concern, and how they affect the interface state
10. Error Handling: Description of how to handle potential errors or edge cases.
11. Implementation Steps: Step-by-step guide for implementing the feature.

Ensure your plan is consistent with the PRD, user stories, and includes the provided tech stack.

The final output should be in English and saved in a file named .ai/Filter-equipment-by-dates-view-implementation-plan.md. Do not include any analysis and planning in the final output.

Here's an example of what the output file should look like (content is to be replaced):

```markdown
# Feature Implementation Plan: Filter Equipment by Availability Date Range

## 1. Overview
[Brief description of the feature and its purpose]

## 2. View Routing
[Path where the feature should be accessible]

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

Begin analysis and planning now. Your final output should consist solely of the implementation plan in English in markdown format, which you will save in the .ai/Filter-equipment-by-dates-view-implementation-plan.md file and should not duplicate or repeat any work done in the implementation breakdown.
