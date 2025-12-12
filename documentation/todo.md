
frontend plans
    users
    reservations
    equipments -details etc
    
frontend implementation

e2e testy
implementacja pozostalych endpointow
dokumentacja

deploy - konteneryzacja 

backend left to do from api-plan:
    credit request
    mainteneace logs


refactor 
1. nowy uzytkonwik nie moze sie tworzyc automatycznie. Wylaczycz tworzenie, tylko admin moze dodawac
2. translate ui to english
3. notification service a centralized service for sending notifications to users
4. Implement credit recalculation logic in 
Update
 when dates are modified.
5. Implement a bulk refund mechanism (or iterative service calls) for 
BulkUpdate
 to ensure admin cancellations process refunds correctly.
6. reservation status update. user should be able to change status of his own reservation when renting and returning equipment
7. mechanism for finding and handling tokens expiration. It is valid on frontend but not on backend. I am permanetnly logged in on browser
8. no alert when adding to cart