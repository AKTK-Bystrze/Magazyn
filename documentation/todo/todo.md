## In progress:
documentation
production database
deploy script (push migrations, build and start latest containers, run sanity test)


## Equipment Views refactor
- Equipment manager + viewer component reuse improved
- Both share FilterSidebar (horizontal for manager, vertical for browse)
- Admin sees dates filter hidden in browse view
- Equipment details sheet: readOnly prop for users, editable for admins

## Code Quality
- review logical flow of the backend tests
- cleanup
- API simplification
- documentation
- review with obselete
- refactoring needed
- frontend testing

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
0. SMTP service setup
1. Credit recalculation on date modification in Update
2. Token expiration handling - valid on frontend but not backend
3. maintenance loging - in case of failure just create a report file with context
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
17. admin is missing dates filter in the equipment browse view
18. currently one reservations can be made on the same day.
19. cant change credits for your own or cant change credtis for firts user in the table