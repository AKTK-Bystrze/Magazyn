reservation flow - user can see all reservations
continue "Reservation view Design change" -> update api and stories after creating plan

reservation flow -
    - user can cancel reservation
    - user can change status
    - admin can change status
    - admin can cancel reservation
    - reservation history

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