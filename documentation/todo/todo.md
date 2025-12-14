
resolve astro check
reservation can be cancelled only if it is in PENDING state

reservation flow -
    - user can cancel their own reservation
    - user can change status of their own reservation
    - admin can change status of any reservation
    - admin can cancel any reservation
    - reservation history shows all changes. It shows date of change and who made it

    

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