# Detailed Architecture

This diagram shows the complete technical architecture including all layers, patterns, and data flows.

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser["Browser"]
    end
    
    subgraph Frontend["Frontend Application (Astro 5 + React 19)"]
        subgraph AstroLayer["Astro SSR Layer"]
            Pages["Pages<br/>(Routes)"]
            Layouts["Layouts"]
            AstroMiddleware["Middleware<br/>• Auth Check<br/>• Session Mgmt<br/>• Route Protection"]
        end
        
        subgraph ReactLayer["React Layer"]
            Components["Components<br/>• Equipment Search<br/>• Reservation Cart<br/>• Calendar<br/>• Admin Tables"]
            Hooks["Custom Hooks<br/>• useEquipmentSearch<br/>• useDebounce"]
            Query["TanStack Query<br/>Server State Cache"]
        end
        
        subgraph FrontendAPI["API Proxy Layer (/pages/api/*)"]
            APIProxies["API Proxies<br/>• /api/equipment<br/>• /api/reservations<br/>• /api/auth"]
        end
        
        subgraph FrontendUtils["Utilities"]
            Transformers["Transformers<br/>snake_case ↔ camelCase"]
            Validators["Validators<br/>Zod Schemas"]
            SupabaseClient["Supabase Client<br/>(Auth Only)"]
        end
    end
    
    subgraph Backend["Backend Application (Go)"]
        subgraph Middleware["Middleware Layer"]
            JWTMiddleware["JWT Verification"]
            RBACMiddleware["RBAC<br/>Role-Based Access"]
            CORSMiddleware["CORS"]
        end
        
        subgraph HandlerLayer["Handler Layer"]
            AuthHandler["Auth Handler<br/>• Login<br/>• Logout<br/>• Session"]
            EquipmentHandler["Equipment Handler<br/>• List<br/>• Details<br/>• CRUD<br/>• Image Upload"]
            ReservationHandler["Reservation Handler<br/>• Create<br/>• Update<br/>• List"]
            UserHandler["User Handler<br/>• Profile<br/>• List<br/>• Update"]
            CreditHandler["Credit Handler<br/>• History<br/>• Requests"]
        end
        
        subgraph ServiceLayer["Service Layer (Business Logic)"]
            AuthService["Auth Service"]
            EquipmentService["Equipment Service<br/>• Availability Check<br/>• Favorites Sorting<br/>• Image Upload"]
            ReservationService["Reservation Service<br/>• Credit Validation<br/>• Conflict Check<br/>• Email Notifications"]
            UserService["User Service"]
            CreditService["Credit Service<br/>• Transaction Log<br/>• Balance Update"]
        end
        
        subgraph RepositoryLayer["Repository Layer"]
            AuthRepo["Auth Repository"]
            EquipmentRepo["Equipment Repository"]
            ReservationRepo["Reservation Repository"]
            UserRepo["User Repository"]
            CreditRepo["Credit Repository"]
        end
        
        SupabaseGoClient["Supabase Go Client<br/>(PostgreSQL Adapter)"]
        EmailService["Email Service<br/>Gmail SMTP<br/>(Reservations Only)"]
    end
    
    subgraph Database["Supabase PostgreSQL"]
        subgraph CoreTables["Core Tables"]
            Profiles["profiles<br/>• User data<br/>• Credit balance<br/>• Role"]
            EquipmentTypes["equipment_types<br/>• Categories<br/>• Pricing"]
            Equipment["equipment<br/>• Items<br/>• Status<br/>• Internal ID"]
            Reservations["reservations<br/>• Bookings<br/>• Date ranges<br/>• Status"]
        end
        
        subgraph CreditTables["Credit System"]
            CreditHistory["credit_history<br/>• Immutable ledger<br/>• Transactions"]
            CreditRequests["credit_requests<br/>• User requests<br/>• Admin approval"]
        end
        
        subgraph AuditTables["Audit Trail"]
            ReservationHistory["reservation_history<br/>• Change log<br/>• Status changes"]
            MaintenanceLogs["maintenance_logs<br/>• Equipment status<br/>• Repair notes"]
        end
        
        subgraph DBLogic["Database Logic"]
            Triggers["Triggers<br/>• log_reservation_change<br/>• log_maintenance_change<br/>• update_updated_at"]
            StoredProcs["Stored Procedures (RPC)<br/>• create_reservation_atomic<br/>• refund_reservation_credits"]
            RLS["RLS Policies<br/>• User sees own data<br/>• Admin sees all"]
        end
    end
    
    subgraph External["External Services"]
        SupabaseAuth["Supabase Auth<br/>• Magic Links<br/>• JWT Tokens"]
        SupabaseStorage["Supabase Storage<br/>• Equipment Images"]
        Gmail["Gmail SMTP<br/>(Reservations Only)"]
    end
    
    Browser -->|"HTTPS"| Pages
    Pages --> AstroMiddleware
    AstroMiddleware --> Layouts
    Layouts --> Components
    Components --> Hooks
    Hooks --> Query
    Query --> APIProxies
    APIProxies --> Transformers
    Transformers --> JWTMiddleware
    
    JWTMiddleware --> RBACMiddleware
    RBACMiddleware --> CORSMiddleware
    
    CORSMiddleware --> AuthHandler
    CORSMiddleware --> EquipmentHandler
    CORSMiddleware --> ReservationHandler
    CORSMiddleware --> UserHandler
    CORSMiddleware --> CreditHandler
    
    AuthHandler --> AuthService
    EquipmentHandler --> EquipmentService
    ReservationHandler --> ReservationService
    UserHandler --> UserService
    CreditHandler --> CreditService
    
    AuthService --> AuthRepo
    EquipmentService --> EquipmentRepo
    EquipmentService --> SupabaseStorage
    ReservationService --> ReservationRepo
    ReservationService --> CreditService
    UserService --> UserRepo
    CreditService --> CreditRepo
    
    AuthRepo --> SupabaseGoClient
    EquipmentRepo --> SupabaseGoClient
    ReservationRepo --> SupabaseGoClient
    UserRepo --> SupabaseGoClient
    CreditRepo --> SupabaseGoClient
    
    SupabaseGoClient --> Profiles
    SupabaseGoClient --> EquipmentTypes
    SupabaseGoClient --> Equipment
    SupabaseGoClient --> Reservations
    SupabaseGoClient --> CreditHistory
    SupabaseGoClient --> CreditRequests
    SupabaseGoClient --> ReservationHistory
    SupabaseGoClient --> MaintenanceLogs
    
    Reservations --> Triggers
    Equipment --> Triggers
    ReservationService -.->|"Call RPC"| StoredProcs
    
    Profiles -.-> RLS
    Equipment -.-> RLS
    Reservations -.-> RLS
    
    SupabaseClient -.->|"Login/Session"| SupabaseAuth
    AuthService -.-> SupabaseAuth
    EmailService --> Gmail
    ReservationService --> EmailService
    
    classDef clientStyle fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    classDef frontendStyle fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
    classDef backendStyle fill:#fff9c4,stroke:#f57c00,stroke-width:2px
    classDef dbStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef externalStyle fill:#ffccbc,stroke:#d84315,stroke-width:2px
    
    class Browser clientStyle
    class Pages,Layouts,AstroMiddleware,Components,Hooks,Query,APIProxies,Transformers,Validators,SupabaseClient frontendStyle
    class JWTMiddleware,RBACMiddleware,CORSMiddleware,AuthHandler,EquipmentHandler,ReservationHandler,UserHandler,CreditHandler backendStyle
    class AuthService,EquipmentService,ReservationService,UserService,CreditService backendStyle
    class AuthRepo,EquipmentRepo,ReservationRepo,UserRepo,CreditRepo,SupabaseGoClient,EmailService backendStyle
    class Profiles,EquipmentTypes,Equipment,Reservations,CreditHistory,CreditRequests dbStyle
    class ReservationHistory,MaintenanceLogs,Triggers,StoredProcs,RLS dbStyle
    class SupabaseAuth,SupabaseStorage,Gmail externalStyle
```

## Architecture Layers

### Frontend Layer

#### Astro SSR Layer
- **Pages**: File-based routing (`/equipment`, `/reservations`, etc.)
- **Layouts**: Reusable page templates
- **Middleware**: Pre-request processing
  - Validates Supabase session
  - Protects routes based on authentication
  - Injects user data into `Astro.locals`

#### React Layer
- **Components**: Interactive UI elements (client:load, client:visible)
- **Custom Hooks**: Reusable stateful logic
- **TanStack Query**: 
  - Caches API responses
  - Handles loading/error states
  - Automatic background refetching

#### API Proxy Layer
- **Purpose**: Never call backend directly from React components
- **Benefits**:
  - Injects auth headers from server-side context
  - Abstracts backend URL
  - Handles CORS properly

#### Utilities
- **Transformers**: Convert between backend snake_case and frontend camelCase
- **Validators**: Zod schemas for runtime type safety
- **Supabase Client**: Direct calls for authentication only (login, session management)

---

### Backend Layer

#### Middleware
- **JWT Verification**: Validates Supabase JWT tokens
- **RBAC**: Enforces role-based permissions (user/admin/super_admin)
- **CORS**: Manages cross-origin requests

#### Handler Layer (HTTP)
- Parses requests
- Validates input
- Calls service layer
- Returns HTTP responses with proper status codes

#### Service Layer (Business Logic)
- **Equipment Service**:
  - Availability checking
  - Favorites sorting (top 3 per type per user)
  - Image uploads to Supabase Storage (admin only)
- **Reservation Service**:
  - Multi-item reservation creation
  - Credit validation
  - Conflict detection
  - Calls stored procedures for atomic operations
  - Sends email notifications via Gmail SMTP
- **Credit Service**:
  - Transaction logging
  - Balance updates with audit trail

#### Repository Layer (Data Access)
- Abstracts database operations
- Returns domain models (not raw SQL results)
- Implements interfaces for testability

---

### Database Layer

#### Core Tables
- **profiles**: User accounts linked to `auth.users`
- **equipment_types**: Categories with standard pricing
- **equipment**: Physical inventory items
- **reservations**: Date-based bookings with exclusion constraints

#### Credit System
- **credit_history**: Immutable transaction log
- **credit_requests**: User-submitted work credit requests

#### Audit Trail
- **reservation_history**: Tracks all reservation changes
- **maintenance_logs**: Tracks equipment status changes

#### Database Logic
- **Triggers**:
  - Auto-log reservation changes
  - Auto-log equipment status changes
  - Auto-update `updated_at` timestamps
- **Stored Procedures (RPC)**:
  - `create_reservation_atomic`: Multi-step transaction (check availability, deduct credits, create reservation)
  - `refund_reservation_credits`: Atomic refund on cancellation
- **RLS Policies**: Row-level security ensures users only see their data

---

## Design Patterns

### 1. Repository Pattern
**Problem**: Coupling business logic to database implementation  
**Solution**: Repository interfaces abstract data access

### 2. Proxy Pattern
**Problem**: Frontend needs to call backend with authentication  
**Solution**: API proxy endpoints inject server-side auth tokens

### 3. Transformer Pattern
**Problem**: Backend sends snake_case, frontend needs camelCase  
**Solution**: Bidirectional transformers with Zod validation

### 4. Dependency Injection
**Problem**: Hard to test tightly coupled code  
**Solution**: Constructor injection of dependencies

### 5. Middleware Pattern
**Problem**: Cross-cutting concerns (auth, logging) duplicated  
**Solution**: Middleware pipeline for request processing

---

## Request Flow Example: Create Reservation

1. **User Action**: User clicks "Confirm Reservation" in React component
2. **TanStack Query**: Triggers mutation to API proxy
3. **API Proxy** (`/api/reservations`): 
   - Injects `Authorization: Bearer <token>` from session
   - Forwards to backend
4. **Backend Middleware**: Validates JWT, extracts user ID
5. **Handler**: Parses request body, validates input
6. **Service**: 
   - Checks user credit balance
   - Validates equipment availability
   - Calls `create_reservation_atomic` stored procedure
7. **Stored Procedure**: 
   - Checks for conflicts (exclusion constraint)
   - Deducts credits
   - Creates reservation
   - Logs to `credit_history`
   - Returns transaction result
8. **Service**: Sends reservation confirmation email via Gmail SMTP
9. **Response**: Flows back through layers
10. **Frontend**: TanStack Query invalidates cache, updates UI

---

## Authentication Flow

**Note**: All authentication is handled by Supabase. Gmail SMTP is NOT used for authentication emails.

1. **Login Request**: User enters email → Frontend calls `/api/auth/login`
2. **Magic Link**: Supabase Auth sends magic link email (NOT Gmail SMTP)
3. **Click Link**: User clicks link → Supabase validates → creates session
4. **Set Cookie**: Supabase sets session cookie (httpOnly)
5. **Middleware**: On each request, middleware validates session
6. **API Calls**: Frontend proxies include `Authorization: Bearer <token>` from session
7. **Backend**: Verifies JWT signature against Supabase public key

---

## Image Upload Flow (Admin Only)

1. **User Action**: Admin uploads image in equipment form
2. **Frontend**: Sends image file to `/api/equipment/:id/image` API proxy
3. **Backend Handler**: Validates admin role via RBAC middleware
4. **Equipment Service**: 
   - Validates image format and size
   - Uploads to Supabase Storage bucket
   - Updates equipment record with image path
5. **Response**: Returns public URL for the uploaded image

---

## Key Features

### Atomic Transactions
PostgreSQL stored procedures ensure ACID guarantees for critical operations:
- Reservation creation with credit deduction
- Credit refunds on cancellation

### Favorites System
Equipment Service calculates user's top 3 most-rented items per type and sorts them first in search results.

### Audit Trail
All changes to reservations and equipment are logged automatically via database triggers.

### Type Safety
- Backend: Go's type system
- Frontend: TypeScript strict mode
- API boundary: Zod schemas validate and transform data
