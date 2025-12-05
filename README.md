# Equipment Rental System (Magazyn)

> A modern, mobile-first web application for managing equipment rentals and member credits for a kayaking club.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Astro](https://img.shields.io/badge/Astro-5.16-orange.svg)](https://astro.build/)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://reactjs.org/)

## 📋 Table of Contents

- [About](#about)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## 📖 About

The Equipment Rental System replaces an inconvenient Google Form-based rental process with a modern, mobile-accessible web application. The system enables club members to:

- 🚣 Rent kayaking equipment using a credit system called "godzinki"
- 📅 View real-time equipment availability with calendar views
- 💳 Manage credit balance and request credits for club work
- 📱 Access the system from any mobile or desktop device
- 📊 Track rental and credit history

**For Administrators:**

- 🛠️ Manage equipment inventory and maintenance
- ✅ Process and approve reservations
- 👥 Manage user accounts and credit allocations
- 📈 View analytics and reports

**Key Features:**

- Passwordless email-based authentication via Supabase
- Automated credit deduction and refund system
- Multi-item reservation support
- Real-time availability checking
- Comprehensive audit trail for all changes
- Mobile-optimized responsive design

## 🛠 Tech Stack

### Frontend

- **[Astro 5](https://astro.build/)** - SSR-configured static site generator
- **[React 19](https://reactjs.org/)** - Interactive UI components (Calendar, Cart, Checkout)
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe development
- **[TanStack Query](https://tanstack.com/query)** - API response caching and state management

### Backend

- **[Go (Golang)](https://golang.org/)** - Stateless business logic and REST API
- **Gmail SMTP** - Transactional email notifications

### Infrastructure & Data

- **[Supabase Cloud](https://supabase.com/)** - Managed backend services (Free Tier)
  - **PostgreSQL** - Database with Row Level Security (RLS)
  - **Supabase Auth** - Passwordless magic link authentication
  - **Supabase Storage** - Equipment image storage (1GB limit)

### Deployment

- **DigitalOcean VPS** - Application hosting
- **Docker Compose** - Container orchestration
  - Container 1: Go API (port 8080)
  - Container 2: Astro SSR (port 3000)
  - Container 3: Caddy reverse proxy (HTTPS/443)

### Architecture

This project follows a **Hybrid "Light" Architecture**, maximizing performance by hosting application logic on a VPS while offloading state management to Supabase Cloud:

- **Caddy** acts as reverse proxy with automatic HTTPS (Let's Encrypt)
- Routes `/api/*` → Go Backend
- Routes `/*` → Astro Frontend
- Frontend directly accesses Supabase for auth and admin uploads
- Backend verifies Supabase JWTs and handles business logic

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version specified in project (check `package.json`)
- **Go**: Latest stable version
- **Docker & Docker Compose**: For deployment
- **Supabase Account**: Free tier account

### Local Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Magazyn
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory with:

   ```env
   # Supabase Configuration
   PUBLIC_SUPABASE_URL=your_supabase_url
   PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Go Backend Configuration
   GO_API_URL=http://localhost:8080

   # Gmail SMTP (for notifications)
   GMAIL_SMTP_USER=your_email@gmail.com
   GMAIL_SMTP_PASSWORD=your_app_password
   ```

4. **Start local Supabase**

   Start the local Supabase services (database, auth, storage) using Docker:

   ```bash
   npx supabase start
   ```

   Copy the API URL and Anon Key from the output to your `.env` file.

5. **Start development server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

6. **Start Go backend** (in separate terminal)

   ```bash
   cd backend
   go run main.go
   ```

   The API will be available at `http://localhost:8080`

### Production Deployment

1. **Build the application**

   ```bash
   npm run build
   ```

2. **Deploy using Docker Compose**

   ```bash
   docker-compose up -d
   ```

3. **Configure Caddy**
   - Update Caddyfile with your domain
   - Caddy will automatically provision SSL certificates via Let's Encrypt

## 📜 Available Scripts

| Script            | Description                                 |
| ----------------- | ------------------------------------------- |
| `npm run dev`     | Start Astro development server on port 3000 |
| `npm start`       | Alias for `npm run dev`                     |
| `npm run build`   | Build production-ready application          |
| `npm run preview` | Preview production build locally            |
| `npm run astro`   | Run Astro CLI commands                      |
| `npm run prepare` | Set up Husky git hooks (runs automatically) |

### Git Hooks

This project uses **Husky** and **lint-staged** for pre-commit code formatting:

- Automatically formats `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, and `.md` files
- Uses Prettier for consistent code style
- Runs on every commit

## 🎯 Project Scope

### MVP Features (In Scope)

**User Management**

- ✅ Admin-created user accounts (no self-registration)
- ✅ Three user roles: User, Admin, SuperAdmin
- ✅ Passwordless email authentication via Supabase

**Credit System**

- ✅ Per-day credit rates (Kayak: 4, Paddle: 2, Other: 1 credit/day)
- ✅ Automatic credit deduction on reservation creation
- ✅ Credit refunds on reservation denial/cancellation
- ✅ Credit request workflow with SuperAdmin approval
- ✅ Complete credit change history with audit trail

**Equipment Management**

- ✅ Multi-filter search (type, name, description, availability)
- ✅ Equipment status tracking (ok/broken)
- ✅ Image uploads (2MB limit, JPEG/PNG)
- ✅ Maintenance logs with status history
- ✅ Favorites algorithm (top 3 per type based on rental history)

**Reservation System**

- ✅ Multi-item reservation as single transaction
- ✅ Flexible date selection (start/end dates)
- ✅ Real-time availability checking
- ✅ User self-service date modification (PENDING only)
- ✅ User cancellation capability (PENDING only)
- ✅ Admin bulk operations
- ✅ Complete audit trail for all reservation changes

**Calendar & Visualization**

- ✅ 30-day calendar view (current + 29 days)
- ✅ Two modes: All reservations & Item-specific
- ✅ Color-coded availability indicators
- ✅ Clickable dates for quick search

**Admin Dashboard**

- ✅ Summary view (pending, overdue, today's rentals)
- ✅ Quick filters (PENDING, Today, Overdue, All)
- ✅ Overdue items panel with user contact info
- ✅ Create reservations on behalf of users
- ✅ Bulk status changes with preview

**Analytics & Reporting**

- ✅ Year/month filtering
- ✅ Individual item statistics
- ✅ Most rented items tracking
- ✅ User activity analytics

**Notifications**

- ✅ Email confirmation on reservation creation
- ✅ Single email per session listing all items
- ✅ Rate-limited admin notifications

### Out of Scope (Not in MVP)

- ❌ Backend service logic changes (uses existing Go backend)
- ❌ Database schema modifications (uses existing schema)
- ❌ Native mobile applications (web-only)
- ❌ User self-registration
- ❌ User profile self-editing
- ❌ Advanced analytics with data visualizations/exports
- ❌ Multi-language support
- ❌ WCAG accessibility compliance
- ❌ Performance optimization beyond basic functionality
- ❌ Data migration tools from Google Forms
- ❌ "Remember me" persistent login
- ❌ Social features (reviews, ratings)
- ❌ AI-powered equipment recommendations

### Technical Constraints

- Must work with existing Go backend API without modifications
- Must work with existing PostgreSQL database schema
- Must use Supabase passwordless authentication
- Must integrate with existing email notification system
- Frontend-only implementation scope

### Browser Support

- **Chrome only** (primary target for MVP)

## 📊 Project Status

**Current Status:** 🟡 In Development (MVP Phase)

### Completed

- ✅ Product Requirements Document (PRD)
- ✅ Technology stack definition
- ✅ Database schema design
- ✅ Initial database migration
- ✅ Reservation audit table design
- ✅ Development environment setup

### In Progress

- 🔄 Frontend implementation (Astro + React)
- 🔄 Supabase integration (Auth, Storage, Database)
- 🔄 Go backend API development

### Upcoming

- ⏳ User authentication flow
- ⏳ Equipment browsing and search
- ⏳ Reservation creation workflow
- ⏳ Admin dashboard
- ⏳ Credit management system
- ⏳ Analytics and reporting
- ⏳ Email notifications
- ⏳ Production deployment

### Known Limitations

- **Supabase Free Tier**: 1-week pause after inactivity is acceptable for low-traffic club usage
- **Database**: 500MB storage limit
- **Storage**: 1GB file storage limit
- **Authentication**: 50,000 MAU limit
- **Uploads**: Restricted to Admin users only

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Documentation:**

- [Product Requirements Document](documentation/prd.md)
- [Technology Stack & Architecture](documentation/techstack.md)
- [Database Schema Plan](documentation/db-plan.md)

**Contact:** For questions or support, please contact the project administrator.
