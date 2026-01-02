## high priority
- default db test users passwords are reused in remote test db. By checking the code there is of unauthorized access to the remote db 
- when running docker compose locally it overwrites the production file with test file. There is a risk of pushing it. Change it to resolve this issue. Running locally shouldn't overwrite production file.
- Unit tests, run coverage and find places needing more tests, integration and e2e tests. This is needed before any further work which will mainly be about refactoring.
- deploy process. Create a github action to deploy the app. push migrations, build and start latest containers, run sanity test, rollback in case of failure, email admins about the deploy process result

## Code Quality
- review logical flow of the backend tests
- cleanup dead code, magic numbers, constants, oneline comments apply @good-practise rule. Remove dead files
- API simplification. Analyze backend API and remove unused endpoints, parameters, etc. create a suggestion of API changes, improvements
- documentation. In readme create a list of content of existing documenation md files in the repo they are spread currently in /frontend /backend /documentation. Update links in the documents, remove duplication. Move all docs into docuemntation and create a logical structure
- remove magazyn v1

## Future Work
- metrics, components resources limitation, recovery system. All of it is missing
- credits request feature. Create new feature, find prd stories
- users credits history view for admin. Allow superAdmins see all users credits history. 
- equipment pictures. feature to upload and remove images of equipment by admins. 
- favorite items. feature to mark items as favorite by users. Show favorite items in the equipment browse view. Show recently used items in the equipment browse view. See prd for details
- calendar view. See prd for details
- notifications. Create notification system for users. Service will be reused to notifiy users with different channels (email, in-app, etc) about system events, reservations, etc. Notification service should be an abstract layer for sending notifications.
- implement notification system. Notify users about their reservations and credtis changes. Notify admins about new reservations
- events - reservation events feature. Allow grouping reservations by event tags like "splyw kursowy" etc. Allow users to quickly create reservation for an event. Admins and users should be able create events. Event should have a name, description, tags, start date, end date, etc. Admin should be able to filter reservations by event tag. Event is a reflection of "co będzie pływane" from the form.
- links back and forth between reservation and equipment, look for others. Whenever the equipment name or reservation name etc is displayed somwhere then is should always be link which leads to the reservation or equipment details view.
- add maintenance logs when returning equipment. All users should be able to add maintenance logs.
- use mockery for testing - tests improvement
- Overdue reservations status and logic. Admin should be able to fitler quickly reservation which are overdue. User should be automatically notified about the overdue reservation.


## Refactoring
0. SMTP service setup - part of the notification system. 
1. Credit recalculation on date modification in Update - VERIFY
2. Token expiration handling - valid on frontend but not backend - VERIFY
3. The error watcher is needed for the maintenance logs. In case of failure, exception etc a report file should be created with context. 
4. Remove unsused reservation statuses
5. in create user view. initial credits balance have leading zero that cant be removed
6. Warning messages for reservations that have the overlapping dates e.g start date is the same as end date of another reservation. such dates are allowed and users should be aware of such risks that the same equipment is used on the same day. It should be also checked when reservation is chanignng dates.
7. simplify reservation flow, one modal for confirmation instead of two
8. New user creation should be admin-only (disable auto-creation)
9. When navigating through the reservation the path "reservations > reservation " has invalid links that redirect to 404 page. 

10. Bulk refund mechanism for BulkUpdate admin cancellations. All admin operations perfomed for multiple users or reservation at once can have improved performence. Optimize of operations quantity.
11. Reservation details navigation - When reservation details are displayed then show dates and item name in the navigation bar instead of hash id of reservation.
12. Highlight my reservations - fix status-based highlighting. 
13. Top bar credits invisible on mobile view
14. Return dialog should show current reservation dates prefilled

19. cant change credits for your own or cant change credtis for firts user in the list of users. Error of "not attached form"
20. duplicated email in profiles and auth tables. Verify if both columns are needed in two different tables.
21. exceptions during e2e tests run, review them. They make noise. IDK if they are valid.
22. image updad (thorugh backend!, check frontend for incorrect implementation)

