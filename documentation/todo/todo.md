## In Progress

  - in code test documentation, test scenario description is missing

  - Optimize fixture setup/teardown
  - e2e tests clean up, duplicated logs, hardcoded values etc
  - Test Data Management
  - Document test data strategy

## Next
  - e2e tests for admin reservation flow
  - integration tests for reservation flow reservation-integration-tests-plan.md ( verify that integrtaion tests for admin case is needed. Is user case covering all the cases?)
  - e2e tests for equipment manager

## Deployment
- containerization
- deployment
  - Consider test sharding for CI/CD
- unit tests

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
- favorite items
- calendar view
- notifications
- events - reservation events
- links back and forth between reservation and equipment, look for others
- add maintenance logs when returning equipment. All users should be able to add maintenance logs.
- use mockery for testing

## Refactoring Needed
0. simplify reservation flow, one modal for confirmation instead of two
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
14. maintenance double log
15. in create user initial credits balance have leading zero that cant be removed
16. remove RENTED status and rename ongoing to ACTIVE
17. Overdue reservations status and logic
18. Warning messages for reservations that have the overlapping dates e.g start date is the same as end date of another reservation
19.  One test ID (reservation-success-message) will need to be added when you implement success state handling (currently redirects with ?success=true)
20. rename envs from VITE to public