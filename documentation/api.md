# API Documentation

## Overview

This document provides a tree-view structure of the Application Programming Interface (API) for the Rental Application. It bridges the [Backend Logic](../backend) with the [Frontend/UI](../frontend).

### Architecture Summary

- **Backend**: Go (stateless business logic), exposes REST endpoints.
- **Frontend**: Astro + React, consumes APIs via TanStack Query.
- **Database**: Supabase PostgreSQL (managed).
- **Authentication**: Supabase Auth (Magic Links), verified by Go Backend via JWT.

## API Endpoint Tree

The following tree illustrates the available REST endpoints exposed by the Go Backend (`/api/v1`).

```text
/api/v1
├── /auth
│   ├── POST /login                 # Initiate magic link login
│   ├── POST /logout                # End session
│   └── GET  /session               # Get current user session info
│
├── /users
│   ├── GET  /me                    # Get current user profile
│   ├── GET  /                      # List all users (Admin)
│   ├── POST /                      # Create user (SuperAdmin)
│   └── /:id
│       ├── GET                     # Get specific user (Admin)
│       └── PATCH                   # Update user (SuperAdmin)
│
├── /equipment-types
│   ├── GET  /                      # List all equipment types
│   └── POST /                      # Create equipment type (Admin)
│
├── /equipment
│   ├── GET  /                      # Search & list equipment
│   ├── POST /                      # Add value equipment (Admin)
│   └── /:id
│       ├── GET                     # Get equipment details
│       ├── PATCH                   # Update equipment (Admin)
│       ├── DELETE                  # Archive equipment (Admin)
│       ├── GET /availability       # Check availability for dates
│       └── GET /maintenance-logs   # Get maintenance history
│           └── POST                # Add maintenance log (Admin)
│
├── /reservations
│   ├── GET  /                      # List reservations (User: own, Admin: all)
│   ├── POST /                      # Create reservation(s)
│   ├── PATCH /bulk                 # Bulk status update (Admin)
│   ├── GET   /dashboard            # Admin dashboard summary
│   └── /:id
│       ├── GET                     # Get reservation details
│       └── PATCH                   # Update reservation (dates/status)
│
├── /credits
│   ├── GET  /history               # Get transaction history
│   └── /requests
│       ├── GET                     # List requests
│       ├── POST                    # Submit request
│       └── /:id
│           └── PATCH               # Approve/Deny request (SuperAdmin)
│
└── /analytics (Admin)
    ├── GET /equipment-stats        # Equipment usage stats
    ├── GET /user-stats             # User activity stats
    └── GET /calendar/availability  # Full availability calendar
```

## Frontend Integration

The Frontend connects to these endpoints using `TanStack Query` for state management and caching.

- **Authentication**: Using `SupabaseClient` for the initial login flow (`POST /auth/login` equivalent logic handled partly by Supabase SDK, but backend sessions synced via API).
- **Data Fetching**: Hooks in `src/lib/api/` correspond to the branches of the tree above (e.g., `useEquipment`, `useReservations`).
- **Realtime**: While the API provides REST endpoints, the Frontend also subscribes to Supabase Realtime channels for live updates on `reservations` and `equipment` availability.
