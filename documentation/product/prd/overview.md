# Product Requirements Document - Overview

[← Back to Index](./index.md)

---

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

---

[← Back to Index](./index.md) | [Success Metrics →](./metrics.md)
