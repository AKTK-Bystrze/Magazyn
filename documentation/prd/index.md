# Product Requirements Document - Index

## Overview

This directory contains the complete Product Requirements Document (PRD) for the Equipment Rental System, organized into logical sections for easy navigation and reference.

## Main Documentation

### [Product Overview](./overview.md)
Complete product overview including:
- **Section 1**: Product Overview
- **Section 2**: User Problem
- **Section 3**: Functional Requirements
- **Section 4**: Product Boundaries

### [Success Metrics](./metrics.md)
- **Section 6**: Success Metrics and KPIs

## User Stories

User stories are organized by functional area in the `stories/` directory:

### Authentication & Session Management
- **[Authentication Stories](./stories/authentication.md)** - Login, Logout, Session Timeout
  - US-001: User Login
  - US-002: User Logout
  - US-043: Handle Session Timeout

### Credit System
- **[Credits Stories](./stories/credits.md)** - Balance, History, Requests, Admin Adjustments
  - US-003: View Credit Balance
  - US-004: View Credit History
  - US-005: Request Credits
  - US-038: SuperAdmin - Approve Credit Request
  - US-039: SuperAdmin - Modify User Credits
  - US-040: Handle Insufficient Credits

### Equipment Management
- **[Equipment Browsing Stories](./stories/equipment_browsing.md)** - Search, Details, Favorites, Maintenance
  - US-006: Search Equipment
  - US-007: View Equipment Details
  - US-008: View Favorite Equipment
  - US-041: Handle Equipment Unavailable
  - US-049: View Equipment Without Image
  - US-054: Handle Search with No Results
  - US-055: View Maintenance History

- **[Admin Equipment Stories](./stories/admin_equipment.md)** - CRUD Operations, Types, Logs
  - US-029: Admin - Add Equipment
  - US-030: Admin - Edit Equipment
  - US-031: Admin - Add Equipment Type
  - US-032: Admin - Add Maintenance Log Entry
  - US-044: Handle Image Upload Errors

### Reservations
- **[Reservation Creation Stories](./stories/reservations_creation.md)** - Booking Flow, Availability, Confirmations
  - US-009: Select Multiple Items for Reservation
  - US-010: Create Reservation - Date Selection
  - US-011: Create Reservation - Availability Check
  - US-012: Create Reservation - Confirmation Screen
  - US-013: Create Reservation - Finalization
  - US-042: Handle Invalid Date Range
  - US-045: View Reservation Email Notification
  - US-046: Handle Reservation Conflict
  - US-050: Handle Concurrent Reservation Attempts

- **[Reservation Management Stories](./stories/reservations_management.md)** - List, Details, Modify, Cancel
  - US-014: View Reservation List
  - US-015: View Reservation Details
  - US-016: Modify Reservation Dates
  - US-017: Cancel Reservation
  - US-020: View Rental History
  - US-020A: View Reservation Change History (Audit Trail)
  - US-047: Handle Date Modification Warning

### Calendar Views
- **[Calendar Stories](./stories/calendar.md)** - General and Item-Specific Availability
  - US-018: View Calendar - All Reservations
  - US-019: View Calendar - Item Specific

### Admin Features
- **[Admin Reservation Stories](./stories/admin_reservations.md)** - Dashboard, Filters, Status Changes, Bulk Operations
  - US-021: Admin - View Dashboard Summary
  - US-022: Admin - Filter Reservations
  - US-023: Admin - View All Reservations
  - US-024: Admin - View User Reservations
  - US-025: Admin - Change Reservation Status
  - US-026: Admin - Create Reservation for User
  - US-027: Admin - View Overdue Items
  - US-028: Admin - Bulk Status Changes
  - US-048: Handle Bulk Operation Errors

- **[Analytics Stories](./stories/analytics.md)** - Dashboard, Item Statistics
  - US-033: Admin - View Analytics Dashboard
  - US-034: Admin - View Item Analytics

### Super Admin Features
- **[Super Admin Stories](./stories/super_admin.md)** - User Management
  - US-035: SuperAdmin - Create User Account
  - US-036: SuperAdmin - View All Users
  - US-037: SuperAdmin - Edit User Profile

### General UX
- **[General UX Stories](./stories/general_ux.md)** - Mobile, Pagination, Error Handling
  - US-051: View Paginated Results
  - US-052: Handle Network Errors
  - US-053: View Mobile-Optimized Interface

## Navigation

- [← Back to Documentation](../README.md)
- [Product Overview →](./overview.md)
