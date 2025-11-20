 Product Requirements Document (PRD) - Equipment Rental System

## 1. Product Overview

The Equipment Rental System is a web application designed for a kayaking club to manage equipment rentals and member credits. The system replaces an inconvenient Google Form-based rental process with a modern, mobile-accessible web application that provides real-time equipment availability, automated credit management, and comprehensive reservation tracking.

The application serves club members who rent equipment using a credit system called "godzinki". Members earn credits through club work and spend them on equipment rentals. Administrators manage user accounts, equipment inventory, reservations, and credit allocations.

The system is built as a frontend application that interfaces with an existing Go backend service and PostgreSQL database. The MVP focuses on core rental functionality, user management, credit system, and administrative controls while maintaining the existing backend logic and database structure.

Key stakeholders include:
- Club members (users): rent equipment, manage reservations, request credits
- Administrators (admin): manage equipment, process reservations, view analytics
- Super administrators (superAdmin): manage users, approve credit requests, configure system settings

## 2. User Problem

Currently, club members rent equipment through a Google Form, which creates several problems:

1. Inconvenience: The form-based process is cumbersome and not optimized for mobile devices, making it difficult for members to rent equipment on-the-go
2. Limited visibility: Administrators cannot easily track equipment availability, pending reservations, or overdue items in real-time
3. Manual credit management: Credit charging and tracking requires manual intervention, increasing administrative burden and potential for errors
4. Poor user experience: Members cannot see equipment availability, check their credit balance easily, or modify existing reservations
5. Lack of transparency: Members cannot view their rental history, credit history, or understand why certain equipment is unavailable

The new system addresses these issues by providing:
- Mobile-optimized interface accessible from any device
- Real-time equipment availability and calendar views
- Automated credit deduction and refund processes
- Self-service reservation management for users
- Comprehensive admin dashboard for efficient equipment and reservation management
- Transparent credit and rental history tracking

## 3. Functional Requirements

### 3.1 Authentication and Authorization

3.1.1 User accounts are created by administrators only. No self-registration functionality exists in MVP.

3.1.2 The system supports three user roles:
- User: Can rent equipment, view own reservations and credits
- Admin: Can manage equipment, process reservations, view all reservations, access analytics
- SuperAdmin: Can manage users, approve credit requests, modify credit balances, configure equipment types

3.1.3 Authentication uses passwordless email-based login. Users receive a login link via email.

3.1.4 Sessions timeout after 2 hours of inactivity.

3.1.5 All API endpoints require proper authentication and authorization checks.

### 3.2 User Management

3.2.1 Administrators can create new user accounts with:
- Username
- Email address
- Initial credit balance (optional, with default value)
- User role assignment

3.2.2 Administrators can view all users with their current credit balance and role.

3.2.3 Administrators can edit user profiles including:
- Email address
- Credit balance
- User role
- Account status (active/inactive)

3.2.4 Users cannot edit their own profiles. All profile management is admin-only.

3.2.5 User profiles display:
- Username
- Email address
- Current credit balance
- Role
- Account creation date

### 3.3 Credit System

3.3.1 Credit calculation uses per-day rates:
- Kayak: 4 credits per day
- Paddle: 2 credits per day
- Other equipment types: 1 credit per day

3.3.2 Credits are deducted immediately when a PENDING reservation is created.

3.3.3 Credits are refunded when a reservation status changes to DENIED.

3.3.4 When reservation dates are modified, credits are automatically recalculated and adjusted.

3.3.5 Users can request credits for club work by submitting:
- Short text description of work performed
- Requested credit amount

3.3.6 Credit requests require superAdmin approval. SuperAdmin can:
- Approve the requested amount
- Modify the requested amount
- Add an optional note explaining the modification
- Deny the request

3.3.7 All credit changes are audited and stored in credit history with:
- Timestamp
- Amount changed
- Reason (reservation, request, admin adjustment)
- Admin who made the change (if applicable)

3.3.8 Credit balance is displayed in the navbar/header on all pages.

3.3.9 Credit history is viewable with pagination (10, 25, 50, 100 items per page).

### 3.4 Equipment Management

3.4.1 Equipment search supports multiple simultaneous filters:
- Equipment type
- Name (text search)
- Description (text search)
- Availability status

3.4.2 Search results display:
- Favorite items first (top 3 per type based on user's rental history)
- All other items alphabetically sorted by name
- Equipment image or placeholder
- Equipment status (available/unavailable)
- Credit cost per day

3.4.3 Equipment details include:
- Name
- Type
- Description
- Status (ok/broken)
- Credit cost per day
- Image (if available)
- Maintenance history

3.4.4 Equipment status values:
- "ok": Available for rental
- "broken": Unavailable, shown with warning indicator

3.4.5 Administrators can add new equipment with:
- Name
- Type (from existing types or create new)
- Description
- Status
- Image upload (2MB limit, JPEG/PNG only)
- Credit cost per day

3.4.6 Administrators can edit all equipment fields:
- Name
- Description
- Status
- Type
- Image (replace or remove)
- Credit cost per day

3.4.7 Equipment images:
- Maximum file size: 2MB
- Accepted formats: JPEG, PNG
- Automatic thumbnail generation
- Placeholder image displayed when no image is available

3.4.8 Administrators can add new equipment types with configurable credit costs per day.

3.4.9 Maintenance logs support:
- Optional notes
- Timestamps
- Status changes
- Gentle reminders to add notes when status changes to broken

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

### 3.6 Calendar Views

3.6.1 Calendar displays 30 days by default (current date + 29 days ahead).

3.6.2 Two calendar view modes:
- All reservations: Shows all equipment reservations
- Item-specific: Shows availability for a selected equipment item

3.6.3 Visual indicators:
- Green: Date is available
- Red: Date is reserved
- Gray: Past dates

3.6.4 Calendar dates are clickable to pre-fill search form with selected date.

3.6.5 Calendar shows real-time availability based on current reservations.

### 3.7 Admin Dashboard

3.7.1 Default view shows summary with:
- Count of PENDING reservations
- Count of overdue items
- Count of today's rentals
- Quick links to filtered views

3.7.2 Quick filters available:
- PENDING: Shows all pending reservations
- Today: Shows reservations starting today
- Overdue: Shows overdue items (end date passed, status not RETURNED)
- All: Shows all reservations

3.7.3 Overdue items panel:
- Lists all overdue reservations
- Links to reservation detail pages
- Shows user information and contact details

3.7.4 Bulk operations:
- Select multiple reservations
- Preview affected reservations
- Confirm bulk status changes
- Apply status change to all selected

3.7.5 Admin can view all reservations with:
- User information
- Equipment details
- Dates
- Status
- Credit cost

3.7.6 Admin can create reservations on behalf of other users:
- Select user from list
- Select equipment and dates
- System processes as if user created it

### 3.8 Analytics and Reporting

3.8.1 Analytics view available to admins with:
- Year filter
- Month filter
- Individual item level statistics

3.8.2 Individual item analytics show:
- Rental days summary
- Number of reservations
- Most active renters

3.8.3 System tracks:
- Most rented items
- User activity statistics (top renters, credits spent)
- Equipment utilization rates

3.8.4 User favorites algorithm:
- Top 3 items per equipment type
- Based on user's last rentals
- Shown first in search results

### 3.9 Notifications

3.9.1 Email notifications sent only when reservation is created (not on status changes).

3.9.2 Single email per session listing:
- All reserved items in the session
- Total credits deducted
- Remaining balance
- Detailed information for each item:
  - Item name
  - Type
  - Description
  - Dates
  - Credits cost
- Link to view reservation

3.9.3 Admins receive notifications of new reservations (rate-limited to prevent spam).

### 3.10 User Experience

3.10.1 Search results ordering:
- Favorite items first (top 3 per type)
- All other items alphabetically sorted

3.10.2 Pagination:
- Configurable items per page: 10, 25, 50, 100
- Available on all list views (equipment, reservations, history)

3.10.3 Credit balance always visible in navbar/header.

3.10.4 Error messages:
- Simple, clear display
- No contextual help required

3.10.5 Mobile experience:
- Responsive design
- Core flows optimized for mobile devices
- Touch-friendly interface

3.10.6 Browser support:
- Chrome only

3.10.7 History views:
- All reservation history kept indefinitely
- All credit history kept indefinitely
- Pagination support

### 3.11 Security and Data

3.11.1 Input validation and sanitization on both frontend and backend.

3.11.2 Session timeout: 2 hours of inactivity.

3.11.3 All API requests require proper authentication.

3.11.4 Authorization checks ensure users can only access their own data (except admins).

3.11.5 Data backups: Rely on Supabase automatic backups.

3.11.6 Image uploads validated for:
- File size (max 2MB)
- File type (JPEG, PNG only)

## 4. Product Boundaries

### 4.1 Out of Scope for MVP

4.1.1 Backend service logic changes: The existing Go backend service logic remains unchanged. Only frontend implementation is part of MVP.

4.1.2 Database schema changes: No modifications to existing database structure. The frontend works with existing database schema.

4.1.3 Notification system backend changes: Email notification backend logic remains unchanged. Only frontend integration with existing notification system.

4.1.4 Native mobile application: MVP is web-based only. No native iOS or Android applications.

4.1.5 Self-registration: Users cannot create their own accounts. All accounts are admin-created.

4.1.6 User profile self-editing: Users cannot edit their own profiles. All profile management is admin-only.

4.1.7 Advanced analytics: Complex data visualizations, export functionality, and custom reports are not included.

4.1.8 Multi-language support: Application is single-language only.

4.1.9 Accessibility requirements: No specific WCAG compliance or accessibility features beyond basic usability.

4.1.10 Performance optimization: No specific performance goals or optimization requirements beyond basic functionality.

4.1.11 Data migration tools: No tools for migrating data from Google Forms or other systems.

4.1.12 Remember me functionality: No persistent login or "remember me" feature.

4.1.13 Social features: No user reviews, ratings, or social interactions.

4.1.14 Equipment recommendations: Beyond favorites based on rental history, no AI-powered recommendations.

### 4.2 Technical Constraints

4.2.1 Must work with existing Go backend API without modifications.

4.2.2 Must work with existing PostgreSQL database schema.

4.2.3 Must use existing authentication system (passwordless email).

4.2.4 Must integrate with existing email notification system.

4.2.5 Frontend must be built using technologies specified in techstack.md.

## 5. User Stories

### US-001: User Login
Description: As a user, I want to log in using my email address so I can access the system securely.

Acceptance Criteria:
- User can enter their email address on the login page
- System sends a login link to the provided email address
- User can click the link to authenticate
- User is redirected to the dashboard after successful login
- User session is established and maintained
- User session expires after 2 hours of inactivity
- User is redirected to login page when session expires

### US-002: User Logout
Description: As a user, I want to log out of the system so I can securely end my session.

Acceptance Criteria:
- User can access logout functionality from any page
- Clicking logout ends the current session
- User is redirected to login page after logout
- User cannot access protected pages after logout without re-authenticating

### US-003: View Credit Balance
Description: As a user, I want to see my current credit balance on every page so I always know how much I have available.

Acceptance Criteria:
- Credit balance is displayed in the navbar/header on all pages
- Credit balance updates immediately after any credit transaction
- Credit balance is accurate and reflects all recent changes
- Credit balance is visible on mobile and desktop views

### US-004: View Credit History
Description: As a user, I want to view my credit change history so I can track all credit transactions.

Acceptance Criteria:
- User can access credit history page from their dashboard
- Credit history displays all credit changes with:
  - Timestamp
  - Amount changed (positive or negative)
  - Reason (reservation, request, admin adjustment)
  - Admin name (if applicable)
- Credit history supports pagination (10, 25, 50, 100 items per page)
- Credit history is sorted by most recent first
- All history is kept indefinitely

### US-005: Request Credits
Description: As a user, I want to request credits for club work so I can earn credits for my contributions.

Acceptance Criteria:
- User can access credit request form from their dashboard
- User can enter:
  - Short text description of work performed
  - Requested credit amount
- User can submit the request
- System validates that requested amount is a positive number
- System displays confirmation message after submission
- Request appears in user's credit history with PENDING status
- User receives notification when request is approved or denied

### US-006: Search Equipment
Description: As a user, I want to search for available equipment by type, name, or description so I can find what I need quickly.

Acceptance Criteria:
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

### US-007: View Equipment Details
Description: As a user, I want to view detailed information about equipment so I can make informed rental decisions.

Acceptance Criteria:
- User can click on equipment item from search results
- Equipment details page displays:
  - Name
  - Type
  - Description
  - Status (ok/broken)
  - Credit cost per day
  - Image (or placeholder if no image)
  - Maintenance history (if available)
- Broken equipment is clearly marked with warning indicator
- User can navigate back to search results

### US-008: View Favorite Equipment
Description: As a user, I want to see my favorite items (top 3 per type) first in search results so I can quickly reserve my preferred equipment.

Acceptance Criteria:
- System calculates favorites based on user's rental history
- Top 3 items per equipment type are identified as favorites
- Favorites appear first in search results, before other items
- Favorites are clearly marked or visually distinguished
- If user has no rental history, no favorites are shown
- Favorites update based on recent rental activity

### US-009: Select Multiple Items for Reservation
Description: As a user, I want to select multiple items and reserve them in one transaction so I don't have to repeat the process.

Acceptance Criteria:
- User can select multiple equipment items from search results
- Selected items are added to a reservation cart or selection list
- User can view all selected items before proceeding
- User can remove items from selection
- Total credit cost is calculated and displayed for all selected items
- User can proceed to date selection with all selected items

### US-010: Create Reservation - Date Selection
Description: As a user, I want to select start and end dates for my reservation so I can specify the rental period.

Acceptance Criteria:
- User can select start date (date picker)
- User can select end date (date picker)
- System validates that start date is in the future
- System validates that end date is after start date
- System calculates number of days for credit calculation
- User can see total credit cost based on selected dates
- Calendar view is available to help select dates
- User can click calendar dates to pre-fill date fields

### US-011: Create Reservation - Availability Check
Description: As a user, I want the system to check availability before I create a reservation so I know if equipment is available.

Acceptance Criteria:
- System checks availability for all selected items and dates
- System prevents reservation if any item is unavailable
- System displays clear error messages explaining why item is unavailable:
  - Item already reserved for selected dates
  - Item is broken/unavailable
  - Invalid date range
- System checks user's credit balance
- System prevents reservation if insufficient credits
- System shows required credits vs available credits if insufficient

### US-012: Create Reservation - Confirmation Screen
Description: As a user, I want to see a confirmation screen before finalizing my reservation so I can review the total cost and my remaining balance.

Acceptance Criteria:
- Confirmation screen displays all selected items with details:
  - Item name
  - Type
  - Description
  - Credit cost per day
  - Number of days
  - Total cost for item
- Confirmation screen shows:
  - Total credit cost for all items
  - Current credit balance
  - Remaining balance after reservation
- User can confirm to create reservation
- User can cancel to go back and modify
- Confirmation is required before reservation is created

### US-013: Create Reservation - Finalization
Description: As a user, I want to create a reservation so I can rent equipment for my selected dates.

Acceptance Criteria:
- After confirmation, system creates separate reservations for each selected item
- Credits are deducted immediately for all reservations
- System displays success message
- User receives email notification with reservation details
- User is redirected to reservation list or dashboard
- Reservations appear in user's reservation list with PENDING status
- All reservations show correct dates and credit costs

### US-014: View Reservation List
Description: As a user, I want to view all my reservations so I can see my rental history and current reservations.

Acceptance Criteria:
- User can access reservation list from dashboard
- Reservation list displays:
  - Equipment name and type
  - Start and end dates
  - Status (PENDING, RENTED, RETURNED, DENIED)
  - Credit cost
- Reservations are sorted by date (most recent first)
- User can filter by status
- List supports pagination (10, 25, 50, 100 items per page)
- User can click on reservation to view details

### US-015: View Reservation Details
Description: As a user, I want to view detailed information about a specific reservation so I can see all relevant details.

Acceptance Criteria:
- User can click on reservation from list to view details
- Reservation details page shows:
  - Equipment name, type, description
  - Start and end dates
  - Status
  - Credit cost
  - Date created
  - Status change history (if available)
- User can see if reservation is modifiable (PENDING status)
- User can navigate back to reservation list

### US-016: Modify Reservation Dates
Description: As a user, I want to modify the dates of my PENDING reservations so I can adjust my plans without cancelling.

Acceptance Criteria:
- User can modify dates only for their own PENDING reservations
- User can access date modification from reservation details page
- User can change start date (must be in future)
- User can change end date (must be after start date)
- System warns if extension is significant (>50% increase or >3 days)
- System automatically recalculates credits
- System shows credit adjustment (refund or additional charge)
- User can confirm or cancel the modification
- Credits are adjusted immediately upon confirmation
- Reservation dates are updated in the system
- System checks availability for new dates before allowing modification

### US-017: Cancel Reservation
Description: As a user, I want to cancel my PENDING reservations anytime before admin confirms so I have flexibility.

Acceptance Criteria:
- User can cancel only their own PENDING reservations
- User can access cancel option from reservation details page
- System displays confirmation dialog before cancellation
- Upon confirmation, reservation status changes to DENIED
- Credits are refunded immediately
- Cancelled item immediately becomes available for other users
- User sees updated credit balance
- Cancelled reservation appears in history with DENIED status

### US-018: View Calendar - All Reservations
Description: As a user, I want to see a calendar view showing all reservations so I can understand overall equipment availability.

Acceptance Criteria:
- User can access calendar view from navigation
- Calendar displays 30 days (current date + 29 days ahead)
- Calendar shows all equipment reservations
- Dates are color-coded:
  - Green: Available
  - Red: Reserved
  - Gray: Past dates
- User can click on dates to pre-fill search form
- Calendar updates in real-time based on current reservations

### US-019: View Calendar - Item Specific
Description: As a user, I want to see a calendar view for a specific equipment item so I can see when it's available.

Acceptance Criteria:
- User can access item-specific calendar from equipment details page
- Calendar displays 30 days (current date + 29 days ahead)
- Calendar shows availability for selected equipment item only
- Dates are color-coded:
  - Green: Available
  - Red: Reserved
  - Gray: Past dates
- User can see which dates have existing reservations
- User can click on available dates to pre-fill reservation form

### US-020: View Rental History
Description: As a user, I want to see my rental change history so I can track all my past reservations.

Acceptance Criteria:
- User can access rental history from dashboard
- History displays all past and current reservations
- History shows:
  - Equipment name and type
  - Dates
  - Status
  - Credit cost
  - Date created and modified
- History is sorted by most recent first
- History supports pagination (10, 25, 50, 100 items per page)
- All history is kept indefinitely
- User can filter by status or date range

### US-021: Admin - View Dashboard Summary
Description: As an admin, I want to see a summary dashboard with pending and overdue items so I can quickly assess what needs attention.

Acceptance Criteria:
- Admin dashboard displays summary counts:
  - Number of PENDING reservations
  - Number of overdue items
  - Number of today's rentals
- Dashboard provides quick links to filtered views
- Summary updates in real-time
- Dashboard is the default view when admin logs in

### US-022: Admin - Filter Reservations
Description: As an admin, I want to filter reservations by status so I can focus on urgent tasks.

Acceptance Criteria:
- Admin can access quick filters: PENDING, Today, Overdue, All
- Filtering by PENDING shows all pending reservations
- Filtering by Today shows reservations starting today
- Filtering by Overdue shows items past end date with status not RETURNED
- Filtering by All shows all reservations
- Filtered results display with user information
- Admin can combine filters or use single filter

### US-023: Admin - View All Reservations
Description: As an admin, I want to view all reservations with user information so I can manage the entire rental system.

Acceptance Criteria:
- Admin can access all reservations list
- List displays:
  - User name and email
  - Equipment name and type
  - Start and end dates
  - Status
  - Credit cost
- Admin can filter by status, user, or date
- Admin can sort by various fields
- List supports pagination
- Admin can click on reservation to view or edit details

### US-024: Admin - View User Reservations
Description: As an admin, I want to see a selected user's reservation history so I can help with user inquiries.

Acceptance Criteria:
- Admin can search for user by name or email
- Admin can select user from list
- Admin can view all reservations for selected user
- User reservations display same information as all reservations view
- Admin can filter and sort user's reservations
- Admin can access user profile from reservation view

### US-025: Admin - Change Reservation Status
Description: As an admin, I want to change reservation status so I can manage the rental workflow.

Acceptance Criteria:
- Admin can change status of any reservation (except final states RETURNED and DENIED)
- Admin can change PENDING to RENTED
- Admin can change RENTED to RETURNED
- Admin can change PENDING to DENIED
- Status changes are saved immediately
- Status change history is recorded
- User is notified of status changes (if applicable)
- Credits are adjusted if status change affects credit balance

### US-026: Admin - Create Reservation for User
Description: As an admin, I want to create a reservation as a selected different user so I can help users who need assistance.

Acceptance Criteria:
- Admin can access "Create Reservation for User" function
- Admin can select user from list
- Admin follows same reservation creation flow as user
- Reservation is created in selected user's name
- Credits are deducted from selected user's account
- Reservation appears in selected user's reservation list
- Email notification sent to selected user (not admin)

### US-027: Admin - View Overdue Items
Description: As an admin, I want to see overdue items in a panel so I can quickly identify items that need attention.

Acceptance Criteria:
- Admin dashboard includes overdue items panel
- Panel lists all overdue reservations (end date passed, status not RETURNED)
- Panel shows:
  - User name and contact information
  - Equipment name
  - Original end date
  - Days overdue
- Admin can click on item to view reservation details
- Panel updates in real-time

### US-028: Admin - Bulk Status Changes
Description: As an admin, I want to perform bulk status changes so I can efficiently manage multiple reservations.

Acceptance Criteria:
- Admin can select multiple reservations from list
- Admin can choose new status to apply
- System shows preview of affected reservations
- Preview displays:
  - Number of reservations to be changed
  - List of affected reservations
  - New status
- Admin must confirm bulk operation
- System applies status change to all selected reservations
- System displays success message with count of changes
- Credits are adjusted for all affected reservations if applicable

### US-029: Admin - Add Equipment
Description: As an admin, I want to add new equipment so I can expand the inventory.

Acceptance Criteria:
- Admin can access "Add Equipment" form
- Admin can enter:
  - Name (required)
  - Type (select from existing or create new)
  - Description
  - Status (ok/broken)
  - Credit cost per day
  - Image upload (optional, 2MB max, JPEG/PNG)
- System validates all required fields
- System validates image file size and type
- System generates thumbnail for uploaded image
- New equipment appears in search results immediately
- Admin can set credit cost when creating new equipment type

### US-030: Admin - Edit Equipment
Description: As an admin, I want to edit equipment parameters so I can keep inventory information up to date.

Acceptance Criteria:
- Admin can access edit form from equipment details page
- Admin can edit all fields:
  - Name
  - Description
  - Status
  - Type
  - Credit cost per day
  - Image (replace or remove)
- Changes are saved immediately
- Updated information appears in search results
- If status changes to broken, system shows warning
- If status changes to broken, maintenance log reminder appears

### US-031: Admin - Add Equipment Type
Description: As an admin, I want to add new equipment types with configurable credit costs so I can support different equipment categories.

Acceptance Criteria:
- Admin can access "Add Equipment Type" form
- Admin can enter:
  - Type name (required)
  - Credit cost per day (required, positive number)
- System validates that type name is unique
- New type appears in equipment type dropdown immediately
- New type can be used when adding or editing equipment
- Admin can set default credit cost for the type

### US-032: Admin - Add Maintenance Log Entry
Description: As an admin, I want to add maintenance log entries so I can track equipment maintenance history.

Acceptance Criteria:
- Admin can access maintenance log from equipment details page
- Admin can add log entry with:
  - Optional notes
  - Timestamp (auto-generated)
  - Status change (if applicable)
- System gently reminds admin to add notes when status changes to broken
- Maintenance history is displayed chronologically
- Maintenance history is visible to users on equipment details page

### US-033: Admin - View Analytics Dashboard
Description: As an admin, I want to see analytics on equipment usage so I can make informed inventory decisions.

Acceptance Criteria:
- Admin can access analytics dashboard
- Dashboard supports year and month filters
- Dashboard displays:
  - Most rented items
  - Equipment utilization rates
  - User activity statistics (top renters, credits spent)
- Analytics update based on selected time period
- Admin can view analytics for specific equipment items

### US-034: Admin - View Item Analytics
Description: As an admin, I want to see individual item level analytics so I can understand usage patterns for specific equipment.

Acceptance Criteria:
- Admin can access item analytics from equipment details page
- Item analytics show:
  - Rental days summary
  - Number of reservations
  - Most active renters for this item
  - Utilization rate
- Analytics support year and month filters
- Analytics display in clear, readable format

### US-035: SuperAdmin - Create User Account
Description: As a superAdmin, I want to create user accounts so new members can access the system.

Acceptance Criteria:
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

### US-036: SuperAdmin - View All Users
Description: As a superAdmin, I want to view all users so I can manage the user base.

Acceptance Criteria:
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

### US-037: SuperAdmin - Edit User Profile
Description: As a superAdmin, I want to edit user profiles so I can update user information and manage accounts.

Acceptance Criteria:
- SuperAdmin can access edit form from user list or profile page
- SuperAdmin can edit:
  - Email address
  - Credit balance
  - User role
  - Account status (active/inactive)
- Changes to credit balance are logged in user's credit history
- Changes are saved immediately
- Updated information appears in user list

### US-038: SuperAdmin - Approve Credit Request
Description: As a superAdmin, I want to approve credit requests with modified amounts so I can adjust based on work value.

Acceptance Criteria:
- SuperAdmin can access pending credit requests list
- Request list shows:
  - User name
  - Requested amount
  - Description of work
  - Date requested
- SuperAdmin can:
  - Approve requested amount
  - Modify requested amount
  - Add optional note explaining modification
  - Deny request
- Upon approval, credits are added to user's account
- Credit change is logged in user's credit history
- User receives notification of approval/denial
- Request status is updated

### US-039: SuperAdmin - Modify User Credits
Description: As a superAdmin, I want to directly modify user credits so I can manage the credit system.

Acceptance Criteria:
- SuperAdmin can modify credits from user profile page
- SuperAdmin can add or subtract credits
- SuperAdmin can enter amount and optional note
- Credit change is logged in user's credit history
- User's credit balance updates immediately
- Change appears in user's credit history with superAdmin name

### US-040: Handle Insufficient Credits
Description: As a user, I want to see a clear error message when I don't have enough credits so I know why my reservation failed.

Acceptance Criteria:
- System checks credit balance before allowing reservation
- If insufficient credits, system displays error message
- Error message shows:
  - Required credits
  - Available credits
  - Shortfall amount
- User cannot proceed with reservation until credits are sufficient
- User is directed to credit request or balance information

### US-041: Handle Equipment Unavailable
Description: As a user, I want to see why equipment is unavailable so I can understand when it might be available.

Acceptance Criteria:
- System checks availability before allowing reservation
- If item is unavailable, system displays clear reason:
  - "Item is broken and unavailable"
  - "Item is already reserved for [dates]"
- Unavailable items are marked in search results
- Broken items show warning indicator
- User cannot select unavailable items for reservation

### US-042: Handle Invalid Date Range
Description: As a user, I want to see validation errors for invalid date selections so I can correct my input.

Acceptance Criteria:
- System validates start date is in the future
- System validates end date is after start date
- System displays clear error messages for invalid dates:
  - "Start date must be in the future"
  - "End date must be after start date"
- Date picker prevents selection of invalid dates where possible
- User cannot proceed with invalid date range

### US-043: Handle Session Timeout
Description: As a user, I want to be notified when my session expires so I can log in again.

Acceptance Criteria:
- System tracks user activity
- System expires session after 2 hours of inactivity
- When session expires, user is redirected to login page
- System displays message explaining session expiration
- User must log in again to continue
- User's work is not lost (if possible, data is preserved)

### US-044: Handle Image Upload Errors
Description: As an admin, I want to see clear error messages when image upload fails so I can correct the issue.

Acceptance Criteria:
- System validates image file size (max 2MB)
- System validates image file type (JPEG, PNG only)
- System displays clear error messages:
  - "File size exceeds 2MB limit"
  - "File type not supported. Please use JPEG or PNG"
- User can retry upload with corrected file
- Validation occurs before upload attempt

### US-045: View Reservation Email Notification
Description: As a user, I want to receive an email when I create a reservation so I have a record of my rental.

Acceptance Criteria:
- Email is sent immediately when reservation is created
- Email contains:
  - All reserved items in the session
  - For each item: name, type, description, dates, credits
  - Total credits deducted
  - Remaining balance
  - Link to view reservation
- Email is sent only once per reservation session
- Email is sent to user's registered email address
- Email format is clear and readable

### US-046: Handle Reservation Conflict
Description: As a user, I want to be prevented from creating conflicting reservations so equipment availability is maintained.

Acceptance Criteria:
- System checks for date conflicts before creating reservation
- System prevents reservation if dates overlap with existing reservation
- System displays error message showing conflicting dates
- System shows which dates are already reserved
- User can modify dates to avoid conflict
- Conflict check includes back-to-back reservations (end time equals next start time is allowed)

### US-047: Handle Date Modification Warning
Description: As a user, I want to be warned when I significantly extend my reservation dates so I understand the credit impact.

Acceptance Criteria:
- System calculates if date extension is significant (>50% increase or >3 days)
- System displays warning message:
  - "You are extending your reservation significantly. Additional credits will be charged."
  - Shows current dates and new dates
  - Shows additional credit cost
- User can confirm to proceed or cancel to modify
- Warning appears before credit adjustment is applied

### US-048: Handle Bulk Operation Errors
Description: As an admin, I want to see which reservations failed in bulk operations so I can address issues.

Acceptance Criteria:
- System attempts to apply bulk status change to all selected reservations
- System tracks successes and failures
- System displays results:
  - Number of successful changes
  - Number of failed changes
  - List of failed reservations with reasons
- Failed reservations remain unchanged
- Admin can retry failed operations individually

### US-049: View Equipment Without Image
Description: As a user, I want to see a placeholder when equipment has no image so the interface remains consistent.

Acceptance Criteria:
- Equipment without image displays placeholder image
- Placeholder is visually consistent with other equipment cards
- Placeholder clearly indicates no image available
- Equipment details page also shows placeholder if no image
- Placeholder does not affect equipment functionality

### US-050: Handle Concurrent Reservation Attempts
Description: As a user, I want the system to handle concurrent reservation attempts so I don't lose availability due to race conditions.

Acceptance Criteria:
- System checks availability at the moment of reservation creation
- If item becomes unavailable between selection and confirmation, system prevents reservation
- System displays error message explaining item is no longer available
- User can refresh and try again
- System maintains data consistency

### US-051: View Paginated Results
Description: As a user, I want to navigate through paginated results so I can view large lists efficiently.

Acceptance Criteria:
- Pagination controls are available on all list views
- User can select items per page: 10, 25, 50, 100
- User can navigate to next/previous page
- User can jump to specific page number
- Current page and total pages are displayed
- Pagination state is maintained when filtering or sorting

### US-052: Handle Network Errors
Description: As a user, I want to see clear error messages when network requests fail so I understand what went wrong.

Acceptance Criteria:
- System detects network errors and timeouts
- System displays user-friendly error messages
- Error messages suggest retrying the operation
- User can retry failed operations
- Critical operations (like reservation creation) can be retried
- System does not lose user input on recoverable errors

### US-053: View Mobile-Optimized Interface
Description: As a user, I want to use the system on my mobile device so I can rent equipment on the go.

Acceptance Criteria:
- Interface is responsive and works on mobile devices
- Core flows (search, reserve, view) are optimized for mobile
- Touch targets are appropriately sized
- Forms are mobile-friendly
- Navigation is accessible on small screens
- Calendar view works on mobile devices

### US-054: Handle Search with No Results
Description: As a user, I want to see a message when my search returns no results so I know to adjust my filters.

Acceptance Criteria:
- System displays "No results found" message when search returns empty
- Message suggests adjusting filters
- User can clear filters easily
- Search form remains accessible
- User can modify search criteria and try again

### US-055: View Maintenance History
Description: As a user, I want to view equipment maintenance history so I can understand equipment condition.

Acceptance Criteria:
- Maintenance history is visible on equipment details page
- History shows:
  - Timestamp
  - Status change (if applicable)
  - Notes (if provided)
- History is sorted chronologically (most recent first)
- History is read-only for users
- Empty history shows appropriate message

## 6. Success Metrics

### 6.1 User Adoption Metrics

6.1.1 Active User Rate: Percentage of club members who have logged in and used the system within the last 30 days. Target: 80% of registered users.

6.1.2 Monthly Active Users: Number of unique users who access the system each month. Target: Track growth month-over-month.

6.1.3 User Retention: Percentage of users who return to use the system after their first reservation. Target: 70% of first-time users make a second reservation within 60 days.

### 6.2 Reservation Metrics

6.2.1 Reservation Completion Rate: Percentage of reservation attempts that result in successful reservations. Target: 85% of reservation attempts are completed.

6.2.2 Abandoned Reservations: Number of users who start but do not complete the reservation process. Target: Less than 15% abandonment rate.

6.2.3 Average Reservations per User: Average number of reservations created per active user per month. Target: Track baseline and growth.

6.2.4 Multi-Item Reservation Rate: Percentage of reservations that include multiple items. Target: Track usage to understand user behavior.

### 6.3 Credit System Metrics

6.3.1 Credit Request Processing Time: Average time from credit request submission to approval/denial. Target: Less than 48 hours.

6.3.2 Credit Request Approval Rate: Percentage of credit requests that are approved. Target: Track for insights into request quality.

6.3.3 Credit Balance Accuracy: Zero discrepancies between displayed balance and actual balance in system. Target: 100% accuracy.

### 6.4 Admin Efficiency Metrics

6.4.1 Pending Reservation Processing Time: Average time from reservation creation to admin action (approval/denial). Target: Less than 24 hours.

6.4.2 Admin Dashboard Usage: Frequency of admin dashboard access and filter usage. Target: Track to ensure dashboard is useful.

6.4.3 Bulk Operation Usage: Number of bulk operations performed vs individual operations. Target: Track adoption of efficiency features.

### 6.5 Equipment Utilization Metrics

6.5.1 Equipment Utilization Rate: Average rental days per equipment item per month. Target: Track to identify underutilized equipment.

6.5.2 Most Rented Items: Top 10 most frequently rented items. Target: Track to inform inventory decisions.

6.5.3 Equipment Availability Rate: Percentage of time equipment is available (not broken, not reserved). Target: Track to identify maintenance needs.

### 6.6 User Experience Metrics

6.6.1 Search Success Rate: Percentage of searches that result in user finding desired equipment. Target: 90% of searches result in at least one item selection.

6.6.2 Time to Complete Reservation: Average time from search start to reservation confirmation. Target: Less than 5 minutes for experienced users.

6.6.3 Error Rate: Percentage of user actions that result in errors. Target: Less than 5% error rate.

6.6.4 Mobile Usage Rate: Percentage of reservations made on mobile devices. Target: Track to ensure mobile optimization is effective.

### 6.7 System Reliability Metrics

6.7.1 System Uptime: Percentage of time system is available and accessible. Target: 99% uptime.

6.7.2 Email Delivery Rate: Percentage of reservation emails successfully delivered. Target: 95% delivery rate.

6.7.3 Data Integrity: Zero instances of data loss or corruption. Target: 100% data integrity.

### 6.8 User Satisfaction Indicators

6.8.1 Reservation Modification Rate: Percentage of reservations that are modified after creation. Target: Track to understand if date selection is intuitive.

6.8.2 Cancellation Rate: Percentage of PENDING reservations that are cancelled by users. Target: Track to identify potential issues.

6.8.3 Favorite Items Usage: Percentage of reservations that use favorite items. Target: Track to measure favorite feature effectiveness.

### 6.9 Analytics Usage Metrics

6.9.1 Admin Analytics Access: Frequency of admin access to analytics dashboard. Target: Track to ensure analytics are useful.

6.9.2 Equipment Type Distribution: Distribution of reservations across equipment types. Target: Track to understand usage patterns.

6.9.3 Peak Usage Times: Identification of peak reservation times and dates. Target: Track to inform capacity planning.

### 6.10 Security Metrics

6.10.1 Authentication Success Rate: Percentage of successful login attempts. Target: Track to identify authentication issues.

6.10.2 Session Timeout Compliance: Percentage of sessions that timeout correctly after inactivity. Target: 100% compliance.

6.10.3 Unauthorized Access Attempts: Number of attempts to access unauthorized resources. Target: Zero successful unauthorized accesses.

These metrics should be tracked regularly and reviewed monthly to assess system performance, user adoption, and identify areas for improvement. The metrics provide quantitative measures of success for the MVP and help inform future enhancements.
