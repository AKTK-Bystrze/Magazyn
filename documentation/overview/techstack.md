# Magazyn: Technology Stack & Architecture

## Overview

This document outlines the architecture for a public-facing Rental Application.

**Key Decisions:**

- **Traffic:** Low volume; the 1-week Supabase "pause" on free tier is an acceptable risk.
- **Proxy:** Caddy will be used as a lightweight alternative to Nginx for automatic HTTPS.
- **Uploads:** Restricted to Admin users only.

### 1. Frontend (Astro + React)

**Core Framework:**

- **Astro 5:** Configured for SSR (output: 'server') to handle SEO and dynamic content.
- **React 19:** Interactive components (Cart, Calendar, Checkout).
- **TypeScript 5:** Shared types between Frontend and Backend.

**State & API:**

- **TanStack Query:** Caches API responses from the Go Backend.
- **Authentication & Proxying:** Server-side HttpOnly encrypted session cookie (`magazyn_sid`) with Astro SSR BFF API proxies forwarding authenticated requests to the Go backend.

### 2. Backend Layer (Go)

- **Language:** Go (Golang).
- **Role:** Stateless Business Logic.
- **API:** Exposes REST endpoints (e.g., `POST /reservations`, `GET /equipment/{id}/availability`, `GET /calendar/availability`).
- **Email:** Uses Noop Email Service (mock implementation) for transactional emails (Reservation Confirmations).
- **Auth Middleware:** Verifies Supabase JWTs. The Go backend trusts the token issued by Supabase Cloud to identify the user.

### 3. Infrastructure & Data (Supabase Cloud)

Instead of self-hosting complex services, we connect to the managed Supabase Cloud.

**Database (PostgreSQL):**

- **Host:** Supabase Cloud.
- **Limits (Free Tier):** 500MB Database size.
- **Security:** Protected by Row Level Security (RLS) policies.

**Authentication (Supabase Auth):**

- **Method:** Magic Links / Passwordless (Replaces local Go passwordless package).
- **Integration:** Frontend handles login; Backend verifies the session token.
- **Limits:** 50,000 MAU.

**Storage (Supabase Storage):**

- **Usage:** Storing Equipment images in the `equipment` bucket.
- **Policies:**
  - **Read:** Publicly accessible.
  - **Write:** Restricted to Admin users only via RLS.
- **Limits:** 1GB Storage.

### 4. Deployment (VPS)

**Container Strategy (Docker Compose):**

- **Container 1 (Go API):** Runs the compiled Go Binary.
- **Container 2 (Astro):** Runs the Node.js adapter for Astro.
- **Container 3 (Caddy):**
  - Acts as the entry point (Reverse Proxy).
  - Handles Automatic HTTPS (Let's Encrypt / TLS certificates).
  - Routes `/*` → Astro Container (which internally proxies `/api/*` to the Go Container).

### 5. External Services

- **Email:** Email Service (Noop mock implementation for transactional notifications).

## Architecture Diagram

The following diagram illustrates the "Hybrid Light" approach. The heavy stateful services live in the cloud, while your VPS runs the lightweight compute containers.

```mermaid
flowchart TD
    subgraph VPS ["VPS / DigitalOcean"]
        Caddy("Caddy Reverse Proxy")
        AstroApp("Astro Frontend (SSR)")
        GoApp("Go Backend API")
    end

    subgraph Supabase_Cloud ["Supabase Cloud Managed Services"]
        DB["Database (PostgreSQL)"]
        Auth["Authentication"]
        Storage["Storage"]
    end

    Browser(("User Browser"))
    Email["Email Service (Noop)"]

    Browser -->|HTTPS / 443| Caddy
    Caddy -->|/*| AstroApp
    AstroApp -->|Proxied /api/* (Bearer JWT)| GoApp

    GoApp -->|SQL Queries| DB
    GoApp -->|Verify JWT| Auth
    GoApp -->|Send Email| Email
    AstroApp -.->|Validate/Refresh Tokens| Auth

    classDef cloud fill:#3ECF8E,stroke:#333,stroke-width:2px,color:white;
    classDef vps fill:#22b357,stroke:#333,stroke-width:2px,color:white;
    classDef backend fill:#00ADD8,stroke:#333,stroke-width:2px,color:white;

    class DB,Auth,Storage cloud
    class Caddy,GoApp,AstroApp backend
```
