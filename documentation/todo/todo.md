## Deployment
- credits hitory failure
- sidebar
3. test sharding for CI/CD
4. deploy on server

## Next
- integration tests for reservation flow reservation-integration-tests-plan.
- e2e tests for admin reservation flow
- md ( verify that e2e tests for admin case is needed. Is user case covering all the cases?)
- e2e tests for equipment manager
- e2e tests for superAdmin - user management
- Remove service role key usage -remove-service-role-key.md

## Equipment Views refactor
- Equipment manager + viewer component reuse improved
- Both share FilterSidebar (horizontal for manager, vertical for browse)
- Admin sees dates filter hidden in browse view
- Equipment details sheet: readOnly prop for users, editable for admins

## Code Quality
- cleanup
- API simplification
- documentation
- review with obselete
- refactoring needed

## Future Work
- credits request feature
- users credits history view for admin
- equipment pictures
- favorite items
- calendar view
- notifications
- events - reservation events
- links back and forth between reservation and equipment, look for others
- add maintenance logs when returning equipment. All users should be able to add maintenance logs.
- use mockery for testing
- Overdue reservations status and logic

## Refactoring Needed
1. Credit recalculation on date modification in Update
2. Token expiration handling - valid on frontend but not backend
3. maintenance double log - in case of failure just create a report file with context
4. remove RENTED status and rename ongoing to ACTIVE, 12. Remove approved status
5. in create user initial credits balance have leading zero that cant be removed
6. Warning messages for reservations that have the overlapping dates e.g start date is the same as end date of another reservation. They are allowed
7. simplify reservation flow, one modal for confirmation instead of two
8. New user creation should be admin-only (disable auto-creation)

9. Notification service - centralized for sending notifications
10. Bulk refund mechanism for BulkUpdate admin cancellations
11. Reservation details navigation - show dates/item name instead of ID
12. Highlight my reservations - fix status-based highlighting
13. Top bar credits invisible on mobile view
14. Return dialog should show current reservation dates prefilled
15. One test ID (reservation-success-message) will need to be added when you implement success state handling (currently redirects with ?success=true)