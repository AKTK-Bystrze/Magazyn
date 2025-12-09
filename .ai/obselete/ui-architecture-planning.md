<conversation_summary>
<decisions>
1. **Core Navigation**: Adopt a Responsive Top Navigation Bar. Desktop shows full menu; Mobile uses a hamburger menu.
2. **Localization**: Set default locale to Polish (`pl-PL`). Use "Godzinki" for currency nomenclature.
3. **Theming**: Implement System/Light/Dark mode switching.
4. **Data Freshness**: Use "Fetch on mount/focus" strategy for Admin Dashboard counters (no WebSockets).
5. **Form UX**: Use Modals (Dialogs) for management tasks (Create/Edit) to preserve context.
6. **Notifications**: Use Toast notifications (`sonner`) for success/error feedback.
7. **Loading States**: Use Skeleton loaders instead of generic spinners.
8. **Pagination**: Use Standard Numbered Pagination (Next/Prev + Page Numbers).
9. **Routing**: Implement "Smart Redirects" based on user role (Guest -> Login, User -> Reservations, Admin -> Dashboard).
10. **Error Handling**: Use React Error Boundaries to isolate component crashes.
11. **App Structure**: Adopt a Feature-based directory structure (`src/features/{featureName}`).
12. **Form Library**: Use React Hook Form with Zod schema validation.
13. **Date Handling**: Use `date-fns` for date manipulation.
14. **Icons**: Use `lucide-react`.
15. **Complex Flows**: Handle multi-step processes (like Reservation Wizard) via client-side state within a single route.
16. **Styling**: Enforce Tailwind CSS utility classes and `class-variance-authority` (cva).
17. **Testing**: Use Vitest with React Testing Library.
18. **Quality Gates**: Configure Husky and lint-staged for pre-commit checks.
</decisions>
<matched_recommendations>
1. **Layout**: Use Top Navigation Bar to maximize horizontal space for data tables.
2. **State Management**: Use `TanStack Query` for server state and `Nano Stores` for lightweight client state (User Credits).
3. **Component Library**: Leverage `Shadcn/UI` + `Tailwind CSS` for a premium, consistent look.
4. **Mobile UX**: Adapt complex views like Calendars to be "Dot Indicator + List" on mobile rather than full grids.
5. **Auth Integration**: Rely on Supabase Client handling for magic links and sessions, with UI-level Route Guards.
6. **Image Uploads**: Implement Direct-to-Supabase Storage uploads from the frontend before form submission.
7. **Tech Stack Specifics**: Use `Sonner` for toasts, `Lucide` for icons, and `Ky` (or similar typed fetch) for API communication.
</matched_recommendations>
<ui_architecture_planning_summary>
### Main UI Architecture Requirements
The frontend will be built using **Astro 5** (SSR mode) + **React 19** components, consuming a **Go Backend API**. The design focuses on a "premium" aesthetic suitable for a modern club application, utilizing **Shadcn/UI** and **Tailwind CSS**.

### Key Views & User Flows
1.  **Authentication**: Passwordless "Magic Link" flow handled via Supabase.
2.  **Navigation**: Role-based redirection from root. Top-bar navigation adapts to mobile.
3.  **Equipment Discovery**: Searchable grid view with "Add to Cart" functionality.
4.  **Reservation Wizard**: A multi-step, client-side flow (Select -> Date -> Confirm) to create reservations.
5.  **Admin Dashboard**: Data-heavy views (Start/Return rentals) presented in tables with fast "Modal" editing workflows.

### API Integration & State Strategy
-   **Server Data**: Cached via `TanStack Query`. Data is assumed "fresh enough" via standard stale-time invalidation; no real-time sockets required for MVP.
-   **Global Client State**: `Nano Stores` manages the always-visible "Credit Balance" in the navbar, avoiding prop drilling.
-   **Persisted State**: "Reservation Cart" stored in `sessionStorage` to prevent data loss during navigation.
-   **API Client**: A strongly-typed wrapper will mirror Go structs to TypeScript interfaces manually (until OpenAPI generation is available).

### Responsiveness, Accessibility & Security
-   **Responsiveness**: Mobile-first approach. Complex components like Calendars and Data Tables have specific mobile alternative views defined.
-   **Accessibility**: Shadcn/UI primitives ensure baseline accessibility (ARIA compliance).
-   **Security**:
    -   **Route Protection**: `ProtectedRoute` HOC for page access.
    -   **Role Guards**: Component-level visibility controls (e.g., hiding "Edit" buttons from non-admins).
    -   **Sanitization**: Zod schemas validate all inputs before submission.

</ui_architecture_planning_summary>
<unresolved_issues>
No critical unresolved issues remain for the UI Architecture foundation. All key architectural decisions (Layout, State, Auth, tooling) have been approved. Immediate next steps involve execution of the implementation plan.
</unresolved_issues>
</conversation_summary>
