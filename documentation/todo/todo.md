## In progress
- credit history view needed

## Equipment Views
- Equipment manager + viewer component reuse improved
- Both share FilterSidebar (horizontal for manager, vertical for browse)
- Admin sees dates filter hidden in browse view
- Equipment details sheet: readOnly prop for users, editable for admins

## Code Quality
- logout and login improvements
- cleanup
- API simplification
- documentation
- review with obselete
- refactoring needed

## Deployment
- containerization
- deployment
- e2e tests

## Future Work
- credits request feature
- favorite items
- calendar view
- notifications
- events - reservation events
- links back and forth between reservation and equipment, look for others
- add maintenance logs when returning equipment. All users should be able to add maintenance logs.

## Refactoring Needed
1. New user creation should be admin-only (disable auto-creation)
2. Translate UI to English
3. Notification service - centralized for sending notifications
4. Credit recalculation on date modification in Update
5. Bulk refund mechanism for BulkUpdate admin cancellations
6. Token expiration handling - valid on frontend but not backend
7. Link-sent login - just refresh page to login
8. Reservation details navigation - show dates/item name instead of ID
9. Highlight my reservations - fix status-based highlighting
10. Remove service role key usage
11. Top bar credits invisible on mobile view
12. Remove approved status
13. Return dialog should show current reservation dates prefilled