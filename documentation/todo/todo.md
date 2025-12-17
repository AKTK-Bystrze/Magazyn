continue status design
fix linter and astro conflicts
fix sidebar always on top
missing rented button
remove service role key usage
wrong credits calculation
the start date can be in past if it is original date, can be moved to future
return all button
===

design status changes

statuses:
- PENDING (when created)
- RETURNED
- DENIED

transitions:
 - pending -> returned
 - pending -> denied

user can change reservation dates only when pending
when reservation status is returned or denied it cannot be changed


reservation flow -
    - user can cancel their own reservation
    - user can return their own reservation
    - admin can return any reservation
    - admin can cancel any reservation
    - reservation history shows all changes. It shows date of change and who made it
    - A reservation tile has button for cancell, button for modyfication, button for next status change
    - reservation can be cancelled only when pending

    

equipments - admin view
    - add equipment
    - update equipment
    - delete equipment
    - equipment details

user 
    - superAdmin can change users history by adding or retracting in place of changing balance

credits
    - request credits
    - credit history

documentation

deploy - containerization 
e2e tests

backend left to do from api-plan:
    credit request
    mainteneace logs/analytics


refactor 
1. nowy uzytkonwik nie moze sie tworzyc automatycznie. Wylaczycz tworzenie, tylko admin moze dodawac
2. translate ui to english
3. notification service a centralized service for sending notifications to users
4. Implement credit recalculation logic in Update when dates are modified.
5. Implement a bulk refund mechanism (or iterative service calls) for 
BulkUpdate
 to ensure admin cancellations process refunds correctly.
7. mechanism for finding and handling tokens expiration. It is valid on frontend but not on backend. I am permanetnly logged in on browser