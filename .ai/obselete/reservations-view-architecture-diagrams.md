# Reservations View - Architecture Diagram

## Component Hierarchy

```mermaid
graph TD
    A[Astro Pages] --> B[/reservations/index.astro]
    A --> C[/admin/reservations/index.astro]
    
    B --> D[ReservationListContainer mode=user]
    C --> E[ReservationListContainer mode=admin]
    
    D --> F[QueryProvider]
    E --> F
    
    F --> G[ReservationListContainerInner]
    
    G --> H[Success/Error Alerts]
    G --> I[ReservationFilters]
    G --> J[ReservationCardList]
    G --> K[CancelReservationDialog]
    
    I --> L[Status Filter Select]
    I --> M[Sort Select]
    I --> N[Reset Button]
    
    J --> O{Has Groups?}
    O -->|Yes| P[GroupedReservationCard]
    O -->|No| Q[ReservationCard]
    
    P --> R[Group Header - Collapsed]
    P --> S[Group Content - Expanded]
    S --> Q
    
    Q --> T[Equipment Info]
    Q --> U[Date Range]
    Q --> V[Status Badge]
    Q --> W[Action Buttons]
    
    J --> X[Pagination]
    
    style B fill:#e1f5ff
    style C fill:#ffe1e1
    style D fill:#e1f5ff
    style E fill:#ffe1e1
    style G fill:#fff4e1
    style P fill:#e8f5e9
    style Q fill:#f3e5f5
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Page as Astro Page
    participant Container as ReservationListContainer
    participant Hook as useReservations
    participant API as reservations-api
    participant Backend as Go Backend
    participant DB as Supabase

    User->>Page: Navigate to /reservations
    Page->>Page: Check auth & role
    Page->>Container: Render with mode
    Container->>Hook: Initialize with filters
    Hook->>API: fetchReservations(filters)
    API->>Backend: GET /reservations
    Backend->>Backend: Extract JWT from context
    Backend->>DB: Query with RLS (auth.uid())
    DB-->>Backend: Return user's reservations
    Backend-->>API: JSON response
    API->>API: Transform snake_case → camelCase
    API-->>Hook: ReservationListResponse
    Hook-->>Container: data, isLoading, error
    Container->>Container: Group by date
    Container-->>User: Display reservations
    
    User->>Container: Click "Cancel"
    Container->>Hook: cancelReservation(id)
    Hook->>API: cancelReservation(id)
    API->>Backend: PATCH /reservations/:id
    Backend->>DB: Update status to DENIED
    DB-->>Backend: Success
    Backend-->>API: Updated reservation
    API-->>Hook: Success
    Hook->>Hook: Invalidate cache
    Hook->>API: Refetch list
    API-->>Hook: Updated list
    Hook-->>Container: Fresh data
    Container-->>User: Success toast + updated UI
```

## State Management

```mermaid
graph LR
    A[URL Search Params] -->|Source of Truth| B[React State]
    B --> C[useReservations Hook]
    C --> D[React Query Cache]
    
    E[User Action] --> F[setFilter]
    F --> B
    F --> A
    
    G[API Mutation] --> H[Optimistic Update]
    H --> D
    G --> I[Invalidate Cache]
    I --> D
    
    D --> J[UI Components]
    
    style A fill:#e1f5ff
    style D fill:#fff4e1
    style J fill:#f3e5f5
```

## File Structure

```
frontend/src/
│
├── pages/
│   ├── reservations/
│   │   └── index.astro                 # User entry point
│   └── admin/
│       └── reservations/
│           └── index.astro             # Admin entry point
│
├── components/
│   ├── reservations/
│   │   ├── ReservationListContainer.tsx    # Smart container
│   │   ├── ReservationCardList.tsx         # Presentation layer
│   │   ├── ReservationCard.tsx             # Individual card
│   │   ├── GroupedReservationCard.tsx      # Grouped card
│   │   ├── ReservationFilters.tsx          # Filter controls
│   │   ├── CancelReservationDialog.tsx     # Cancel dialog
│   │   └── StatusBadge.tsx                 # Status indicator
│   │
│   └── ui/
│       └── pagination.tsx                   # Reusable pagination
│
├── hooks/
│   └── useReservations.ts                   # React Query hook
│
├── lib/
│   ├── api/
│   │   └── reservations-api.ts              # API client
│   │
│   ├── transformers/
│   │   └── reservation.transformer.ts       # Data transformers
│   │
│   ├── utils/
│   │   ├── group-reservations.ts            # Grouping logic
│   │   ├── date-utils.ts                    # Date formatting
│   │   └── text-utils.ts                    # Text helpers
│   │
│   └── config/
│       ├── constants.ts                     # All constants
│       └── routes.ts                        # Route definitions
│
└── types/
    └── reservations/
        └── reservation.types.ts             # Type definitions
```

## Backend Architecture

```
backend/
│
├── internal/
│   ├── repository/
│   │   └── supabase/
│   │       ├── auth_utils.go               # JWT forwarding utility
│   │       └── reservation_repository.go   # Data access with RLS
│   │
│   ├── service/
│   │   └── reservation_service.go          # Business logic
│   │
│   └── handler/
│       └── reservation_handler.go          # HTTP handlers
│
└── RLS Flow:
    1. HTTP Request → Handler
    2. Handler → Extract JWT from header
    3. Handler → Add JWT to context
    4. Service → Pass context to repository
    5. Repository → getClientWithAuth(ctx)
    6. Repository → Query Supabase with JWT
    7. Supabase → Apply RLS policies
    8. Supabase → Return filtered data
```

## User Workflows

### User View Workflow

```mermaid
flowchart TD
    Start([User navigates to /reservations]) --> Auth{Authenticated?}
    Auth -->|No| Login[Redirect to login]
    Auth -->|Yes| Load[Load reservations]
    
    Load --> Display[Display list]
    Display --> Action{User action?}
    
    Action -->|Filter| Filter[Update filters]
    Filter --> Load
    
    Action -->|Cancel| ConfirmDialog[Show confirmation]
    ConfirmDialog --> Confirm{Confirm?}
    Confirm -->|Yes| CancelAPI[Call cancel API]
    CancelAPI --> Success[Show success toast]
    Success --> Load
    Confirm -->|No| Display
    
    Action -->|View Details| Details[Navigate to /reservations/:id]
    
    Action -->|Modify| Coming[Show 'coming soon']
    Coming --> Display
    
    Action -->|Page| Paginate[Change page]
    Paginate --> Load
    
    style Start fill:#e1f5ff
    style Success fill:#e8f5e9
    style Login fill:#ffe1e1
```

### Admin View Workflow

```mermaid
flowchart TD
    Start([Admin navigates to /admin/reservations]) --> Auth{Authenticated?}
    Auth -->|No| Login[Redirect to login]
    Auth -->|Yes| Role{Admin role?}
    Role -->|No| Dashboard[Redirect to dashboard]
    Role -->|Yes| Load[Load ALL reservations]
    
    Load --> Display[Display list]
    Display --> Action{Admin action?}
    
    Action -->|Filter| Filter[Update filters]
    Filter --> Load
    
    Action -->|View Details| Details[Navigate to /reservations/:id]
    
    Action -->|Bulk Action| Coming[Show 'coming soon']
    Coming --> Display
    
    Action -->|Page| Paginate[Change page]
    Paginate --> Load
    
    style Start fill:#ffe1e1
    style Load fill:#fff4e1
    style Dashboard fill:#ffebee
```

## Security Model

```mermaid
graph TD
    A[Frontend Request] --> B{Has JWT?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D[Include in Authorization header]
    
    D --> E[Backend Handler]
    E --> F[Extract JWT]
    F --> G[Add to Context]
    
    G --> H[Repository Layer]
    H --> I[getClientWithAuth]
    I --> J[Create Supabase Client with JWT]
    
    J --> K[Supabase RLS]
    K --> L{User View?}
    L -->|Yes| M[Filter: user_id = auth.uid]
    L -->|No| N{Admin?}
    N -->|Yes| O[Return all data]
    N -->|No| P[403 Forbidden]
    
    M --> Q[Return filtered data]
    O --> Q
    
    style C fill:#ffebee
    style P fill:#ffebee
    style Q fill:#e8f5e9
```

## Performance Optimizations

```mermaid
graph LR
    A[User Action] --> B{In Cache?}
    B -->|Yes| C[Instant Display]
    B -->|No| D[Fetch from API]
    
    D --> E[Store in Cache]
    E --> C
    
    F[Mutation] --> G[Optimistic Update]
    G --> H[Update UI Immediately]
    
    F --> I{Success?}
    I -->|Yes| J[Invalidate Cache]
    I -->|No| K[Rollback UI]
    
    J --> L[Background Refetch]
    L --> E
    
    style C fill:#e8f5e9
    style H fill:#e8f5e9
    style K fill:#ffebee
```

## Component Reusability

```mermaid
graph TD
    A[Reservations View] --> B[StatusBadge]
    A --> C[Pagination]
    A --> D[ReservationCard]
    
    E[Future: Equipment View] -.->|Can reuse| B
    E -.->|Can reuse| C
    
    F[Future: Users View] -.->|Can reuse| B
    F -.->|Can reuse| C
    
    G[Future: Maintenance View] -.->|Can reuse| B
    G -.->|Can reuse| C
    
    H[Future: Orders View] -.->|Pattern| D
    
    style A fill:#e1f5ff
    style E fill:#fff4e1
    style F fill:#fff4e1
    style G fill:#fff4e1
    style H fill:#fff4e1
```

## Legend

- **Blue** - User-facing components
- **Red** - Admin-facing components
- **Yellow** - Shared/Core components
- **Green** - Success states
- **Pink** - Error states
- **Purple** - Data components
- **Dashed lines** - Future/potential usage
